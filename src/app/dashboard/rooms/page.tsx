'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, DoorOpen, Search, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
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
const emptyBulkForm = { from: '', to: '', capacity: '', floor: '', type: '' }
type Filter = 'all' | 'occupied' | 'vacant'
type AddTab = 'single' | 'bulk'

export default function RoomsPage() {
  const t = useT()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [addTab, setAddTab] = useState<AddTab>('single')
  const [bulkForm, setBulkForm] = useState(emptyBulkForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [viewRoom, setViewRoom] = useState<Room | null>(null)
  const [roomTenants, setRoomTenants] = useState<RoomTenant[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const r = await fetch('/api/rooms?limit=200')
    setRooms((await r.json()).data ?? [])
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setAddTab('single'); setBulkForm(emptyBulkForm); setOpen(true) }

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

  const handleBulkSave = async () => {
    const fromNum = parseInt(bulkForm.from, 10)
    const toNum = parseInt(bulkForm.to, 10)
    const cap = Number(bulkForm.capacity)
    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      toast.error('Enter a valid range — From must be ≤ To.')
      return
    }
    if (toNum - fromNum > 199) {
      toast.error('You can bulk-add up to 200 rooms at once.')
      return
    }
    if (isNaN(cap) || cap < 1 || cap > 20) {
      toast.error('Capacity must be between 1 and 20.')
      return
    }
    const roomsList = []
    for (let i = fromNum; i <= toNum; i++) {
      roomsList.push({ room_number: String(i), capacity: cap, floor: bulkForm.floor || null, type: bulkForm.type || null })
    }
    setSaving(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms: roomsList }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Failed to save rooms.')
      setSaving(false)
      return
    }
    setSaving(false)
    setOpen(false)
    toast.success(`${roomsList.length} rooms added.`)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? This will fail if there are active tenants.')) return
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    setViewRoom(null)
    setRoomTenants([])
    load()
  }

  const openView = async (room: Room) => {
    setViewRoom(room)
    setViewLoading(true)
    const res = await fetch(`/api/tenants?room_id=${room.id}&limit=50`)
    const json = await res.json()
    const data: RoomTenant[] = json.data ?? []
    setRoomTenants(data.filter((ten) => ten.status === 'active'))
    setViewLoading(false)
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setBulk = (k: string, v: string) => setBulkForm((f) => ({ ...f, [k]: v }))

  const filtered = useMemo(
    () => rooms.filter((r) => {
      const matchFilter = filter === 'all' || (filter === 'vacant' ? r.vacant > 0 : r.vacant === 0)
      const matchSearch = !search || r.room_number.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    }),
    [rooms, filter, search]
  )

  const { totalBeds, occupiedBeds, vacantBeds, occupancyPct } = useMemo(() => {
    const totalBeds    = rooms.reduce((s, r) => s + r.capacity, 0)
    const occupiedBeds = rooms.reduce((s, r) => s + r.occupied, 0)
    const vacantBeds   = rooms.reduce((s, r) => s + r.vacant, 0)
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
    return { totalBeds, occupiedBeds, vacantBeds, occupancyPct }
  }, [rooms])

  const fromNum = parseInt(bulkForm.from, 10)
  const toNum = parseInt(bulkForm.to, 10)
  const bulkCount = !isNaN(fromNum) && !isNaN(toNum) && toNum >= fromNum ? toNum - fromNum + 1 : 0

  const bulkRoomForm = (
    <div className="space-y-4 mt-2">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">From <span className="text-red-500">*</span></label>
          <input
            type="number" inputMode="numeric"
            value={bulkForm.from}
            onChange={(e) => setBulk('from', e.target.value)}
            placeholder="101"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">To <span className="text-red-500">*</span></label>
          <input
            type="number" inputMode="numeric"
            value={bulkForm.to}
            onChange={(e) => setBulk('to', e.target.value)}
            placeholder="120"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
      {bulkCount > 0 && (
        <p className="text-xs text-blue-600 dark:text-blue-400 -mt-1">
          {bulkCount} room{bulkCount > 1 ? 's' : ''} will be created ({bulkForm.from} to {bulkForm.to})
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.capacity')} <span className="text-red-500">*</span></label>
        <input
          type="number" min="1" max="20" inputMode="numeric"
          value={bulkForm.capacity}
          onChange={(e) => setBulk('capacity', e.target.value)}
          placeholder="e.g. 4"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.floor')}</label>
        <input
          maxLength={50}
          value={bulkForm.floor}
          onChange={(e) => setBulk('floor', e.target.value)}
          placeholder="e.g. Ground, 1st Floor"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.type')}</label>
        <select
          value={bulkForm.type}
          onChange={(e) => setBulk('type', e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="">{t('rooms.selectType')}</option>
          <option value="AC">AC</option>
          <option value="Non-AC">Non-AC</option>
        </select>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleBulkSave}
          disabled={saving || bulkCount === 0}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Adding…' : bulkCount > 0 ? `Add ${bulkCount} Rooms` : 'Add Rooms'}
        </button>
      </div>
    </div>
  )

  const roomForm = (
    <div className="space-y-4 mt-2">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t('rooms.roomNumber')} <span className="text-red-500">*</span>
        </label>
        <input
          maxLength={10}
          value={form.room_number}
          onChange={(e) => set('room_number', e.target.value)}
          placeholder="e.g. 101"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t('rooms.capacity')} <span className="text-red-500">*</span>
        </label>
        <input
          type="number" min="1" max="20" inputMode="numeric"
          value={form.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          placeholder="e.g. 4"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.floor')}</label>
        <input
          maxLength={50}
          value={form.floor}
          onChange={(e) => set('floor', e.target.value)}
          placeholder="e.g. Ground, 1st Floor"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('rooms.type')}</label>
        <select
          value={form.type}
          onChange={(e) => set('type', e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="">{t('rooms.selectType')}</option>
          <option value="AC">AC</option>
          <option value="Non-AC">Non-AC</option>
        </select>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? t('rooms.saving') : t('rooms.save')}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('rooms.title')}</h1>
          {/* Fixed height prevents heading from shifting when subtitle loads */}
          <div className="h-5 mt-0.5">
            {loading ? (
              <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : rooms.length > 0 ? (
              <p className="text-sm text-gray-500">
                {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · {vacantBeds} {vacantBeds === 1 ? 'bed' : 'beds'} free
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch('') }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              searchOpen
                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); setAddTab('single'); setBulkForm(emptyBulkForm) } }}>
            <DialogTrigger asChild>
              <button
                onClick={openAdd}
                className="w-9 h-9 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? t('rooms.editRoom') : t('rooms.addRoom')}</DialogTitle>
              </DialogHeader>
              {!editing && (
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mt-1">
                  <button
                    onClick={() => setAddTab('single')}
                    className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                      addTab === 'single'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Single Room
                  </button>
                  <button
                    onClick={() => setAddTab('bulk')}
                    className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                      addTab === 'bulk'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Bulk Add
                  </button>
                </div>
              )}
              {(!editing && addTab === 'bulk') ? bulkRoomForm : roomForm}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Occupancy summary card — always rendered to prevent layout shift */}
      <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4 mb-5">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="text-center space-y-1.5">
                <div className="h-7 w-10 mx-auto bg-gray-700 rounded animate-pulse" />
                <div className="h-2.5 w-12 mx-auto bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{rooms.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Rooms</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{occupiedBeds}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Occupied</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{vacantBeds}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Free</p>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-400 rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 text-center">{occupancyPct}% occupancy rate</p>
          </>
        ) : null}
      </div>

      {/* Search input */}
      {searchOpen && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rooms.searchPlaceholder')}
            autoFocus
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white"
          />
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4">
        {([['all', t('rooms.filterAll')], ['occupied', t('rooms.filterOccupied')], ['vacant', t('rooms.filterVacant')]] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <DoorOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">No Rooms Yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
            Add your first room to start tracking tenants and bed occupancy.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" /> Add First Room
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">{t('rooms.noRoomsFound')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((room) => {
            const pct = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0
            const isFull = room.vacant === 0
            return (
              <button
                key={room.id}
                onClick={() => openView(room)}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm text-left active:scale-[0.97] transition-all w-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isFull ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <DoorOpen className={`w-5 h-5 ${isFull ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); openEdit(room) }}
                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </span>
                </div>

                <p className="font-bold text-[15px] dark:text-white leading-tight">
                  {t('common.room')} {room.room_number}
                </p>

                <div className="flex items-center gap-1.5 mt-1 mb-3 min-h-4.5">
                  {room.floor && (
                    <span className="text-[11px] text-gray-400 truncate">Floor: {room.floor}</span>
                  )}
                  {room.floor && room.type && <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>}
                  {room.type && (
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                      room.type === 'AC'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>{room.type}</span>
                  )}
                </div>

                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-2">
                  <div
                    className={`rounded-full h-1.5 transition-all ${isFull ? 'bg-green-500' : 'bg-gray-900 dark:bg-gray-200'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Capacity: {room.capacity} beds
                  {room.vacant > 0 && (
                    <span className="text-gray-900 dark:text-gray-200 font-medium"> · {room.vacant} free</span>
                  )}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Room detail dialog */}
      <Dialog open={!!viewRoom} onOpenChange={(v) => { if (!v) { setViewRoom(null); setRoomTenants([]) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.room')} {viewRoom?.room_number}</DialogTitle>
          </DialogHeader>
          {viewRoom && (
            <p className="text-xs text-gray-400 -mt-2">
              {[
                viewRoom.floor && `Floor: ${viewRoom.floor}`,
                viewRoom.type,
                `Capacity: ${viewRoom.capacity}`,
              ].filter(Boolean).join(' · ')}
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
                  <button
                    key={tenant.id}
                    onClick={() => router.push(`/dashboard/tenants/${tenant.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-left active:scale-[0.98] transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-gray-700 dark:text-gray-300">
                      {tenant.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold dark:text-white truncate">{tenant.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {tenant.cot_number && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full shrink-0">
                            Cot {tenant.cot_number}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 truncate">{tenant.phone}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {viewRoom && (
            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { const r = viewRoom; setViewRoom(null); setRoomTenants([]); openEdit(r) }}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 text-sm font-semibold py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
              </button>
              <button
                onClick={() => handleDelete(viewRoom.id)}
                className="flex items-center justify-center gap-1.5 border border-red-200 dark:border-red-900/50 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
