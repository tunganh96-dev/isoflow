import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { normalizeDocumentMarkdown } from './markdown'

type ExportDocument = {
  doc_code: string
  title: string
  content: string
  version: number
  approved_at?: string | null
  updated_at?: string | null
  flowchart_image_path?: string | null
  flowchart_image_mime?: string | null
}

type ExportOptions = {
  flowchartImage?: {
    buffer: Buffer
    mime: string
  } | null
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'image'; alt: string; src: string }
  | { type: 'table'; rows: string[][] }

const PAGE_SIZE: [number, number] = [595.28, 841.89]
const PDF_MARGIN = 42
const PDF_BOTTOM = 42

const DISTRIBUTION_ROWS = [
  ['☐  VP Hà Nội', '☐  NM Quế Võ', '☐  NM Long An', '☐  NM Thường Tín'],
  ['☐  Ban TGĐ', '☐  GĐ Nhà máy', '☐  GĐ Nhà máy', '☐  GĐ Nhà máy'],
  ['☐  GĐ Vận hành', '☐  P. QA&ISO (Bản gốc)', '☐  BP. QA', '☐  BP. QA'],
  ['☐  GĐ Kinh doanh', '☐  P. Kế hoạch', '☐  BP. Kế hoạch', '☐  BP. Kế hoạch'],
  ['☐  P. KD bán lẻ', '☐  Xưởng sản xuất', '☐  Xưởng sản xuất', '☐  Xưởng sản xuất'],
  ['☐  P. HCNS', '☐  BP. HCNS', '☐  BP. HCNS', '☐  BP. HCNS'],
  ['☐  P. TC kế toán', '☐  BP. Kế toán', '☐  BP. Kế toán', '☐  BP. Kế toán'],
  ['☐  P. Marketing', '☐  BP. Cơ điện', '☐  BP. Cơ điện', '☐  BP. Cơ điện'],
  ['☐  Kho vận', '☐  Kho vận', '☐  Kho vận', '☐  Kho vận'],
  ['☐  P. Mua hàng', '☐  BP. Kỹ thuật', '☐  BP. Kỹ thuật', '☐  BP. Kỹ thuật'],
]

export function exportFileName(doc: ExportDocument, extension: string) {
  const safe = `${doc.doc_code} - ${doc.title}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return `${safe || doc.doc_code}.${extension}`
}

export function buildWordHtml(doc: ExportDocument, options: ExportOptions = {}) {
  const content = contentWithFlowchart(doc.content, options.flowchartImage ? flowchartDataUri(options.flowchartImage) : null)
  const blocks = parseMarkdown(content)
  const body = blocks.map(blockToHtml).join('\n')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 1.4cm 1.2cm; }
    body { font-family: "Times New Roman", serif; font-size: 11pt; color: #111; }
    table { border-collapse: collapse; width: 100%; }
    .iso-header td { border: 1px solid #111; padding: 6px 8px; vertical-align: middle; }
    .logo { width: 24%; text-align: center; }
    .logo img { max-width: 96%; max-height: 30pt; object-fit: contain; }
    .doc-title { width: 52%; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 15pt; line-height: 1.15; }
    .meta { width: 24%; font-size: 8.5pt; line-height: 1.2; }
    .meta div { margin: 1px 0; }
    .cover-title { text-align: center; font-weight: bold; font-size: 14pt; margin: 0; }
    .cover-table td, .cover-table th { border: 1px solid #111; padding: 6px 8px; vertical-align: middle; }
    .cover-table th { text-align: center; font-weight: bold; background: #f2f2f2; }
    .distribution td { height: 25pt; }
    .signoff td { text-align: center; }
    .signature-space td { height: 58pt; }
    .change-table td, .change-table th { font-size: 10pt; }
    .page-break { page-break-after: always; }
    h1, h2 { font-size: 13pt; margin: 14pt 0 7pt; text-transform: uppercase; }
    h3 { font-size: 12pt; margin: 12pt 0 6pt; }
    p { margin: 6pt 0; line-height: 1.35; }
    .bullet { margin: 4pt 0 4pt 18pt; text-indent: -10pt; }
    .content-table td, .content-table th { border: 1px solid #111; padding: 5px 6px; vertical-align: top; }
    .content-table th { font-weight: bold; background: #f2f2f2; }
    .process-flowchart { display: block; max-width: 100%; max-height: 22cm; margin: 8pt auto 12pt; object-fit: contain; page-break-inside: avoid; }
  </style>
</head>
<body>
  ${firstPageHtml(doc)}
  <div class="page-break"></div>
  ${headerHtml(doc)}
  ${body}
  <div class="page-break"></div>
  ${changeTrackingHtml(doc)}
</body>
</html>`
}

