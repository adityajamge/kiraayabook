'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

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
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Rooms</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all rooms and their capacity</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm) } }}>
          <DialogTrigger asChild>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Room
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle>
              {!editing && <p className="text-sm text-gray-500">Enter the details for the new room.</p>}
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.room_number}
                  onChange={(e) => set('room_number', e.target.value)}
                  placeholder="e.g. 101 or G-3"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Floor</label>
                <input
                  value={form.floor}
                  onChange={(e) => set('floor', e.target.value)}
                  placeholder="e.g. Ground, 1st Floor"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white"
                >
                  <option value="">Select type</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['ROOM NUMBER', 'FLOOR', 'TYPE', 'CAPACITY', 'OCCUPIED', 'VACANT', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium">{room.room_number}</td>
                  <td className="px-5 py-4 text-gray-500">{room.floor ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-500">{room.type ?? '—'}</td>
                  <td className="px-5 py-4">{room.capacity}</td>
                  <td className="px-5 py-4">{room.occupied}</td>
                  <td className="px-5 py-4">
                    <span className={room.vacant > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {room.vacant}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(room)}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
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
  )
}
