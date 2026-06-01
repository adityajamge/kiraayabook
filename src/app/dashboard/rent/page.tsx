'use client'

import { useEffect, useState } from 'react'
import { Plus, MessageCircle, CheckCircle } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Tenant {
  id: string
  name: string
  phone: string
  room_id: string
  move_in_date: string
  rent_amount: number | null
}
interface Room { id: string; room_number: string }
interface RentRecord {
  id: string
  tenant_id: string
  amount: number
  period_start: string
  period_end: string
  due_date: string
  paid_date: string | null
  payment_mode: string | null
  status: string
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function nextDueDate(moveInDate: string): string {
  const day = new Date(moveInDate).getDate()
  const today = new Date()
  let due = new Date(today.getFullYear(), today.getMonth(), day)
  if (due <= today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, day)
  }
  return due.toISOString().split('T')[0]
}

function periodFromDue(dueDate: string): { period_start: string; period_end: string } {
  const due = new Date(dueDate)
  const start = new Date(due.getFullYear(), due.getMonth() - 1, due.getDate())
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 1)
  return {
    period_start: start.toISOString().split('T')[0],
    period_end: end.toISOString().split('T')[0],
  }
}

const emptyForm = { tenant_id: '', amount: '', due_date: '', period_start: '', period_end: '', payment_mode: '' }

export default function RentPage() {
  const [records, setRecords] = useState<RentRecord[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadRecords() }, [monthFilter])

  const loadAll = async () => {
    const [tr, rr] = await Promise.all([fetch('/api/tenants'), fetch('/api/rooms')])
    setTenants(await tr.json())
    setRooms(await rr.json())
  }

  const loadRecords = async () => {
    setLoading(true)
    const res = await fetch('/api/rent')
    const all: RentRecord[] = await res.json()
    setRecords(monthFilter ? all.filter((r) => r.due_date.slice(0, 7) === monthFilter) : all)
    setLoading(false)
  }

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.room_number]))

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    if (!tenant) { setForm((f) => ({ ...f, tenant_id: tenantId })); return }
    const due = nextDueDate(tenant.move_in_date)
    const { period_start, period_end } = periodFromDue(due)
    setForm((f) => ({
      ...f,
      tenant_id: tenantId,
      due_date: due,
      period_start,
      period_end,
      amount: tenant.rent_amount ? String(tenant.rent_amount) : f.amount,
    }))
  }

  const handleDueDateChange = (val: string) => {
    const { period_start, period_end } = val ? periodFromDue(val) : { period_start: '', period_end: '' }
    setForm((f) => ({ ...f, due_date: val, period_start, period_end }))
  }

  const handleSave = async () => {
    if (!form.tenant_id || !form.amount || !form.due_date || !form.period_start || !form.period_end) return
    setSaving(true)
    await fetch('/api/rent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        payment_mode: form.payment_mode || undefined,
      }),
    })
    setSaving(false)
    setOpen(false)
    setForm(emptyForm)
    loadRecords()
  }

  const markPaid = async (id: string) => {
    const mode = prompt('Payment mode? (cash / upi / bank)') ?? 'cash'
    await fetch(`/api/rent/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_mode: mode }),
    })
    loadRecords()
  }

  const sendWhatsApp = (record: RentRecord) => {
    const t = tenantMap[record.tenant_id]
    if (!t) return
    const dueStr = new Date(record.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const msg = encodeURIComponent(
      `Hi ${t.name}, your rent of ${fmt(record.amount)} is due on ${dueStr}. Please pay at the earliest. - KiraayaBook`
    )
    window.open(`https://wa.me/91${t.phone}?text=${msg}`, '_blank')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Rent</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track rent collection and dues</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800">
                <Plus className="w-4 h-4" />Add Record
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Rent Record</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant <span className="text-red-500">*</span></label>
                  <select value={form.tenant_id} onChange={(e) => handleTenantChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    <option value="">Select tenant</option>
                    {tenants.filter(t => t).map((t) => (
                      <option key={t.id} value={t.id}>{t.name} — Room {roomMap[t.room_id] ?? '?'}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="e.g. 5000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date <span className="text-red-500">*</span></label>
                    <input type="date" value={form.due_date} onChange={(e) => handleDueDateChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                  </div>
                </div>
                {form.period_start && form.period_end && (
                  <p className="text-xs text-gray-400 -mt-1">
                    Period: {fmtDate(form.period_start)} – {fmtDate(form.period_end)}
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Mode</label>
                  <select value={form.payment_mode} onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    <option value="">Select (if already paid)</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={7} />
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No rent records for this period.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['TENANT', 'ROOM', 'PERIOD', 'AMOUNT', 'DUE DATE', 'MODE', 'STATUS', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const t = tenantMap[r.tenant_id]
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">{t?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{t ? roomMap[t.room_id] ?? '—' : '—'}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDate(r.period_start)} – {fmtDate(r.period_end)}</td>
                    <td className="px-5 py-4 font-medium">{fmt(r.amount)}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(r.due_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 text-gray-500 capitalize">{r.payment_mode ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className={r.status === 'paid'
                        ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full'
                        : 'bg-red-100 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full'}>
                        {r.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => markPaid(r.id)}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />Mark Paid
                          </button>
                          <button onClick={() => sendWhatsApp(r)}
                            className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600">
                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