export async function buildPdf(doc: ExportDocument, options: ExportOptions = {}) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(readPdfFont('Times New Roman.ttf'), { subset: true })
  const boldFont = await pdf.embedFont(readPdfFont('Times New Roman Bold.ttf'), { subset: true })
  const logoImage = await pdf.embedJpg(readLogoImage())
  const content = contentWithFlowchart(doc.content, options.flowchartImage ? flowchartDataUri(options.flowchartImage) : null)
  const blocks = parseMarkdown(content)

  drawFirstPdfPage(pdf.addPage(PAGE_SIZE), doc, font, boldFont, logoImage)

  let page = pdf.addPage(PAGE_SIZE)
  let y = drawPdfHeader(page, doc, font, boldFont, logoImage, PDF_MARGIN, PAGE_SIZE[1] - PDF_MARGIN)

  function newContentPage() {
    page = pdf.addPage(PAGE_SIZE)
    y = drawPdfHeader(page, doc, font, boldFont, logoImage, PDF_MARGIN, PAGE_SIZE[1] - PDF_MARGIN)
    return y
  }

  function ensure(height: number) {
    if (y - height < PDF_BOTTOM) {
      y = newContentPage()
    }
    return y
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      const size = block.level <= 2 ? 13 : 11
      const lines = wrapText(block.text.toUpperCase(), font, size, PAGE_SIZE[0] - PDF_MARGIN * 2)
      y = ensure(lines.length * (size + 4) + 10)
      y -= 10
      for (const line of lines) {
        page.drawText(line, { x: PDF_MARGIN, y, size, font: boldFont, color: rgb(0.07, 0.09, 0.14) })
        y -= size + 4
      }
      continue
    }

    if (block.type === 'table') {
      y = drawPdfTable({
        getPage: () => page,
        rows: block.rows,
        font,
        boldFont,
        margin: PDF_MARGIN,
        startY: y,
        width: PAGE_SIZE[0] - PDF_MARGIN * 2,
        newPage: newContentPage,
      })
      continue
    }

    if (block.type === 'image') {
      const image = await embedPdfImage(pdf, block.src)
      if (!image) continue
      const maxWidth = PAGE_SIZE[0] - PDF_MARGIN * 2
      const maxHeight = PAGE_SIZE[1] - PDF_MARGIN * 2 - 90
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
      const imageW = image.width * scale
      const imageH = image.height * scale
      y = ensure(imageH + 16)
      y -= 8
      page.drawImage(image, {
        x: PDF_MARGIN + (maxWidth - imageW) / 2,
        y: y - imageH,
        width: imageW,
        height: imageH,
      })
      y -= imageH + 10
      continue
    }

    const prefix = block.type === 'bullet' ? '- ' : ''
    const size = 10
    const x = block.type === 'bullet' ? PDF_MARGIN + 14 : PDF_MARGIN
    const maxWidth = PAGE_SIZE[0] - PDF_MARGIN * 2 - (block.type === 'bullet' ? 14 : 0)
    const lines = wrapText(`${prefix}${block.text}`, font, size, maxWidth)
    y = ensure(lines.length * 14 + 4)
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color: rgb(0.12, 0.14, 0.18) })
      y -= 14
    }
    y -= 3
  }

  const changePage = pdf.addPage(PAGE_SIZE)
  let changeY = drawPdfHeader(changePage, doc, font, boldFont, logoImage, PDF_MARGIN, PAGE_SIZE[1] - PDF_MARGIN)
  drawChangeTrackingPdf(changePage, doc, font, boldFont, changeY)

  return Buffer.from(await pdf.save())
}

