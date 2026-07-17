// Accounting export: turn completed, priced lessons into invoice CSVs that import
// directly into Xero or QuickBooks Online. Pure functions (no I/O) so they're
// fully unit-testable. For live sync, tutors can also pipe the `payment.received`
// / `lesson.completed` webhooks into QuickBooks/Xero via Zapier (see /developers).

export type AccountingProvider = 'xero' | 'quickbooks'

export interface InvoiceRow {
  invoiceNo: string
  contact: string   // customer / student name
  date: string      // YYYY-MM-DD
  dueDate: string   // YYYY-MM-DD
  description: string
  quantity: number
  amount: number    // unit amount (per lesson)
}

// RFC-4180 style cell escaping: quote when the value contains a comma, quote or
// newline, and double any embedded quotes.
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',')
}

// Map one lesson to a normalized invoice row.
export function lessonToInvoiceRow(l: {
  id: string
  starts_at: string
  duration_minutes?: number | null
  price?: number | null
  student_name?: string | null
}): InvoiceRow {
  const d = new Date(l.starts_at)
  const date = Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  return {
    invoiceNo: `TUT-${l.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    contact: (l.student_name ?? '').trim() || 'Student',
    date,
    dueDate: date,
    description: `Tutoring lesson (${Number(l.duration_minutes) || 0} min)`,
    quantity: 1,
    amount: Number(l.price) || 0,
  }
}

const XERO_HEADER = ['ContactName', 'InvoiceNumber', 'InvoiceDate', 'DueDate', 'Description', 'Quantity', 'UnitAmount', 'AccountCode', 'TaxType']
const QBO_HEADER = ['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'ItemProductService', 'ItemDescription', 'ItemQuantity', 'ItemRate', 'ItemAmount']

export function generateAccountingCsv(provider: AccountingProvider, rows: InvoiceRow[]): string {
  const lines: string[] = []
  if (provider === 'xero') {
    lines.push(csvRow(XERO_HEADER))
    for (const r of rows) {
      lines.push(csvRow([r.contact, r.invoiceNo, r.date, r.dueDate, r.description, r.quantity, r.amount.toFixed(2), '200', 'Tax Exempt']))
    }
  } else {
    lines.push(csvRow(QBO_HEADER))
    for (const r of rows) {
      lines.push(csvRow([r.invoiceNo, r.contact, r.date, r.dueDate, 'Tutoring', r.description, r.quantity, r.amount.toFixed(2), (r.amount * r.quantity).toFixed(2)]))
    }
  }
  return lines.join('\r\n') + '\r\n'
}
