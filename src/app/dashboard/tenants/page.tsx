'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, CheckCircle, MessageCircle, RefreshCw, Building2, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'

interface Room { id: string; room_number: string }
interface Tenant {
  id: string
  name: string
  phone: string
  email: string | null
  room_id: string
  cot_number: string | null
  move_in_date: string
  move_out_date: string | null
  status: string
  rent_amount: number | null
}
interface CollectRecord {
  id: string
  tenant_id: string
  tenant_name: string
  phone: string
  room_number: string
  rent_amount: number | null
  amount: number
  period_start: string
  period_end: string
  due_date: string
  paid_date: string | null
  payment_mode: string | null
  status: string
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }
function fmtDateLong(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

const emptyForm = { name: '', phone: '', email: '', room_id: '', cot_number: '', move_in_date: '', move_out_date: '', rent_amount: '' }
type StatusFilter = 'all' | 'active' | 'vacated'

export default function TenantsPage() {
  const t = useT()
  const router = useRouter()
  const [tab, setTab] = useState<'tenants' | 'collect'>('tenants')

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [collectRecords, setCollectRecords] = useState<CollectRecord[]>([])
  const [collectFilter, setCollectFilter] = useState<'pending' | 'all'>('pending')
  const [collectLoading, setCollectLoading] = useState(false)
  const [payDialog, setPayDialog] = useState<{ id: string; name: string } | null>(null)
  const [payMode, setPayMode] = useState('cash')
  const [marking, setMarking] = useState(false)
  const [orgName, setOrgName] = useState('Your PG')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [tr, rr, sr] = await Promise.all([fetch('/api/tenants?limit=500'), fetch('/api/rooms?limit=200'), fetch('/api/settings')])
    setTenants((await tr.json()).data ?? [])
    const roomData = await rr.json()
    setRooms((roomData.data ?? []).map((r: Room) => ({ id: r.id, room_number: r.room_number })))
    const settings = await sr.json()
    if (settings?.name) setOrgName(settings.name)
    setLoading(false)
    loadCollect()
  }

  const loadCollect = async () => {
    setCollectLoading(true)
    const res = await fetch('/api/rent/generate', { method: 'POST' })
    setCollectRecords(await res.json())
    setCollectLoading(false)
  }

  const roomMap = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.room_number])),
    [rooms]
  )

  const filtered = useMemo(
    () => tenants.filter((tenant) => {
      const q = search.toLowerCase()
      const matchSearch = !q || tenant.name.toLowerCase().includes(q) || tenant.phone.includes(q)
      const matchStatus = statusFilter === 'all' || tenant.status === statusFilter
      return matchSearch && matchStatus
    }),
    [tenants, search, statusFilter]
  )

  const visibleCollect = useMemo(
    () => collectFilter === 'pending'
      ? collectRecords.filter((r) => r.status === 'pending')
      : collectRecords,
    [collectRecords, collectFilter]
  )

  const handleSave = async () => {
    const trimmedName = form.name.trim()
    if (!trimmedName || !form.phone || !form.room_id || !form.move_in_date) {
      toast.error('Please fill all required fields.')
      return
    }
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }
    if (form.move_out_date && form.move_out_date <= form.move_in_date) {
      toast.error('Move-out date must be after move-in date.')
      return
    }
    if (tenants.some((tenant) => tenant.phone === form.phone)) {
      toast.error('A tenant with this phone number already exists.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, name: trimmedName, email: form.email.trim() || undefined, cot_number: form.cot_number || undefined, rent_amount: form.rent_amount || undefined }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Failed to add tenant.')
      return
    }
    setOpen(false)
    setForm(emptyForm)
    loadAll()
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
    loadCollect()
  }

  const sendWhatsApp = (r: CollectRecord) => {
    const dueStr = new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const msg = encodeURIComponent(t('whatsapp.rentDue', { name: r.tenant_name, amount: r.amount, date: dueStr, pgName: orgName }))
    window.open(`https://wa.me/91${r.phone}?text=${msg}`, '_blank')
  }

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const { pendingCount, pendingTotal } = useMemo(() => {
    const pending = collectRecords.filter((r) => r.status === 'pending')
    return { pendingCount: pending.length, pendingTotal: pending.reduce((s, r) => s + r.amount, 0) }
  }, [collectRecords])
  const { activeCount, vacatedCount } = useMemo(() => ({
    activeCount:  tenants.filter((t) => t.status === 'active').length,
    vacatedCount: tenants.filter((t) => t.status === 'vacated').length,
  }), [tenants])

  const addTenantForm = (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.name')} <span className="text-red-500">*</span></label>
          <input maxLength={100} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder={t('tenants.fullNamePlaceholder')}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.phone')} <span className="text-red-500">*</span></label>
          <input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('tenants.email')}</label>
        <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder={t('common.optional')}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.roomLabel')} <span className="text-red-500">*</span></label>
          <select value={form.room_id} onChange={(e) => setField('room_id', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
            <option value="">{t('tenants.selectRoom')}</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{t('common.room')} {r.room_number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.cot')}</label>
          <input maxLength={10} value={form.cot_number} onChange={(e) => setField('cot_number', e.target.value)} placeholder="e.g. C1"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('tenants.monthlyRent')}</label>
        <input type="number" min="0" max="999999" inputMode="numeric" value={form.rent_amount} onChange={(e) => setField('rent_amount', e.target.value)} placeholder="e.g. 5000"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.moveInDate')} <span className="text-red-500">*</span></label>
          <input type="date" value={form.move_in_date} onChange={(e) => setField('move_in_date', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('tenants.moveOutDate')}</label>
          <input type="date" min={form.move_in_date || undefined} value={form.move_out_date ?? ''} onChange={(e) => setField('move_out_date', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={() => setOpen(false)}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50">
          {saving ? t('tenants.saving') : t('tenants.save')}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('tenants.title')}</h1>
        {tab === 'tenants' && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
            <DialogTrigger asChild>
              <button className="w-9 h-9 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{t('tenants.addTenant')}</DialogTitle></DialogHeader>
              {addTenantForm}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
        <button
          onClick={() => setTab('tenants')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'tenants' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}
        >
          {t('tenants.allTenants')}
        </button>
        <button
          onClick={() => setTab('collect')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === 'collect' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}
        >
          {t('tenants.collectRent')}
          {pendingCount > 0 && tab !== 'collect' && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── All Tenants tab ── */}
      {tab === 'tenants' && (
        <>
          {/* Stats row — always rendered to prevent layout shift */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
                  <div className="h-7 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-2.5 w-10 mx-auto bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))
            ) : tenants.length > 0 ? (
              <>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
                  <p className="text-xl font-bold dark:text-white">{tenants.length}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Total</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-green-600">{activeCount}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{t('tenants.filterActive')}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-gray-400">{vacatedCount}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{t('tenants.filterExited')}</p>
                </div>
              </>
            ) : null}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tenants.searchPlaceholder')}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white"
            />
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-4">
            {([['all', t('common.all')], ['active', t('tenants.filterActive')], ['vacated', t('tenants.filterExited')]] as [StatusFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === val
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">No Tenants Yet</p>
              <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
                Add your first tenant to start tracking rent and occupancy.
              </p>
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-700">
                    <Plus className="w-4 h-4" /> Add First Tenant
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>{t('tenants.addTenant')}</DialogTitle></DialogHeader>
                  {addTenantForm}
                </DialogContent>
              </Dialog>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">{t('tenants.noTenantsFound')}</p>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => router.push(`/dashboard/tenants/${tenant.id}`)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-all"
                >
                  <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                    {initials(tenant.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white">{tenant.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="w-3 h-3" />{t('common.room')} {roomMap[tenant.room_id] ?? '—'}
                      </span>
                      {tenant.rent_amount != null && (
                        <span className="text-xs text-gray-500">₹{tenant.rent_amount.toLocaleString('en-IN')}/mo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      {tenant.status === 'active' ? t('tenants.active') : t('tenants.filterExited')}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Calendar className="w-3 h-3" />{fmtDateLong(tenant.move_in_date)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Collect Rent tab ── */}
      {tab === 'collect' && (
        <>
          {/* Collect summary card */}
          {!collectLoading && collectRecords.length > 0 && (
            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">{fmt(pendingTotal)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{pendingCount} pending</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">
                    {fmt(collectRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0))}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{collectRecords.filter((r) => r.status === 'paid').length} collected</p>
                </div>
              </div>
              {collectRecords.length > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-green-400 rounded-full h-1.5 transition-all"
                    style={{ width: `${Math.round((collectRecords.filter((r) => r.status === 'paid').length / collectRecords.length) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Filter + refresh */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setCollectFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${collectFilter === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}
              >
                {t('tenants.pendingLabel')} {pendingCount > 0 && <span className="ml-1 text-red-500">({pendingCount})</span>}
              </button>
              <button
                onClick={() => setCollectFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${collectFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}
              >
                {t('tenants.allLabel')}
              </button>
            </div>
            <button
              onClick={loadCollect}
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5" />{t('common.refresh')}
            </button>
          </div>

          {collectLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : visibleCollect.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {collectFilter === 'pending' ? t('tenants.allCollectedThisMonth') : t('tenants.noRecordsThisMonth')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleCollect.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                      {initials(r.tenant_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm dark:text-white">{r.tenant_name}</p>
                      <p className="text-xs text-gray-500">{t('common.room')} {r.room_number} · {fmt(r.amount)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {r.status === 'paid' ? '✓ ' + t('common.paid') : t('common.pending')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {t('tenants.due', { date: new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                    </p>
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setPayDialog({ id: r.id, name: r.tenant_name }); setPayMode('cash') }}
                          className="flex items-center gap-1.5 text-xs bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-gray-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />{t('tenants.markPaid')}
                        </button>
                        <button
                          onClick={() => sendWhatsApp(r)}
                          className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600"
                        >
                          <MessageCircle className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
                <option value="cash">{t('rent.cash')}</option>
                <option value="upi">{t('rent.upi')}</option>
                <option value="bank">{t('rent.bankTransfer')}</option>
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
                {marking ? t('common.savingDots') : t('common.confirm')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
