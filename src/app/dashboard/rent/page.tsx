'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { CheckCircle, MessageCircle, FileText, AlertTriangle, RefreshCw, IndianRupee } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BillPreview, type BillData } from '@/components/bill-preview'
import { useT } from '@/lib/i18n'

interface Tenant { id: string; name: string; phone: string; room_id: string; move_in_date: string }
interface Room { id: string; room_number: string }
interface RentRecord {
  id: string
  tenant_id: string
  property_id: string
  amount_due: number
  cycle_start: string
  cycle_end: string
  status: string
  bill_no: number | null
  amount_paid: number
  balance: number
  last_paid_date: string | null
  last_payment_mode: string | null
}
interface OrgSettings { logo_url: string | null; bill_notes: string | null }
interface Property { id: string; name: string; address: string | null; phones: string[] | null }

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }
function initials(name: string) { return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() }
function fmtCycle(cycle_start: string, cycle_end: string) {
  const s = new Date(cycle_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const e = new Date(cycle_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function isOverdue(r: RentRecord) {
  return r.status !== 'paid' && new Date(r.cycle_start) < new Date()
}

export default function RentPage() {
  const t = useT()
  const [records, setRecords]     = useState<RentRecord[]>([])
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [rooms, setRooms]         = useState<Room[]>([])
  const [org, setOrg]             = useState<OrgSettings | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)

  // Payment sheet state
  const [paySheet, setPaySheet]   = useState<{ record: RentRecord; tenantName: string } | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode]     = useState('cash')
  const [payDate, setPayDate]     = useState(new Date().toISOString().slice(0, 10))
  const [payNote, setPayNote]     = useState('')
  const [saving, setSaving]       = useState(false)

  const [billRecord, setBillRecord] = useState<RentRecord | null>(null)

  // Initial load: ensure records are up-to-date, then fetch
  useEffect(() => {
    Promise.all([
      fetch('/api/tenants?limit=500'),
      fetch('/api/rooms?limit=200'),
      fetch('/api/settings'),
      fetch('/api/properties'),
    ])
      .then(([tr, rr, sr, pr]) => Promise.all([tr.json(), rr.json(), sr.json(), pr.json()]))
      .then(([tn, r, s, p]) => {
        setTenants(tn.data ?? [])
        setRooms(r.data ?? [])
        setOrg(s)
        setProperties(p)
      })

    syncAndLoad()
  }, [])

  const syncAndLoad = useCallback(async () => {
    setSyncing(true)
    await fetch('/api/rent/ensure', { method: 'POST' }).catch(() => {})
    await loadRecords()
    setSyncing(false)
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    const res = await fetch('/api/rent?limit=500')
    setRecords((await res.json()).data ?? [])
    setLoading(false)
  }

  const openPaySheet = (record: RentRecord) => {
    const tenant = tenantMap[record.tenant_id]
    setPaySheet({ record, tenantName: tenant?.name ?? 'Tenant' })
    setPayAmount(String(record.balance))
    setPayMode('cash')
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayNote('')
  }

  const handleRecordPayment = async () => {
    if (!paySheet) return
    const amount = parseInt(payAmount, 10)
    if (!amount || amount <= 0) return
    setSaving(true)
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rent_record_id: paySheet.record.id,
        amount,
        paid_date:      payDate,
        payment_mode:   payMode,
        note:           payNote || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setPaySheet(null)
      loadRecords()
    }
  }

  const sendWhatsApp = (record: RentRecord) => {
    const tenant = tenantMap[record.tenant_id]
    if (!tenant) return
    const dueStr = new Date(record.cycle_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const property = properties.find(p => p.id === record.property_id)
    const msg = encodeURIComponent(t('whatsapp.rentDue', { name: tenant.name, amount: String(record.balance), date: dueStr, pgName: property?.name ?? 'Your PG' }))
    window.open(`https://wa.me/91${tenant.phone}?text=${msg}`, '_blank')
  }

  const buildBillData = (r: RentRecord): BillData | null => {
    const tenant = tenantMap[r.tenant_id]
    if (!tenant) return null
    const property = properties.find(p => p.id === r.property_id)
    return {
      pgName:      property?.name    ?? 'Your PG',
      address:     property?.address ?? null,
      phones:      property?.phones  ?? null,
      logoUrl:     org?.logo_url     ?? null,
      billNotes:   org?.bill_notes   ?? null,
      billNo:      r.bill_no ? String(r.bill_no) : '—',
      date:        r.last_paid_date ?? new Date().toISOString().slice(0, 10),
      tenantName:  tenant.name,
      roomNumber:  roomMap[tenant.room_id] ?? '—',
      joiningDate: tenant.move_in_date,
      periodFrom:  r.cycle_start,
      periodTo:    r.cycle_end,
      amount:      r.amount_due,
      paymentMode: r.last_payment_mode,
      status:      r.status,
    }
  }

  const tenantMap = useMemo(() => Object.fromEntries(tenants.map(tn => [tn.id, tn])), [tenants])
  const roomMap   = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r.room_number])), [rooms])

  const { totalBalance, overdueCount, partialCount, totalRecords } = useMemo(() => {
    const totalBalance  = records.reduce((s, r) => s + r.balance, 0)
    const overdueCount  = records.filter(r => isOverdue(r) && r.status === 'pending').length
    const partialCount  = records.filter(r => r.status === 'partial').length
    const totalRecords  = records.length
    return { totalBalance, overdueCount, partialCount, totalRecords }
  }, [records])

  const activeBillData = billRecord ? buildBillData(billRecord) : null

  return (
    <>
      {activeBillData && <BillPreview data={activeBillData} onClose={() => setBillRecord(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('rent.title')}</h1>
        <button
          onClick={syncAndLoad}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>

      {/* Summary card — always rendered to prevent CLS */}
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
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">{fmt(totalBalance)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Balance Due</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-orange-400' : 'text-gray-400'}`}>{overdueCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('rent.overdue')}</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${partialCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>{partialCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Partial</p>
            </div>
          </div>
        )}
      </div>

      {/* Record list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">All caught up!</p>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            No pending or partial rent records. Tap Sync if you expect new cycles.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map(r => {
            const tenant  = tenantMap[r.tenant_id]
            const overdue = isOverdue(r)
            const isPartial = r.status === 'partial'
            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 shadow-sm ${
                  overdue ? 'border-red-100 dark:border-red-900/40' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Top row: avatar + name + status badge */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                    {tenant ? initials(tenant.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white">{tenant?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">
                      {t('common.room')} {tenant ? roomMap[tenant.room_id] ?? '—' : '—'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    isPartial
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : overdue
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {isPartial ? 'Partial' : overdue ? t('rent.overdue') : t('rent.pendingStatus')}
                  </span>
                </div>

                {/* Cycle + amounts */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Cycle</span>
                    <span className="text-xs font-medium dark:text-white">
                      {fmtCycle(r.cycle_start, r.cycle_end)}
                    </span>
                  </div>
                  {isPartial ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Paid</span>
                        <span className="text-xs font-medium text-green-600">{fmt(r.amount_paid)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Balance</span>
                        <span className="text-sm font-bold text-red-500">{fmt(r.balance)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Due</span>
                      <span className="text-sm font-bold dark:text-white">{fmt(r.amount_due)}</span>
                    </div>
                  )}
                  {overdue && (
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-[11px] font-medium">
                        Overdue since {new Date(r.cycle_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBillRecord(r)}
                      className="flex items-center gap-1 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium px-2.5 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FileText className="w-3 h-3" />{t('rent.bill')}
                    </button>
                    <button
                      onClick={() => sendWhatsApp(r)}
                      className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <button
                    onClick={() => openPaySheet(r)}
                    className="flex items-center gap-1.5 text-xs bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-700"
                  >
                    <IndianRupee className="w-3 h-3" />
                    {isPartial ? 'Add Payment' : 'Record Payment'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Record Payment bottom sheet */}
      <Dialog open={!!paySheet} onOpenChange={v => { if (!v) setPaySheet(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {paySheet && (
            <div className="space-y-3 mt-1">
              <p className="text-sm text-gray-500">
                For <span className="font-medium text-black dark:text-white">{paySheet.tenantName}</span>
                {' · '}
                {fmtCycle(paySheet.record.cycle_start, paySheet.record.cycle_end)}
              </p>
              {paySheet.record.status === 'partial' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
                  Already paid {fmt(paySheet.record.amount_paid)} of {fmt(paySheet.record.amount_due)} · Balance {fmt(paySheet.record.balance)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Amount (max {fmt(paySheet.record.balance)})</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={paySheet.record.balance}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('rent.paymentMode')}</label>
                <select
                  value={payMode}
                  onChange={e => setPayMode(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="online">{t('rent.online')}</option>
                  <option value="cash">{t('rent.cash')}</option>
                  <option value="cheque">{t('rent.cheque')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  maxLength={200}
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="e.g. partial, rest in 15 days"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPaySheet(null)}
                  className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
                >{t('common.cancel')}</button>
                <button
                  onClick={handleRecordPayment}
                  disabled={saving || !payAmount || parseInt(payAmount) <= 0}
                  className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? t('rent.saving') : 'Record'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
