'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, AlertCircle, MessageCircle, BedDouble } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeletons'

interface Stats {
  total_rooms: number
  total_capacity: number
  total_occupied: number
  rent_collected: number
  rent_pending: number
}

interface PendingTenant {
  id: string
  tenant_id: string
  tenant_name: string
  phone: string
  room_number: string
  amount: number
  due_date: string
}

interface VacantRoom {
  id: string
  room_number: string
  floor: string | null
  vacant: number
}

interface DashboardData {
  stats: Stats
  pending_rent: PendingTenant[]
  vacant_rooms: VacantRoom[]
  month: string
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    fetch(`/api/dashboard?month=${month}`)
      .then((r) => r.json())
      .then(setData)
  }, [])

  const sendWhatsApp = (tenant: PendingTenant) => {
    const msg = encodeURIComponent(
      `Hi ${tenant.tenant_name}, your rent of ₹${tenant.amount} due on ${new Date(tenant.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} is pending. Please pay at the earliest. - KiraayaBook`
    )
    window.open(`https://wa.me/91${tenant.phone}?text=${msg}`, '_blank')
  }

  if (!data) return <DashboardSkeleton />

  const { stats, pending_rent, vacant_rooms } = data

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl lg:text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{"Here's what's happening at your PG today."}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total Rooms</span>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold">{stats.total_rooms}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Occupied Cots</span>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <BedDouble className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold">
            {stats.total_occupied}
            <span className="text-base lg:text-lg text-gray-400 font-normal">/{stats.total_capacity}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">occupied</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Rent Collected</span>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">₹</span>
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold">{fmt(stats.rent_collected)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Pending Rent</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-xl lg:text-3xl font-bold text-red-600">{fmt(stats.rent_pending)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending rent */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Pending Rent</h2>
              <p className="text-xs text-gray-400 mt-0.5">{"Tenants who haven't paid this month"}</p>
            </div>
            {pending_rent.length > 0 && (
              <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-1 rounded-full">
                {pending_rent.length} pending
              </span>
            )}
          </div>

          {pending_rent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All rent collected!</p>
          ) : (
            <div className="space-y-2">
              {pending_rent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials(t.tenant_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.tenant_name}</p>
                    <p className="text-xs text-gray-400">Room {t.room_number}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600 shrink-0">{fmt(t.amount)}</span>
                  <button
                    onClick={() => sendWhatsApp(t)}
                    className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shrink-0"
                    title="Send WhatsApp reminder"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vacant rooms */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Vacant Rooms</h2>
              <p className="text-xs text-gray-400 mt-0.5">Rooms with empty capacity</p>
            </div>
            {vacant_rooms.length > 0 && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {vacant_rooms.length} rooms
              </span>
            )}
          </div>

          {vacant_rooms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All rooms fully occupied!</p>
          ) : (
            <div className="space-y-2">
              {vacant_rooms.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Room {r.room_number}</p>
                    {r.floor && <p className="text-xs text-gray-400">Floor {r.floor}</p>}
                  </div>
                  <span className="text-sm font-semibold text-green-600 shrink-0">
                    {r.vacant} {r.vacant === 1 ? 'spot' : 'spots'} free
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
