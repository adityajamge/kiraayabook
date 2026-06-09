'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, MessageCircle, FileText, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BillPreview, type BillData } from '@/components/bill-preview'
import { useT } from '@/lib/i18n'

interface Tenant { id: string; name: string; phone: string; room_id: string; move_in_date: string }
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
  bill_no: number
}
interface OrgSettings {
  logo_url: string | null
  bill_notes: string | null
}
interface Property {
  id: string
  name: string
  address: string | null
  phones: string[] | null
}
interface RentRecordWithProperty extends RentRecord {
  property_id: string
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }
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
  const t = useT()
  const [records, setRecords] = useState<RentRecord[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [payDialog, setPayDialog] = useState<{ id: string; name: string } | null>(null)
  const [payMode, setPayMode] = useState('cash')
  const [marking, setMarking] = useState(false)
  const [billRecord, setBillRecord] = useState<RentRecord | null>(null)

  useEffect(() => {
    Promise.all([fetch('/api/tenants?limit=500'), fetch('/api/rooms?limit=200'), fetch('/api/settings'), fetch('/api/properties')])
      .then(([tr, rr, sr, pr]) => Promise.all([tr.json(), rr.json(), sr.json(), pr.json()]))
      .then(([tn, r, s, p]) => { setTenants(tn.data ?? []); setRooms(r.data ?? []); setOrg(s); setProperties(p) })
  }, [])

  useEffect(() => { loadRecords() }, [monthFilter])

  const loadRecords = async () => {
    setLoading(true)
    const url = monthFilter ? `/api/rent?due_month=${monthFilter}&limit=500` : '/api/rent?limit=500'
    const res = await fetch(url)
    setRecords((await res.json()).data ?? [])
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
    const tenant = tenantMap[record.tenant_id]
    if (!tenant) return
    const dueStr = new Date(record.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const property = properties.find(p => p.id === (record as RentRecordWithProperty).property_id)
    const msg = encodeURIComponent(t('whatsapp.rentDue', { name: tenant.name, amount: String(record.amount), date: dueStr, pgName: property?.name ?? 'Your PG' }))
    window.open(`https://wa.me/91${tenant.phone}?text=${msg}`, '_blank')
  }

  const buildBillData = (r: RentRecord): BillData | null => {
    const tenant = tenantMap[r.tenant_id]
    if (!tenant) return null
    const property = properties.find(p => p.id === (r as RentRecordWithProperty).property_id)
    return {
      pgName:      property?.name    ?? 'Your PG',
      address:     property?.address ?? null,
      phones:      property?.phones  ?? null,
      logoUrl:     org?.logo_url     ?? null,
      billNotes:   org?.bill_notes   ?? null,
      billNo:      String(r.bill_no),
      date:        r.paid_date ?? new Date().toISOString().slice(0, 10),
      tenantName:  tenant.name,
      roomNumber:  roomMap[tenant.room_id] ?? '—',
      joiningDate: tenant.move_in_date,
      periodFrom:  r.period_start,
      periodTo:    r.period_end,
      amount:      r.amount,
      paymentMode: r.payment_mode,
      status:      r.status,
    }
  }

  const tenantMap = useMemo(
    () => Object.fromEntries(tenants.map((tn) => [tn.id, tn])),
    [tenants]
  )
  const roomMap = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.room_number])),
    [rooms]
  )

  const { paid, pending, overdueCount, total, pct } = useMemo(() => {
    const paid         = records.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
    const pending      = records.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
    const overdueCount = records.filter(isOverdue).length
    const total        = paid + pending
    const pct          = total > 0 ? Math.round((paid / total) * 100) : 0
    return { paid, pending, overdueCount, total, pct }
  }, [records])

  const activeBillData = billRecord ? buildBillData(billRecord) : null

  return (
    <>
      {activeBillData && (
        <BillPreview data={activeBillData} onClose={() => setBillRecord(null)} />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('rent.title')}</h1>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setMonthFilter(addMonths(monthFilter, -1))}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-base dark:text-white min-w-36 text-center">{formatMonthLabel(monthFilter)}</span>
        <button
          onClick={() => setMonthFilter(addMonths(monthFilter, 1))}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary card — always rendered to prevent layout shift on month change */}
      <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4 mb-5">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="text-center space-y-1.5">
                <div className="h-6 w-16 mx-auto bg-gray-700 rounded animate-pulse" />
                <div className="h-2.5 w-12 mx-auto bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : records.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{fmt(paid)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t('rent.collected')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{fmt(pending)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t('rent.pending')}</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-orange-400' : 'text-gray-400'}`}>{overdueCount}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t('rent.overdue')}</p>
              </div>
            </div>
            {total > 0 && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-green-400 rounded-full h-1.5 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 text-center">{pct}% collection rate</p>
              </>
            )}
          </>
        ) : null}
      </div>

      {/* Record list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('rent.noRecords')}</p>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            No rent records for {formatMonthLabel(monthFilter)}.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => {
            const tenant = tenantMap[r.tenant_id]
            const overdue = isOverdue(r)
            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 shadow-sm ${
                  overdue
                    ? 'border-red-100 dark:border-red-900/40'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                    {tenant ? initials(tenant.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white">{tenant?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">
                      {t('common.room')} {tenant ? roomMap[tenant.room_id] ?? '—' : '—'} · {fmt(r.amount)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    r.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : overdue
                      ? 'bg-red-100 text-red-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {r.status === 'paid'
                      ? t('rent.paidStatus')
                      : overdue
                      ? t('rent.overdue')
                      : t('rent.pendingStatus')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {t('rent.due', { date: new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })}
                    {r.paid_date && (
                      <span className="ml-2 text-green-600">
                        · Paid {new Date(r.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {r.payment_mode ? ` (${r.payment_mode})` : ''}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBillRecord(r)}
                      className="flex items-center gap-1 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium px-2.5 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FileText className="w-3 h-3" />{t('rent.bill')}
                    </button>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => { setPayDialog({ id: r.id, name: tenant?.name ?? 'Tenant' }); setPayMode('cash') }}
                          className="flex items-center gap-1 text-xs bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-700"
                        >
                          <CheckCircle className="w-3 h-3" />{t('rent.paid')}
                        </button>
                        <button
                          onClick={() => sendWhatsApp(r)}
                          className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mark Paid dialog */}
      <Dialog open={!!payDialog} onOpenChange={(v) => { if (!v) setPayDialog(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('rent.markAsPaid')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-gray-500">{t('rent.recordingPaymentFor')} <span className="font-medium text-black dark:text-white">{payDialog?.name}</span></p>
            <div>
              <label className="block text-sm font-medium mb-1">{t('rent.paymentMode')}</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="online">{t('rent.online')}</option>
                <option value="cash">{t('rent.cash')}</option>
                <option value="cheque">{t('rent.cheque')}</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPayDialog(null)}
                className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >{t('common.cancel')}</button>
              <button
                onClick={handleMarkPaid}
                disabled={marking}
                className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
              >
                {marking ? t('rent.saving') : t('common.confirm')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
