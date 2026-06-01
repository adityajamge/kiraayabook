'use client'

import { useEffect, useState } from 'react'
import { TableSkeleton } from '@/components/skeletons'

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function RentPage() {
  const [records, setRecords] = useState<RentRecord[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

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

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.room_number]))

  const paid = records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending = records.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Rent History</h1>
          <p className="text-gray-500 text-sm mt-0.5">Transaction history. Collect rent from the Tenants page.</p>
        </div>
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
      </div>

      {/* Summary */}
      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Collected</p>
            <p className="text-xl font-bold text-green-600">{fmt(paid)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Pending</p>
            <p className="text-xl font-bold text-red-500">{fmt(pending)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={7} />
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No records for this month.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['TENANT', 'ROOM', 'PERIOD', 'AMOUNT', 'DUE DATE', 'PAID DATE', 'MODE', 'STATUS'].map((h) => (
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
    </div>
  )
}
