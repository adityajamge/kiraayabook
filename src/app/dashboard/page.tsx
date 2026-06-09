'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, AlertCircle, MessageCircle, BedDouble, MapPin, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { DashboardSkeleton } from '@/components/skeletons'
import Image from 'next/image'
import { useT } from '@/lib/i18n'

interface Stats {
  total_rooms: number
  total_capacity: number
  total_occupied: number
  rent_collected: number
  rent_pending: number
  expenses_total: number
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

export default function DashboardPage() {
  const t = useT()
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

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.greetingMorning')
    if (h < 17) return t('dashboard.greetingAfternoon')
    if (h < 21) return t('dashboard.greetingEvening')
    return t('dashboard.greetingNight')
  }

  const sendWhatsApp = (tenant: PendingTenant) => {
    const pgName = org?.name ?? 'Your PG'
    const date = new Date(tenant.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const msg = encodeURIComponent(t('whatsapp.pendingRent', { name: tenant.tenant_name, amount: tenant.amount, date, pgName }))
    window.open(`https://wa.me/91${tenant.phone}?text=${msg}`, '_blank')
  }

  if (!data) return <DashboardSkeleton />

  const { stats, pending_rent, vacant_rooms } = data
  const occupiedRooms = stats.total_rooms - vacant_rooms.length
  const total = stats.rent_collected + stats.rent_pending
  const pct = total > 0 ? Math.round((stats.rent_collected / total) * 100) : 0
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const net = stats.rent_collected - stats.expenses_total

  return (
    <div className="space-y-4 max-w-2xl lg:max-w-none">
      {/* PG identity bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold dark:text-white">{org?.name ?? 'Your PG'}</p>
          {org?.address && (
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-56">{org.address}</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
          {org?.logo_url ? (
            <Image src={org.logo_url} alt="logo" width={40} height={40} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Greeting banner */}
      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-2xl p-5">
        <p className="text-xl font-bold">{getGreeting()}, {t('dashboard.admin')} 👋</p>
        <p className="text-sm text-gray-400 mt-1">{today}</p>
      </div>

      {/* 3 occupancy chips */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-2xl font-bold dark:text-white">{stats.total_rooms}</p>
          <p className="text-[11px] text-gray-500 mt-1">{t('dashboard.totalRooms')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-2xl font-bold dark:text-white">{occupiedRooms}</p>
          <p className="text-[11px] text-gray-500 mt-1">{t('dashboard.occupied')}</p>
        </div>
        <div className="bg-gray-900 dark:bg-gray-700 text-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-2xl font-bold">{vacant_rooms.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">{t('dashboard.vacant')}</p>
        </div>
      </div>

      {/* Rent overview */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold dark:text-white">{t('dashboard.rentOverview')}</h3>
            <p className="text-xs text-gray-500">{monthLabel}</p>
          </div>
          {total > 0 && (
            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
              {pct}% collected
            </span>
          )}
        </div>
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">{t('dashboard.collected')}</p>
            <p className="text-xl font-bold text-green-600">{fmt(stats.rent_collected)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{t('dashboard.pendingRent')}</p>
            <p className="text-xl font-bold text-red-500">{fmt(stats.rent_pending)}</p>
          </div>
        </div>
        {total > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Expenses + Net Income */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
            <Receipt className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.expenses')}</p>
          <p className="text-xl font-bold text-orange-500">{fmt(stats.expenses_total)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{monthLabel}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${net >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {net >= 0
              ? <TrendingUp className="w-4 h-4 text-green-500" />
              : <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.netIncome')}</p>
          <p className={`text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(net)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('dashboard.collectedMinusExpenses')}</p>
        </div>
      </div>

      {/* Pending rent list */}
      {pending_rent.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold dark:text-white">{t('dashboard.pendingRentTitle')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.pendingRentSubtitle')}</p>
            </div>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
              {pending_rent.length}
            </span>
          </div>
          <div className="space-y-1">
            {pending_rent.map((tenant) => (
              <div key={tenant.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 dark:text-white">
                  {initials(tenant.tenant_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white truncate">{tenant.tenant_name}</p>
                  <p className="text-xs text-gray-400">{t('common.room')} {tenant.room_number}</p>
                </div>
                <span className="text-sm font-semibold text-red-600 shrink-0">{fmt(tenant.amount)}</span>
                <button
                  onClick={() => sendWhatsApp(tenant)}
                  className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vacant rooms (only shown when there are vacancies) */}
      {vacant_rooms.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold dark:text-white">{t('dashboard.vacantRooms')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.vacantRoomsSubtitle')}</p>
            </div>
            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
              {vacant_rooms.length}
            </span>
          </div>
          <div className="space-y-1">
            {vacant_rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white">{t('common.room')} {r.room_number}</p>
                  {r.floor && <p className="text-xs text-gray-400">{t('dashboard.floorLabel')} {r.floor}</p>}
                </div>
                <span className="text-sm font-semibold text-green-600 shrink-0">
                  {r.vacant === 1 ? t('dashboard.spotFree', { count: r.vacant }) : t('dashboard.spotsFree', { count: r.vacant })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-collected / fully-occupied happy states */}
      {pending_rent.length === 0 && stats.rent_pending === 0 && total > 0 && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
          <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">{t('dashboard.allCollected')}</p>
        </div>
      )}
    </div>
  )
}
