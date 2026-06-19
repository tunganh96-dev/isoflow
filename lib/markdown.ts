export function normalizeDocumentMarkdown(content: string) {
  let inTable = false

  return content
    .split(/\r?\n/)
    .map(line => normalizeMarkdownLine(line))
    .map(line => {
      const normalized = promoteNumberedSectionHeading(line, inTable)
      inTable = isTableLine(line)
      return normalized
    })
    .filter(line => !isStandaloneRule(line))
    .join('\n')
    .replace(/^(#{1,6}\s+)?(\d+(?:\.\d+)*\.?)\s*(?:\\?[*_]){1,6}\s*([^*\n_]+?)\s*(?:\\?[*_]){1,6}\s*$/gm, (_match, prefix = '', number, title) => `${prefix}${number} ${title.trim()}`)
    .replace(/^(#{1,6}\s+)?(\d+(?:\.\d+)*\.?)\s+(.+?)\s*(?:\\?[*_]){2,6}\s*$/gm, (_match, prefix = '', number, title) => `${prefix}${number} ${title.trim()}`)
    .replace(/^(#{1,6}\s+)?(\d+(?:\.\d+)*\.?)\s*(?:\\?[*_]){2,6}\s*/gm, '$1$2 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeMarkdownLine(line: string) {
  const trimmed = line.trim()
  const wordBulletLine = normalizeWordBulletLine(line, trimmed)
  if (wordBulletLine !== line) return wordBulletLine

  const compactBulletLine = normalizeCompactBulletLine(line, trimmed)
  if (compactBulletLine !== line) return compactBulletLine

  const definitionBulletLine = normalizeDefinitionBulletLine(line, trimmed)
  if (definitionBulletLine !== line) return definitionBulletLine

  const wordCheckboxLine = normalizeWordCheckboxLine(line, trimmed)
  if (wordCheckboxLine !== line) return wordCheckboxLine

  const stepLine = normalizeStepLine(line, trimmed)
  if (stepLine !== line) return stepLine

  const tableCaptionLine = normalizeTableCaptionLine(line, trimmed)
  if (tableCaptionLine !== line) return tableCaptionLine

  const dashedHeadingLine = normalizeDashedHeadingLine(line, trimmed)
  if (dashedHeadingLine !== line) return dashedHeadingLine

  const marker = String.raw`(?:\\?[*_]){1,3}`
  const unmarkedHeading = trimmed
    .replace(/\\?[*_]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^((?:#{1,6}\s*)?\d+(?:\.\d+)*)\.\s+(\d+)(?=\s+\S)/, '$1.$2.')
    .replace(/^((?:#{1,6}\s*)?\d+(?:\s*\.\s*\d+)*\s*\.?)(?=\S)/, '$1 ')
    .replace(/^((?:#{1,6}\s*)?\d+(?:\s*\.\s*\d+)*)(?:\s+\.)/, '$1.')
    .replace(/^((?:#{1,6}\s*)?)(\d+(?:\s*\.\s*\d+)*)\s*\.\s+/, (_match, prefix, number) => `${prefix}${compactSectionNumber(number)}. `)
    .trim()

  if (unmarkedHeading !== trimmed && looksLikeNumberedSectionHeading(unmarkedHeading)) {
    return line.replace(trimmed, unmarkedHeading)
  }

  const numberedHeadingWithMarkers = trimmed.match(new RegExp(`^(#{1,6}\\s*)?(\\d+(?:\\.\\d+)*\\.?)\\s*${marker}\\s*(.+?)\\s*${marker}?$`))
  if (numberedHeadingWithMarkers) {
    const headingPrefix = numberedHeadingWithMarkers[1] ?? ''
    return line.replace(trimmed, `${headingPrefix}${numberedHeadingWithMarkers[2]} ${numberedHeadingWithMarkers[3].trim()}`)
  }

  const markerAfterNumber = trimmed.replace(new RegExp(`^(#{1,6}\\s*)?(\\d+(?:\\.\\d+)*\\.?)\\s*${marker}\\s*`), '$1$2 ')
  if (markerAfterNumber !== trimmed) {
    return line.replace(trimmed, stripBrokenHeadingMarkers(markerAfterNumber))
  }

  const wrappedHeading = trimmed.match(/^(?:\*{1,3}|_{1,3})\s*(.+?)\s*(?:\*{1,3}|_{1,3})$/)
  if (wrappedHeading && looksLikeSectionHeading(wrappedHeading[1])) {
    return line.replace(trimmed, wrappedHeading[1].trim())
  }

  const leadingRuleHeading = trimmed.match(/^(?:\*{3,}|-{3,}|_{3,})\s+(.+)$/)
  if (leadingRuleHeading && looksLikeSectionHeading(leadingRuleHeading[1])) {
    return line.replace(trimmed, leadingRuleHeading[1].trim())
  }

  return line
}

function normalizeWordBulletLine(line: string, trimmed: string) {
  const match = trimmed.match(/^(·|o|§)\s*(.+)$/)
  if (!match) return line

  const level = match[1] === '·' ? '' : match[1] === 'o' ? '  ' : '    '
  const text = cleanInlineMarkers(match[2])
  return line.replace(trimmed, `${level}- ${text}`)
}

function normalizeCompactBulletLine(line: string, trimmed: string) {
  if (/^---+$/.test(trimmed)) return line
  const match = trimmed.match(/^[-–]\s*(?!\s)(.+)$/)
  if (!match) return line

  const text = cleanInlineMarkers(match[1])
  if (!text) return line
  return line.replace(trimmed, `- ${text}`)
}

function normalizeDefinitionBulletLine(line: string, trimmed: string) {
  const match = trimmed.match(/^([A-ZĐ]{1,8})\s+[–-]\s+(.+)$/)
  if (!match) return line
  return line.replace(trimmed, `- ${match[1]} – ${cleanInlineMarkers(match[2])}`)
}

function normalizeWordCheckboxLine(line: string, trimmed: string) {
  const match = trimmed.match(/^v(?=[A-ZÀ-ỸĐ])(.+)$/)
  if (!match) return line
  return line.replace(trimmed, cleanInlineMarkers(match[1]))
}

function normalizeStepLine(line: string, trimmed: string) {
  const cleaned = cleanInlineMarkers(trimmed)
    .replace(/^(#{1,6}\s*)?Bước\s+(\d+)\s*:\s*/i, (_match, prefix = '', number) => `${prefix}Bước ${number}: `)
    .replace(/^Bước\s+(\d+)\s*:\s*/i, (_match, number) => `#### Bước ${number}: `)

  if (cleaned !== trimmed && /^#{1,6}\s*Bước\s+\d+:/i.test(cleaned)) {
    return line.replace(trimmed, cleaned)
  }

  return line
}

function normalizeTableCaptionLine(line: string, trimmed: string) {
  const cleaned = cleanInlineMarkers(trimmed).replace(/^(Bảng\s+\d+)\s*:\s*/i, '$1: ')
  if (cleaned !== trimmed && /^Bảng\s+\d+:/i.test(cleaned)) return line.replace(trimmed, cleaned)
  return line
}

function normalizeDashedHeadingLine(line: string, trimmed: string) {
  const match = trimmed.match(/^(#{1,6}\s*)[-–]\s*(.+)$/)
  if (!match) return line
  return line.replace(trimmed, `${match[1]}${cleanInlineMarkers(match[2])}`)
}

function cleanInlineMarkers(value: string) {
  return value
    .replace(/\\?[*_]{1,6}/g, '')
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripBrokenHeadingMarkers(value: string) {
  return value
    .replace(/(?:\\?[*_]){2,6}\s*$/g, '')
    .replace(/\s*(?:\\?[*_]){2,6}(?=\s|$)/g, '')
    .trim()
}

function isStandaloneRule(line: string) {
  return /^(?:\s*)(?:\*{3,}|-{3,}|_{3,})(?:\s*)$/.test(line)
}

function looksLikeSectionHeading(value: string) {
  const text = value.trim()
  return /^\d+(?:\.\d+)*\.?\s+\S/.test(text) || text.length <= 80
}

function looksLikeNumberedSectionHeading(value: string) {
  return /^(?:#{1,6}\s*)?\d+(?:\s*\.\s*\d+)*\.?\s+\S/.test(value.trim())
}

function promoteNumberedSectionHeading(line: string, previousLineWasTable = false) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('|') || trimmed.startsWith('-') || trimmed.startsWith('*')) return line
  const existingSimpleNumberHeading = trimmed.match(/^(#{1,6}\s+)(\d+)\.\s+(.+)$/)
  if (existingSimpleNumberHeading) {
    if (looksLikeTopLevelIsoHeading(existingSimpleNumberHeading[3])) return line
    return line.replace(trimmed, `${existingSimpleNumberHeading[2]}. ${existingSimpleNumberHeading[3].trim()}`)
  }
  if (/^#{1,6}\s+/.test(trimmed)) {
    return line.replace(trimmed, trimmed.replace(/^((?:#{1,6}\s+)?)(\d+(?:\s*\.\s*\d+)*)\s*\.\s+/, (_match, prefix, number) => `${prefix}${compactSectionNumber(number)}. `))
  }

  const match = trimmed.match(/^(\d+(?:\s*\.\s*\d+)*)\s*\.\s+(.+)$/)
  if (!match) return line

  const title = match[2].trim()
  if (!looksLikePromotableTitle(title)) return line

  const number = compactSectionNumber(match[1])
  if (!number.includes('.') && !previousLineWasTable && !looksLikeTopLevelIsoHeading(title)) return line
  const depth = number.split('.').length
  const level = Math.min(depth + 1, 6)
  return line.replace(trimmed, `${'#'.repeat(level)} ${number}. ${title}`)
}

function compactSectionNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/\.+$/, '')
}

function looksLikePromotableTitle(value: string) {
  if (value.length > 120) return false
  if (/[.!?。]$/.test(value)) return false
  return true
}

function looksLikeTopLevelIsoHeading(value: string) {
  return [
    'mục đích',
    'pham vi',
    'phạm vi',
    'tai lieu tham khao',
    'tài liệu tham khảo',
    'dinh nghia',
    'định nghĩa',
    'viet tat',
    'viết tắt',
    'quy dinh chung',
    'quy định chung',
    'trach nhiem',
    'trách nhiệm',
    'quy trinh',
    'quy trình',
    'thuat ngu',
    'thuật ngữ',
    'noi dung',
    'nội dung',
    'ho so',
    'hồ sơ',
    'phu luc',
    'phụ lục',
    'hieu luc',
    'hiệu lực',
  ].some(keyword => value.toLowerCase().includes(keyword))
}

function isTableLine(line: string) {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|')
}
