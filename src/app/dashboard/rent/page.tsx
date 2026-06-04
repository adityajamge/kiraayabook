'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CheckCircle, MessageCircle, CalendarDays } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Tenant { id: string; name: string; phone: string; room_id: string }
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
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
function initials(name: string) { return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() }

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function isOverdue(record: RentRecord) {
  return record.status === 'pending' && new Date(record.due_date) < new Date()
}

export default function RentPage() {
  const [records, setRecords] = useState<RentRecord[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [payDialog, setPayDialog] = useState<{ id: string; name: string } | null>(null)
  const [payMode, setPayMode] = useState('cash')
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    Promise.all([fetch('/api/tenants'), fetch('/api/rooms')])
      .then(([tr, rr]) => Promise.all([tr.json(), rr.json()]))
      .then(([t, r]) => { setTenants(t); setRooms(r) })
  }, [])

  useEffect(() => { loadRecords() }, [monthFilter])

  const loadRecords = async () => {
    setLoading(true)
    const res = await fetch('/api/rent')
    const all: RentRecord[] = await res.json()
    setRecords(monthFilter ? all.filter((r) => r.due_date.slice(0, 7) === monthFilter) : all)
    setLoading(false)
  }

  const handleMarkPaid = async () => {
    if (!payDialog) return
    setMarking(true)
    await fetch(`/api/rent/${payDialog.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_mode: payMode }),
    })
    setMarking(false)
    setPayDialog(null)
    setPayMode('cash')
    loadRecords()
  }

  const sendWhatsApp = (record: RentRecord) => {
    const t = tenantMap[record.tenant_id]
    if (!t) return
    const dueStr = new Date(record.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const msg = encodeURIComponent(`Hi ${t.name}, your rent of ${fmt(record.amount)} is due on ${dueStr}. Please pay at the earliest. - KiraayaBook`)
    window.open(`https://wa.me/91${t.phone}?text=${msg}`, '_blank')
  }

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.room_number]))

  const paid = records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending = records.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)

  const markPaidDialog = (
    <Dialog open={!!payDialog} onOpenChange={(v) => { if (!v) setPayDialog(null) }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-sm text-gray-500">Recording payment for <span className="font-medium text-black dark:text-white">{payDialog?.name}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select value={payMode} onChange={(e) => setPayMode(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setPayDialog(null)}
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleMarkPaid} disabled={marking}
              className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {marking ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold dark:text-white">Rent</h1>
          <CalendarDays className="w-5 h-5 text-gray-500" />
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => setMonthFilter(addMonths(monthFilter, -1))}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-base dark:text-white min-w-32 text-center">{formatMonthLabel(monthFilter)}</span>
          <button onClick={() => setMonthFilter(addMonths(monthFilter, 1))}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-xl font-bold text-green-600">{fmt(paid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
              </div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-orange-500">{fmt(pending)}</p>
            </div>
          </div>
        )}

        {/* Record list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">No records for this month.</p>
        ) : (
          <div className="space-y-2.5">
            {records.map((r) => {
              const t = tenantMap[r.tenant_id]
              const overdue = isOverdue(r)
              return (
                <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                    {t ? initials(t.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white">{t?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">
                      Room {t ? roomMap[t.room_id] ?? '—' : '—'} · {fmt(r.amount)}
                    </p>
                    <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      Due {new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      r.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : overdue
                        ? 'bg-red-100 text-red-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {r.status === 'paid' ? '✓ Paid' : overdue ? '⚠ Overdue' : 'Pending'}
                    </span>
                    {r.status === 'pending' && (
                      <button onClick={() => sendWhatsApp(r)}
                        className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600">
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Record Payment FAB */}
        <button
          onClick={() => {
            const first = records.find((r) => r.status === 'pending')
            if (first) {
              const t = tenantMap[first.tenant_id]
              setPayDialog({ id: first.id, name: t?.name ?? 'Tenant' })
              setPayMode('cash')
            }
          }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-3.5 rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>

        {markPaidDialog}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rent History</h1>
            <p className="text-gray-500 text-sm mt-0.5">Transaction history. Collect rent from the Tenants page.</p>
          </div>
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>

        {!loading && records.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">Collected</p>
              <p className="text-xl font-bold text-green-600">{fmt(paid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">Pending</p>
              <p className="text-xl font-bold text-red-500">{fmt(pending)}</p>
            </div>
          </div>
        )}

        {loading ? <TableSkeleton cols={7} /> : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No records for this month.</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['TENANT', 'ROOM', 'PERIOD', 'AMOUNT', 'DUE DATE', 'PAID DATE', 'MODE', 'STATUS'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const t = tenantMap[r.tenant_id]
                  return (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-5 py-4 font-medium">{t?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-500">{t ? roomMap[t.room_id] ?? '—' : '—'}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDate(r.period_start)} – {fmtDate(r.period_end)}</td>
                      <td className="px-5 py-4 font-medium">{fmt(r.amount)}</td>
                      <td className="px-5 py-4 text-gray-500">{new Date(r.due_date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4 text-gray-500">{r.paid_date ? new Date(r.paid_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-5 py-4 text-gray-500 capitalize">{r.payment_mode ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={r.status === 'paid'
                          ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full'
                          : 'bg-red-100 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full'}>
                          {r.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {markPaidDialog}
      </div>
    </>
  )
}
