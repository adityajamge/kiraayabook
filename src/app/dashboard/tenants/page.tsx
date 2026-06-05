'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Eye, Search, CheckCircle, MessageCircle, RefreshCw, Building2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
function fmtDateLong(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

const emptyForm = { name: '', phone: '', email: '', room_id: '', cot_number: '', move_in_date: '', move_out_date: '', rent_amount: '' }

type StatusFilter = 'all' | 'active' | 'vacated'

export default function TenantsPage() {
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
    const [tr, rr, sr] = await Promise.all([fetch('/api/tenants'), fetch('/api/rooms'), fetch('/api/settings')])
    setTenants(await tr.json())
    const roomData = await rr.json()
    setRooms(roomData.map((r: Room) => ({ id: r.id, room_number: r.room_number })))
    const settings = await sr.json()
    if (settings?.name) setOrgName(settings.name)
    setLoading(false)
  }

  const loadCollect = async () => {
    setCollectLoading(true)
    const res = await fetch('/api/rent/generate', { method: 'POST' })
    setCollectRecords(await res.json())
    setCollectLoading(false)
  }

  useEffect(() => { if (tab === 'collect') loadCollect() }, [tab])

  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.room_number]))

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.phone.includes(q)
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const visibleCollect = collectFilter === 'pending'
    ? collectRecords.filter((r) => r.status === 'pending')
    : collectRecords

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.room_id || !form.move_in_date) {
      toast.error('Please fill all required fields.')
      return
    }
    if (!/^\d{10}$/.test(form.phone)) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }
    if (tenants.some((t) => t.phone === form.phone)) {
      toast.error('A tenant with this phone number already exists.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email || undefined, cot_number: form.cot_number || undefined, rent_amount: form.rent_amount || undefined }),
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
    const msg = encodeURIComponent(`Hi ${r.tenant_name}, your rent of ${fmt(r.amount)} is due on ${dueStr}. Please pay at the earliest. - ${orgName}`)
    window.open(`https://wa.me/91${r.phone}?text=${msg}`, '_blank')
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const pendingCount = collectRecords.filter((r) => r.status === 'pending').length

  const addTenantDialog = (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
      <DialogTrigger asChild>
        <button className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors fixed bottom-24 right-4 z-40 lg:hidden">
          <Plus className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone <span className="text-red-500">*</span></label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit number"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Room <span className="text-red-500">*</span></label>
              <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                <option value="">Select room</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cot</label>
              <input value={form.cot_number} onChange={(e) => set('cot_number', e.target.value)} placeholder="e.g. C1"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rent (₹)</label>
            <input type="number" min="0" value={form.rent_amount} onChange={(e) => set('rent_amount', e.target.value)} placeholder="e.g. 5000"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Move-in Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.move_in_date} onChange={(e) => set('move_in_date', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move-out Date</label>
              <input type="date" value={form.move_out_date ?? ''} onChange={(e) => set('move_out_date', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setOpen(false)}
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
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
          <h1 className="text-2xl font-bold dark:text-white">Tenants</h1>
          {tab === 'tenants' && (
            <button onClick={() => setSearch((s) => s ? '' : ' ')}
              className="w-9 h-9 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500">
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
          <button onClick={() => setTab('tenants')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'tenants' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}>
            All Tenants
          </button>
          <button onClick={() => setTab('collect')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === 'collect' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}>
            Collect Rent
            {pendingCount > 0 && tab !== 'collect' && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        </div>

        {/* ── All Tenants tab ── */}
        {tab === 'tenants' && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search.trim()}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenants..."
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              {([['all', 'All'], ['active', 'Active'], ['vacated', 'Exited']] as [StatusFilter, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === val ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-sm">No tenants found.</p>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((t) => (
                  <button key={t.id} onClick={() => router.push(`/dashboard/tenants/${t.id}`)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:bg-gray-50">
                    <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 dark:text-white">
                      {initials(t.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm dark:text-white">{t.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />Room {roomMap[t.room_id] ?? '—'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />{fmtDateLong(t.move_in_date)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.status === 'active' ? 'Active' : 'Exited'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {addTenantDialog}
          </>
        )}

        {/* ── Collect Rent tab ── */}
        {tab === 'collect' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setCollectFilter('pending')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${collectFilter === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}>
                  Pending {pendingCount > 0 && <span className="ml-1 text-red-500">({pendingCount})</span>}
                </button>
                <button onClick={() => setCollectFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${collectFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}>
                  All
                </button>
              </div>
              <button onClick={loadCollect} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
            </div>

            {collectLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
              </div>
            ) : visibleCollect.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-sm">
                {collectFilter === 'pending' ? 'All rent collected this month!' : 'No records for this month.'}
              </p>
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
                        <p className="text-xs text-gray-500">Room {r.room_number} · {fmt(r.amount)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {r.status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Due {new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setPayDialog({ id: r.id, name: r.tenant_name }); setPayMode('cash') }}
                            className="flex items-center gap-1.5 text-xs bg-black text-white font-semibold px-3 py-1.5 rounded-full hover:bg-gray-800">
                            <CheckCircle className="w-3.5 h-3.5" />Mark Paid
                          </button>
                          <button onClick={() => sendWhatsApp(r)}
                            className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600">
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
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Tenants</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage tenants and collect rent.</p>
          </div>
          {tab === 'tenants' && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <Plus className="w-4 h-4" />Add Tenant
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
                      <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone <span className="text-red-500">*</span></label>
                      <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit number"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Room <span className="text-red-500">*</span></label>
                      <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                        <option value="">Select room</option>
                        {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cot</label>
                      <input value={form.cot_number} onChange={(e) => set('cot_number', e.target.value)} placeholder="e.g. C1"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Rent (₹)</label>
                    <input type="number" min="0" value={form.rent_amount} onChange={(e) => set('rent_amount', e.target.value)} placeholder="e.g. 5000"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Move-in Date <span className="text-red-500">*</span></label>
                      <input type="date" value={form.move_in_date} onChange={(e) => set('move_in_date', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Move-out Date</label>
                      <input type="date" value={form.move_out_date ?? ''} onChange={(e) => set('move_out_date', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setOpen(false)}
                      className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
          <button onClick={() => setTab('tenants')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'tenants' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
            All Tenants
          </button>
          <button onClick={() => setTab('collect')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === 'collect' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
            Collect Rent
            {pendingCount > 0 && tab !== 'collect' && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        </div>

        {/* All Tenants */}
        {tab === 'tenants' && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-45 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="vacated">Vacated</option>
              </select>
            </div>
            {loading ? <TableSkeleton cols={7} hasAvatar /> : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
                <table className="w-full min-w-175 text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {['NAME', 'PHONE NUMBER', 'ROOM', 'COT', 'MOVE-IN DATE', 'STATUS', ''].map((h, i) => (
                        <th key={i} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No tenants found.</td></tr>
                    ) : filtered.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">{initials(t.name)}</div>
                            <span className="font-medium">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500">{t.phone}</td>
                        <td className="px-5 py-4">{roomMap[t.room_id] ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-500">{t.cot_number ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-500">{fmtDateLong(t.move_in_date)}</td>
                        <td className="px-5 py-4">
                          <span className={t.status === 'active' ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full' : 'bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full'}>
                            {t.status === 'active' ? 'Active' : 'Vacated'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => router.push(`/dashboard/tenants/${t.id}`)} className="text-gray-400 hover:text-gray-700">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                    Showing {filtered.length} of {tenants.length} tenants
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Collect Rent */}
        {tab === 'collect' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setCollectFilter('pending')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${collectFilter === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                  Pending {pendingCount > 0 && <span className="ml-1 text-red-500">({pendingCount})</span>}
                </button>
                <button onClick={() => setCollectFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${collectFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                  All
                </button>
              </div>
              <button onClick={loadCollect} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
            </div>
            {collectLoading ? <TableSkeleton cols={5} /> : visibleCollect.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {collectFilter === 'pending' ? 'All rent collected this month!' : 'No records for this month.'}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
                <table className="w-full min-w-150 text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      {['TENANT', 'ROOM', 'PERIOD', 'AMOUNT', 'DUE DATE', 'STATUS', 'ACTION'].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCollect.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">{initials(r.tenant_name)}</div>
                            <div>
                              <p className="font-medium">{r.tenant_name}</p>
                              <p className="text-xs text-gray-400">{r.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500">{r.room_number}</td>
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDate(r.period_start)} – {fmtDate(r.period_end)}</td>
                        <td className="px-5 py-4 font-medium">{fmt(r.amount)}</td>
                        <td className="px-5 py-4 text-gray-500">{new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-5 py-4">
                          {r.status === 'paid'
                            ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Paid</span>
                            : <span className="bg-red-100 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full">Pending</span>}
                        </td>
                        <td className="px-5 py-4">
                          {r.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setPayDialog({ id: r.id, name: r.tenant_name }); setPayMode('cash') }}
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />Mark Paid
                              </button>
                              <button onClick={() => sendWhatsApp(r)} className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600">
                                <MessageCircle className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                  {collectRecords.filter((r) => r.status === 'paid').length} of {collectRecords.length} collected this month
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mark Paid dialog */}
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
    </>
  )
}
