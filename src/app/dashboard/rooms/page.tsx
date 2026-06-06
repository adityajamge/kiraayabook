'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, DoorOpen, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'

interface Room {
  id: string
  room_number: string
  floor: string | null
  type: string | null
  capacity: number
  occupied: number
  vacant: number
}

interface RoomTenant {
  id: string
  name: string
  phone: string
  cot_number: string | null
  status: string
}

const emptyForm = { room_number: '', capacity: '', floor: '', type: '' }

type Filter = 'all' | 'occupied' | 'vacant'

export default function RoomsPage() {
  const t = useT()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [viewRoom, setViewRoom] = useState<Room | null>(null)
  const [roomTenants, setRoomTenants] = useState<RoomTenant[]>([])
  const [viewLoading, setViewLoading] = useState(false)

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
    const trimmedNumber = form.room_number.trim()
    if (!trimmedNumber || !form.capacity) {
      toast.error('Please fill all required fields.')
      return
    }
    const cap = Number(form.capacity)
    if (isNaN(cap) || cap < 1 || cap > 20) {
      toast.error('Capacity must be between 1 and 20.')
      return
    }
    setSaving(true)
    const url = editing ? `/api/rooms/${editing.id}` : '/api/rooms'
    const res = await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, room_number: trimmedNumber, capacity: cap }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Failed to save room.')
      setSaving(false)
      return
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? This will fail if there are active tenants.')) return
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    load()
  }

  const openView = async (room: Room) => {
    setViewRoom(room)
    setViewLoading(true)
    const res = await fetch(`/api/tenants?room_id=${room.id}`)
    const data: RoomTenant[] = await res.json()
    setRoomTenants(data.filter((t) => t.status === 'active'))
    setViewLoading(false)
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const filtered = rooms.filter((r) => {
    const matchFilter = filter === 'all' || (filter === 'vacant' ? r.vacant > 0 : r.vacant === 0)
    const matchSearch = !search || r.room_number.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const roomForm = (
    <div className="space-y-4 mt-2">
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.roomNumber')} <span className="text-red-500">*</span></label>
        <input maxLength={10} value={form.room_number} onChange={(e) => set('room_number', e.target.value)} placeholder="e.g. 101"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.capacity')} <span className="text-red-500">*</span></label>
        <input type="number" min="1" max="20" inputMode="numeric" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="e.g. 4"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.floor')}</label>
        <input maxLength={50} value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="e.g. Ground, 1st Floor"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.type')}</label>
        <select value={form.type} onChange={(e) => set('type', e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white">
          <option value="">{t('rooms.selectType')}</option>
          <option value="AC">AC</option>
          <option value="Non-AC">Non-AC</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => setOpen(false)}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
          {saving ? t('rooms.saving') : t('rooms.save')}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{t('rooms.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen((v) => !v)}
              className="w-9 h-9 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500">
              <Search className="w-4 h-4" />
            </button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm) } }}>
              <DialogTrigger asChild>
                <button onClick={openAdd} className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editing ? t('rooms.editRoom') : t('rooms.addRoom')}</DialogTitle>
                </DialogHeader>
                {roomForm}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {searchOpen && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('rooms.searchPlaceholder')}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white" autoFocus />
          </div>
        )}

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4">
          {([['all', t('rooms.filterAll')], ['occupied', t('rooms.filterOccupied')], ['vacant', t('rooms.filterVacant')]] as [Filter, string][]).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {label}
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
          <p className="text-center py-12 text-gray-400 text-sm">{t('rooms.noRoomsFound')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((room) => (
              <button key={room.id} onClick={() => openView(room)}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm text-left active:bg-gray-50 dark:active:bg-gray-800 w-full">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <DoorOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="font-bold text-base dark:text-white mb-1">{t('common.room')} {room.room_number}</p>
                {room.floor && <p className="text-xs text-gray-400 mb-2">{room.floor}</p>}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${room.vacant === 0 ? 'bg-green-100 text-green-700' : 'bg-black text-white dark:bg-gray-700'}`}>
                    {room.vacant === 0 ? t('rooms.full') : t('rooms.free', { count: room.vacant })}
                  </span>
                  <span onClick={(e) => { e.stopPropagation(); openEdit(room) }}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('rooms.title')}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('rooms.subtitle')}</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm) } }}>
            <DialogTrigger asChild>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Plus className="w-4 h-4" />{t('rooms.addRoom')}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{editing ? t('rooms.editRoom') : t('rooms.addRoom')}</DialogTitle></DialogHeader>
              {roomForm}
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">{t('rooms.noRooms')}</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {[t('rooms.roomNumber'), t('rooms.floor'), t('rooms.type'), t('rooms.capacity'), t('rooms.occupied'), t('rooms.vacant'), t('rooms.actions')].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => openView(room)}>
                    <td className="px-5 py-4 font-medium dark:text-white">{room.room_number}</td>
                    <td className="px-5 py-4 text-gray-500">{room.floor ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{room.type ?? '—'}</td>
                    <td className="px-5 py-4">{room.capacity}</td>
                    <td className="px-5 py-4">{room.occupied}</td>
                    <td className="px-5 py-4">
                      <span className={room.vacant > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>{room.vacant}</span>
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openView(room)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm">
                          <Users className="w-3.5 h-3.5" />{t('rooms.view')}
                        </button>
                        <button onClick={() => openEdit(room)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm">
                          <Pencil className="w-3.5 h-3.5" />{t('common.edit')}
                        </button>
                        <button onClick={() => handleDelete(room.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm">
                          <Trash2 className="w-3.5 h-3.5" />{t('common.delete')}
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

      {/* ── Room tenants dialog ── */}
      <Dialog open={!!viewRoom} onOpenChange={(v) => { if (!v) { setViewRoom(null); setRoomTenants([]) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.room')} {viewRoom?.room_number}</DialogTitle>
          </DialogHeader>
          {viewRoom && (
            <p className="text-xs text-gray-400 -mt-2">
              {[viewRoom.floor, viewRoom.type, `${t('rooms.capacity')} ${viewRoom.capacity}`].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-1">
            {viewLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : roomTenants.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <DoorOpen className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">{t('rooms.noActiveTenants')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roomTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-9 h-9 bg-black dark:bg-gray-700 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      {tenant.cot_number ?? '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold dark:text-white truncate">{tenant.name}</p>
                      <p className="text-xs text-gray-400">{tenant.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