function contentWithFlowchart(content: string, flowchartDataUri: string | null) {
  if (!flowchartDataUri) return content
  const flowchartBlock = `### 6.1 Lưu đồ\n\n![Lưu đồ quy trình](${flowchartDataUri})`
  if (content.includes('![Lưu đồ quy trình](')) return content

  const section6 = content.match(/^(##\s+6\.\s+.+)$/m)
  if (!section6 || section6.index === undefined) return `${content}\n\n${flowchartBlock}`

  const insertAt = section6.index + section6[0].length
  return `${content.slice(0, insertAt)}\n\n${flowchartBlock}\n\n${content.slice(insertAt).trimStart()}`
}

function flowchartDataUri(image: NonNullable<ExportOptions['flowchartImage']>) {
  return `data:${image.mime};base64,${image.buffer.toString('base64')}`
}

function firstPageHtml(doc: ExportDocument) {
  return `${headerHtml(doc)}

  <p>&nbsp;</p>
  <table class="cover-table distribution">
    <tr><th colspan="4"><p class="cover-title">PHÂN PHỐI TÀI LIỆU</p></th></tr>
    ${DISTRIBUTION_ROWS.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
  </table>

  <p>&nbsp;</p>
  <table class="cover-table signoff">
    <tr><th>Soạn thảo</th><th>Kiểm tra</th><th>Phê duyệt</th></tr>
    <tr><td><b>Phạm Thị Mát</b></td><td><b>Phạm Văn Cường</b></td><td><b>Hoàng Tùng Anh</b></td></tr>
    <tr><td><b>Nhân viên ISO</b></td><td><b>Giám đốc Nhà máy</b></td><td><b>Phó Tổng Giám đốc</b></td></tr>
    <tr class="signature-space"><td></td><td></td><td></td></tr>
    <tr><td>${formatDate(doc.approved_at ?? doc.updated_at)}</td><td>${formatDate(doc.approved_at ?? doc.updated_at)}</td><td>${formatDate(doc.approved_at ?? doc.updated_at)}</td></tr>
  </table>`
}

function changeTrackingHtml(doc: ExportDocument) {
  return `${headerHtml(doc)}
  <p>&nbsp;</p>
  <table class="cover-table change-table">
    <tr><th colspan="4">THEO DÕI NỘI DUNG SỬA ĐỔI TÀI LIỆU</th></tr>
    <tr><th>Lần ban hành</th><th>Ngày ban hành</th><th>Nội dung sửa đổi</th><th>Người phê duyệt</th></tr>
    <tr><td>01</td><td>${formatDate(doc.approved_at ?? doc.updated_at)}</td><td>Ban hành lần đầu</td><td></td></tr>
  </table>`
}

function headerHtml(doc: ExportDocument) {
  return `<table class="iso-header">
    <tr>
      <td class="logo">${logoHtml()}</td>
      <td class="doc-title">${escapeHtml(doc.title)}</td>
      <td class="meta">
        <div><b>Mã hiệu:</b> ${escapeHtml(doc.doc_code)}</div>
        <div><b>Lần ban hành:</b> ${String(doc.version).padStart(2, '0')}</div>
        <div><b>Hiệu lực:</b> ${formatDate(doc.approved_at ?? doc.updated_at)}</div>
      </td>
    </tr>
  </table>`
}

function logoHtml() {
  return `<img src="${logoDataUri()}" alt="Thuan Phat" />`
}

function logoDataUri() {
  return `data:image/jpeg;base64,${readLogoImage().toString('base64')}`
}

function readLogoImage() {
  return fs.readFileSync(path.join(process.cwd(), 'public/tpco-logo.jpg'))
}

function readPdfFont(fileName: string) {
  const candidates = [
    path.join('/System/Library/Fonts/Supplemental', fileName),
    path.join(process.cwd(), 'app/fonts', fileName),
  ]
  const filePath = candidates.find(candidate => fs.existsSync(candidate))
  if (!filePath) {
    throw new Error(`Missing PDF font: ${fileName}`)
  }
  return fs.readFileSync(filePath)
}

function drawFirstPdfPage(page: PDFPage, doc: ExportDocument, font: PDFFont, boldFont: PDFFont, logoImage: PDFImage) {
  let y = PAGE_SIZE[1] - PDF_MARGIN
  y = drawPdfHeader(page, doc, font, boldFont, logoImage, PDF_MARGIN, y)
  y = drawTitleTable(page, 'PHÂN PHỐI TÀI LIỆU', PDF_MARGIN, y, PAGE_SIZE[0] - PDF_MARGIN * 2, boldFont)
  y = drawStaticPdfTable(page, DISTRIBUTION_ROWS, {
    x: PDF_MARGIN,
    y,
    width: PAGE_SIZE[0] - PDF_MARGIN * 2,
    rowHeight: 27,
    font,
    boldFont,
    fontSize: 8.5,
  }) - 18

  y = drawStaticPdfTable(page, [
    ['Soạn thảo', 'Kiểm tra', 'Phê duyệt'],
    ['Phạm Thị Mát', 'Phạm Văn Cường', 'Hoàng Tùng Anh'],
    ['Nhân viên ISO', 'Giám đốc Nhà máy', 'Phó Tổng Giám đốc'],
    ['', '', ''],
    [formatDate(doc.approved_at ?? doc.updated_at), formatDate(doc.approved_at ?? doc.updated_at), formatDate(doc.approved_at ?? doc.updated_at)],
  ], {
    x: PDF_MARGIN,
    y,
    width: PAGE_SIZE[0] - PDF_MARGIN * 2,
    rowHeight: 26,
    rowHeights: [26, 27, 27, 72, 26],
    font,
    boldFont,
    fontSize: 9,
    headerRows: 1,
    centered: true,
  }) - 18
}

function drawChangeTrackingPdf(page: PDFPage, doc: ExportDocument, font: PDFFont, boldFont: PDFFont, y: number) {
  drawStaticPdfTable(page, [
    ['THEO DÕI NỘI DUNG SỬA ĐỔI TÀI LIỆU'],
    ['Lần ban hành', 'Ngày ban hành', 'Nội dung sửa đổi', 'Người phê duyệt'],
    ['01', formatDate(doc.approved_at ?? doc.updated_at), 'Ban hành lần đầu', ''],
  ], {
    x: PDF_MARGIN,
    y,
    width: PAGE_SIZE[0] - PDF_MARGIN * 2,
    rowHeight: 30,
    font,
    boldFont,
    fontSize: 9,
    titleRow: true,
    headerRows: 2,
  })
}

function drawPdfHeader(page: PDFPage, doc: ExportDocument, font: PDFFont, boldFont: PDFFont, logoImage: PDFImage, margin: number, top: number) {
  const width = page.getWidth() - margin * 2
  const logoW = width * 0.24
  const titleW = width * 0.52
  const h = 60
  const y = top - h

  drawRect(page, margin, y, width, h)
  drawLine(page, margin + logoW, y, margin + logoW, y + h)
  drawLine(page, margin + logoW + titleW, y, margin + logoW + titleW, y + h)
  drawLogo(page, logoImage, margin, y, logoW, h)
  drawCentered(page, doc.title.toUpperCase(), boldFont, 13, margin + logoW, y + 32, titleW)

  const metaX = margin + logoW + titleW + 6
  page.drawText(`Mã hiệu: ${doc.doc_code}`, { x: metaX, y: y + 39, size: 8, font })
  page.drawText(`Lần ban hành: ${String(doc.version).padStart(2, '0')}`, { x: metaX, y: y + 26, size: 8, font })
  page.drawText(`Hiệu lực: ${formatDate(doc.approved_at ?? doc.updated_at)}`, { x: metaX, y: y + 13, size: 8, font })

  return y - 24
}

function drawLogo(page: PDFPage, logoImage: PDFImage, x: number, y: number, width: number, height: number) {
  const scale = Math.min((width - 12) / logoImage.width, (height - 12) / logoImage.height)
  const imageW = logoImage.width * scale
  const imageH = logoImage.height * scale
  page.drawImage(logoImage, {
    x: x + (width - imageW) / 2,
    y: y + (height - imageH) / 2,
    width: imageW,
    height: imageH,
  })
}

function drawPdfTable({
  getPage,
  rows,
  font,
  boldFont,
  margin,
  startY,
  width,
  newPage,
}: {
  getPage: () => PDFPage
  rows: string[][]
  font: PDFFont
  boldFont: PDFFont
  margin: number
  startY: number
  width: number
  newPage: () => number
}) {
  if (!rows.length) return startY
  const cols = Math.max(...rows.map(row => row.length))
  const colWidths = getColumnWidths(rows, width)
  let y = startY - 8
  const fontSize = cols >= 5 ? 7 : 8
  const lineHeight = fontSize + 2

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const cellLines = Array.from({ length: cols }, (_, c) => wrapText(row[c] ?? '', font, fontSize, colWidths[c] - 8))
    const maxLinesPerPage = Math.max(1, Math.floor((PAGE_SIZE[1] - PDF_MARGIN - PDF_BOTTOM - 86) / lineHeight))
    const rowChunks = chunkTableRow(cellLines, maxLinesPerPage)

    for (const chunk of rowChunks) {
      const rowH = Math.max(22, ...chunk.map(lines => lines.length * lineHeight + 8))
      if (y - rowH < PDF_BOTTOM) {
        y = newPage() - 8
      }

      drawPdfTableRow({
        page: getPage(),
        rowIndex,
        cellLines: chunk,
        colWidths,
        x: margin,
        y: y - rowH,
        rowH,
        font,
        boldFont,
        fontSize,
        lineHeight,
      })

      y -= rowH
    }
  }
  return y - 10
}

function drawPdfTableRow({
  page,
  rowIndex,
  cellLines,
  colWidths,
  x,
  y,
  rowH,
  font,
  boldFont,
  fontSize,
  lineHeight,
}: {
  page: PDFPage
  rowIndex: number
  cellLines: string[][]
  colWidths: number[]
  x: number
  y: number
  rowH: number
  font: PDFFont
  boldFont: PDFFont
  fontSize: number
  lineHeight: number
}) {
  let currentX = x
  for (let c = 0; c < colWidths.length; c++) {
    const colW = colWidths[c]
    drawRect(page, currentX, y, colW, rowH)
    let textY = y + rowH - fontSize - 5
    for (const line of cellLines[c] ?? []) {
      page.drawText(line, {
        x: currentX + 4,
        y: textY,
        size: fontSize,
        font: rowIndex === 0 ? boldFont : font,
      })
      textY -= lineHeight
    }
    currentX += colW
  }
}

function chunkTableRow(cellLines: string[][], maxLines: number) {
  const chunks: string[][][] = []
  let offset = 0
  const longest = Math.max(...cellLines.map(lines => lines.length))
  while (offset < longest) {
    chunks.push(cellLines.map(lines => lines.slice(offset, offset + maxLines)))
    offset += maxLines
  }
  return chunks.length ? chunks : [cellLines]
}

function getColumnWidths(rows: string[][], tableWidth: number) {
  const cols = Math.max(...rows.map(row => row.length))
  if (cols <= 1) return [tableWidth]
  if (cols >= 5) return Array.from({ length: cols }, () => tableWidth / cols)

  const weights = Array.from({ length: cols }, (_, colIndex) => {
    const maxLength = Math.max(...rows.map(row => (row[colIndex] ?? '').length))
    return Math.min(2.4, Math.max(0.8, Math.sqrt(maxLength || 1)))
  })
  const total = weights.reduce((sum, value) => sum + value, 0)
  const minWidth = 52
  const widths = weights.map(weight => Math.max(minWidth, (tableWidth * weight) / total))
  const actual = widths.reduce((sum, value) => sum + value, 0)
  if (actual > tableWidth) {
    const scale = tableWidth / actual
    return widths.map(width => width * scale)
  }
  return widths
}

function drawTitleTable(page: PDFPage, title: string, x: number, top: number, width: number, boldFont: PDFFont) {
  const h = 30
  const y = top - h
  drawRect(page, x, y, width, h)
  drawCentered(page, title, boldFont, 12, x, y + 18, width)
  return y
}

function drawStaticPdfTable(
  page: PDFPage,
  rows: string[][],
  options: {
    x: number
    y: number
    width: number
    rowHeight: number
    rowHeights?: number[]
    font: PDFFont
    boldFont: PDFFont
    fontSize: number
    headerRows?: number
    titleRow?: boolean
    centered?: boolean
  },
) {
  let y = options.y
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const rowH = options.rowHeights?.[rowIndex] ?? options.rowHeight
    y -= rowH
    const cols = options.titleRow && rowIndex === 0 ? 1 : row.length
    const colW = options.width / cols
    for (let c = 0; c < cols; c++) {
      const x = options.x + c * colW
      drawRect(page, x, y, colW, rowH)
      const value = row[c] ?? row[0] ?? ''
      const isHeader = rowIndex < (options.headerRows ?? 0)
      const cellFont = isHeader ? options.boldFont : options.font
      const lines = wrapText(value, cellFont, options.fontSize, colW - 8)
      if (options.centered || isHeader || (options.titleRow && rowIndex === 0)) {
        const startY = y + rowH - (rowH - lines.length * (options.fontSize + 2)) / 2 - options.fontSize
        lines.forEach((line, index) => {
          const textW = cellFont.widthOfTextAtSize(line, options.fontSize)
          page.drawText(line, {
            x: x + Math.max(4, (colW - textW) / 2),
            y: startY - index * (options.fontSize + 2),
            size: options.fontSize,
            font: cellFont,
          })
        })
      } else {
        let textY = y + rowH - options.fontSize - 6
        lines.forEach(line => {
          page.drawText(line, { x: x + 5, y: textY, size: options.fontSize, font: cellFont })
          textY -= options.fontSize + 2
        })
      }
    }
  }
  return y
}

