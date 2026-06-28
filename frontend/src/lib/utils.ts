export const fmtCur = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(n ?? 0)

export const genId = () =>
  Math.random().toString(36).slice(2, 9).toUpperCase()

export const ALL_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

export function downloadCSV(filename: string, headers: string[], rows: (string|number)[][]) {
  const esc = (v: string|number) => `"${String(v).replace(/"/g,'""')}"`
  const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))]
  const blob = new Blob(['\uFEFF'+lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

export function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
}
