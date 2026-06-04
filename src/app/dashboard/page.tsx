'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, AlertCircle, MessageCircle, BedDouble, MapPin } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeletons'
import Image from 'next/image'

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

interface OrgSettings {
  name: string
  address: string | null
  logo_url: string | null
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  if (h < 21) return 'Good Evening'
  return 'Good Night'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [org, setOrg] = useState<OrgSettings | null>(null)

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    Promise.all([
      fetch(`/api/dashboard?month=${month}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([dash, settings]) => {
      setData(dash)
      setOrg(settings)
    })
  }, [])

  const sendWhatsApp = (tenant: PendingTenant) => {
    const msg = encodeURIComponent(
      `Hi ${tenant.tenant_name}, your rent of ₹${tenant.amount} due on ${new Date(tenant.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} is pending. Please pay at the earliest. - KiraayaBook`
    )
    window.open(`https://wa.me/91${tenant.phone}?text=${msg}`, '_blank')
  }

  if (!data) return <DashboardSkeleton />

  const { stats, pending_rent, vacant_rooms } = data
  const occupiedRooms = stats.total_rooms - vacant_rooms.length
  const total = stats.rent_collected + stats.rent_pending
  const pct = total > 0 ? Math.round((stats.rent_collected / total) * 100) : 0
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        {/* PG name + logo */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-bold dark:text-white">{org?.name ?? 'Your PG'}</p>
            {org?.address && (
              <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-45">{org.address}</span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
            {org?.logo_url ? (
              <Image src={org.logo_url} alt="logo" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Greeting banner */}
        <div className="bg-black dark:bg-gray-800 text-white rounded-2xl p-5 mb-4">
          <p className="text-xl font-bold">{getGreeting()}, Admin 👋</p>
          <p className="text-sm text-gray-400 mt-1">{today}</p>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold dark:text-white">{stats.total_rooms}</p>
            <p className="text-[11px] text-gray-500 mt-1">Total Rooms</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold dark:text-white">{occupiedRooms}</p>
            <p className="text-[11px] text-gray-500 mt-1">Occupied</p>
          </div>
          <div className="bg-black dark:bg-gray-700 text-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold">{vacant_rooms.length}</p>
            <p className="text-[11px] text-gray-400 mt-1">Vacant</p>
          </div>
        </div>

        {/* Rent Overview */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-3 shadow-sm">
          <h3 className="font-semibold dark:text-white">Rent Overview</h3>
          <p className="text-xs text-gray-500 mb-3">{monthLabel}</p>
          <div className="flex justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-xl font-bold dark:text-white">{fmt(stats.rent_collected)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Pending Rent</p>
              <p className="text-xl font-bold text-red-500">{fmt(stats.rent_pending)}</p>
            </div>
          </div>
          {total > 0 && (
            <>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div className="bg-black dark:bg-white rounded-full h-2.5 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-black dark:bg-white rounded-full inline-block" />
                  {pct}% Collected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-400 rounded-full inline-block" />
                  {100 - pct}% Pending
                </span>
              </div>
            </>
          )}
        </div>

        {/* Pending Rent summary card */}
        {stats.rent_pending > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm dark:text-white">Pending Rent</p>
                <p className="text-xs text-gray-500">{pending_rent.length} payment{pending_rent.length !== 1 ? 's' : ''} awaiting</p>
              </div>
            </div>
            <span className="font-bold text-red-500">{fmt(stats.rent_pending)}</span>
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{"Here's what's happening at your PG today."}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Total Rooms</span>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.total_rooms}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Occupied Cots</span>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <BedDouble className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              {stats.total_occupied}
              <span className="text-lg text-gray-400 font-normal">/{stats.total_capacity}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">occupied</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Rent Collected</span>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 font-bold text-sm">₹</span>
              </div>
            </div>
            <p className="text-3xl font-bold">{fmt(stats.rent_collected)}</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Pending Rent</span>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600">{fmt(stats.rent_pending)}</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
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
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="w-9 h-9 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
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
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Vacant Rooms</h2>
                <p className="text-xs text-gray-400 mt-0.5">Rooms with empty capacity</p>
              </div>
              {vacant_rooms.length > 0 && (
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  {vacant_rooms.length} rooms
                </span>
              )}
            </div>
            {vacant_rooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">All rooms fully occupied!</p>
            ) : (
              <div className="space-y-2">
                {vacant_rooms.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
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
    </>
  )
}
