'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, DoorOpen, Search } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Room {
  id: string
  room_number: string
  floor: string | null
  type: string | null
  capacity: number
  occupied: number
  vacant: number
}

const emptyForm = { room_number: '', capacity: '', floor: '', type: '' }

type Filter = 'all' | 'occupied' | 'vacant'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const r = await fetch('/api/rooms')
    setRooms(await r.json())
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (room: Room) => {
    setEditing(room)
    setForm({ room_number: room.room_number, capacity: String(room.capacity), floor: room.floor ?? '', type: room.type ?? '' })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.room_number || !form.capacity) return
    setSaving(true)
    const url = editing ? `/api/rooms/${editing.id}` : '/api/rooms'
    await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
    })
    setSaving(false)
    setOpen(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? This will fail if there are active tenants.')) return
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    load()
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const filtered = rooms.filter((r) => {
    const matchFilter = filter === 'all' || (filter === 'vacant' ? r.vacant > 0 : r.vacant === 0)
    const matchSearch = !search || r.room_number.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const addDialog = (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm) } }}>
      <DialogTrigger asChild>
        <button onClick={openAdd} className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Room Number <span className="text-red-500">*</span></label>
            <input value={form.room_number} onChange={(e) => set('room_number', e.target.value)} placeholder="e.g. 101"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Capacity <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="e.g. 4"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Floor</label>
            <input value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="e.g. Ground, 1st Floor"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white">
              <option value="">Select type</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setOpen(false)}
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
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
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Rooms</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen((v) => !v)}
              className="w-9 h-9 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500">
              <Search className="w-4 h-4" />
            </button>
            {addDialog}
          </div>
        </div>

        {searchOpen && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms..."
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white" autoFocus />
          </div>
        )}

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'occupied', 'vacant'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">No rooms found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((room) => (
              <div key={room.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <DoorOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="font-bold text-base dark:text-white mb-1">Room {room.room_number}</p>
                {room.floor && <p className="text-xs text-gray-400 mb-2">{room.floor}</p>}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${room.vacant === 0 ? 'bg-green-100 text-green-700' : 'bg-black text-white dark:bg-gray-700'}`}>
                    {room.vacant === 0 ? 'Occupied' : 'Vacant'}
                  </span>
                  <button onClick={() => openEdit(room)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rooms</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage all rooms and their capacity</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm) } }}>
            <DialogTrigger asChild>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Plus className="w-4 h-4" />Add Room
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Room Number <span className="text-red-500">*</span></label>
                  <input value={form.room_number} onChange={(e) => set('room_number', e.target.value)} placeholder="e.g. 101"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Capacity <span className="text-red-500">*</span></label>
                  <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="e.g. 4"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Floor</label>
                  <input value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="e.g. Ground"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => set('type', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select type</option>
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No rooms yet. Add your first room.</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['ROOM NUMBER', 'FLOOR', 'TYPE', 'CAPACITY', 'OCCUPIED', 'VACANT', 'ACTIONS'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 font-medium">{room.room_number}</td>
                    <td className="px-5 py-4 text-gray-500">{room.floor ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{room.type ?? '—'}</td>
                    <td className="px-5 py-4">{room.capacity}</td>
                    <td className="px-5 py-4">{room.occupied}</td>
                    <td className="px-5 py-4">
                      <span className={room.vacant > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>{room.vacant}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(room)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm">
                          <Pencil className="w-3.5 h-3.5" />Edit
                        </button>
                        <button onClick={() => handleDelete(room.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm">
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