function parseMarkdown(content: string): Block[] {
  const lines = normalizeDocumentMarkdown(content).split(/\r?\n/)
  const blocks: Block[] = []
  let paragraph: string[] = []
  let table: string[][] = []

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() })
      paragraph = []
    }
  }
  function flushTable() {
    if (table.length) {
      blocks.push({ type: 'table', rows: table.filter(row => !row.every(cell => /^-+$/.test(cell))) })
      table = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushTable()
      continue
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph()
      table.push(trimmed.slice(1, -1).split('|').map(cell => cell.trim()))
      continue
    }
    flushTable()
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'heading', level: heading[1].length, text: stripMarkdown(heading[2]) })
      continue
    }
    const image = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
    if (image) {
      flushParagraph()
      blocks.push({ type: 'image', alt: stripMarkdown(image[1] ?? ''), src: image[2] ?? '' })
      continue
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      blocks.push({ type: 'bullet', text: stripMarkdown(bullet[1]) })
      continue
    }
    paragraph.push(stripMarkdown(trimmed))
  }
  flushParagraph()
  flushTable()
  return blocks
}

function blockToHtml(block: Block) {
  if (block.type === 'heading') {
    const level = Math.min(block.level, 3)
    return `<h${level}>${escapeHtml(block.text)}</h${level}>`
  }
  if (block.type === 'bullet') return `<p class="bullet">- ${escapeHtml(block.text)}</p>`
  if (block.type === 'image') return `<img class="process-flowchart" src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" />`
  if (block.type === 'table') {
    return `<table class="content-table">${block.rows.map((row, index) => `<tr>${row.map((_, cellIndex) => {
      const tag = index === 0 ? 'th' : 'td'
      return `<${tag}>${escapeHtml(row[cellIndex] ?? '')}</${tag}>`
    }).join('')}</tr>`).join('')}</table>`
  }
  return `<p>${escapeHtml(block.text)}</p>`
}

async function embedPdfImage(pdf: PDFDocument, src: string) {
  const parsed = parseDataUri(src)
  if (!parsed) return null
  if (parsed.mime === 'image/png') return pdf.embedPng(parsed.buffer)
  if (parsed.mime === 'image/jpeg' || parsed.mime === 'image/jpg') return pdf.embedJpg(parsed.buffer)
  return null
}

function parseDataUri(src: string) {
  const match = src.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  }
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function drawRect(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y, width, height, borderColor: rgb(0, 0, 0), borderWidth: 0.7 })
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.7, color: rgb(0, 0, 0) })
}

function drawCentered(page: PDFPage, text: string, font: PDFFont, size: number, x: number, y: number, width: number) {
  const lines = wrapText(text, font, size, width - 12)
  lines.slice(0, 2).forEach((line, index) => {
    const textW = font.widthOfTextAtSize(line, size)
    page.drawText(line, { x: x + (width - textW) / 2, y: y - index * (size + 2), size, font })
  })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : ''
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
