'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Eye, Search } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const emptyForm = { name: '', phone: '', email: '', room_id: '', cot_number: '', move_in_date: '', move_out_date: '' }

export default function TenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [tr, rr] = await Promise.all([fetch('/api/tenants'), fetch('/api/rooms')])
    setTenants(await tr.json())
    const roomData = await rr.json()
    setRooms(roomData.map((r: Room & { room_number: string }) => ({ id: r.id, room_number: r.room_number })))
    setLoading(false)
  }

  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.room_number]))

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.phone.includes(q)
    const matchRoom = !roomFilter || t.room_id === roomFilter
    const matchStatus = !statusFilter || t.status === statusFilter
    return matchSearch && matchRoom && matchStatus
  })

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.room_id || !form.move_in_date) return
    setSaving(true)
    await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: form.email || undefined, cot_number: form.cot_number || undefined }),
    })
    setSaving(false)
    setOpen(false)
    setForm(emptyForm)
    load()
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Tenants</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all your paying guests in one place.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm) }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Plus className="w-4 h-4" />
              Add Tenant
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone <span className="text-red-500">*</span></label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Room <span className="text-red-500">*</span></label>
                  <select value={form.room_id} onChange={(e) => set('room_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    <option value="">Select room</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>Room {r.room_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cot</label>
                  <input value={form.cot_number} onChange={(e) => set('cot_number', e.target.value)} placeholder="e.g. C1, Top Bunk"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Move-in Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.move_in_date} onChange={(e) => set('move_in_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Move-out Date</label>
                  <input type="date" value={form.move_out_date} onChange={(e) => set('move_out_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-45 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400" />
        </div>
        <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
          <option value="">Room</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
          <option value="">Status</option>
          <option value="active">Active</option>
          <option value="vacated">Vacated</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={7} hasAvatar />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-175 text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['NAME', 'PHONE NUMBER', 'ROOM', 'COT', 'MOVE-IN DATE', 'STATUS', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No tenants found.</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials(t.name)}
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{t.phone}</td>
                    <td className="px-5 py-4">{roomMap[t.room_id] ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{t.cot_number ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(t.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={
                        t.status === 'active'
                          ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full'
                          : 'bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full'
                      }>
                        {t.status === 'active' ? 'Active' : 'Vacated'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => router.push(`/dashboard/tenants/${t.id}`)}
                        className="text-gray-400 hover:text-gray-700">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {tenants.length} tenants
            </div>
          )}
        </div>
      )}
    </div>
  )
}
