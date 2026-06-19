export const ISO_SECTIONS = [
  { number: 1, title: 'MỤC ĐÍCH' },
  { number: 2, title: 'PHẠM VI' },
  { number: 3, title: 'TRÁCH NHIỆM' },
  { number: 4, title: 'ĐỊNH NGHĨA / VIẾT TẮT' },
  { number: 5, title: 'QUY ĐỊNH CHUNG' },
  { number: 6, title: 'QUY TRÌNH' },
  { number: 7, title: 'LƯU TRỮ HỒ SƠ' },
  { number: 8, title: 'PHỤ LỤC' },
  { number: 9, title: 'HIỆU LỰC ÁP DỤNG' },
] as const

export type IsoSectionValues = Record<number, string>

export interface IsoRecordResource {
  resource_code: string
  name: string
  retention_period?: string | null
  updated_at?: string | null
  created_at?: string | null
  department?: { name: string } | null
}

export function splitIsoDocument(content: string): IsoSectionValues {
  const sections = emptyIsoSections()
  const heading = /^(?:#{1,6}\s*)?([1-9])\.\s+.+$/gm
  const matches = Array.from(content.matchAll(heading))

  if (!matches.length) {
    sections[1] = content.trim()
    return sections
  }

  matches.forEach((match, index) => {
    const number = Number(match[1])
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? content.length
    sections[number] = content.slice(start, end).trim()
  })

  return sections
}

export function composeIsoDocument(sections: IsoSectionValues, resources: IsoRecordResource[] = []) {
  return ISO_SECTIONS.map(section => {
    const body = section.number === 7
      ? createRecordsTable(resources)
      : sections[section.number]?.trim()
    return `## ${section.number}. ${section.title}\n\n${body || ''}`.trimEnd()
  }).join('\n\n')
}

export function createRecordsTable(resources: IsoRecordResource[]) {
  if (!resources.length) return 'Chưa liên kết hồ sơ hoặc biểu mẫu.'

  const rows = resources.map((resource, index) => (
    `| ${index + 1} | ${escapeCell(resource.resource_code)} | ${escapeCell(resource.name)} | ${escapeCell(resource.department?.name ?? '—')} | ${escapeCell(formatDate(resource.updated_at ?? resource.created_at))} | ${escapeCell(resource.retention_period ?? '—')} |`
  ))

  return [
    '| TT | Mã tài liệu | Tên tài liệu | Bộ phận lưu | Cập nhật | Thời gian lưu |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
}

function emptyIsoSections() {
  return Object.fromEntries(ISO_SECTIONS.map(section => [section.number, ''])) as IsoSectionValues
}

function escapeCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—'
}
