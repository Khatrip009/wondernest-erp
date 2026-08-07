export const exportCSV = (columns, data, filename = 'export.csv') => {
  // Build header row
  const headers = columns.map((col) => col.title).join(',')

  // Build data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.dataIndex] ?? ''
        // Escape values with commas or quotes
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(',')
  )

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}