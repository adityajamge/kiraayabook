'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Receipt, TrendingDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  created_at: string
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function fmtDay(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const today = new Date().toISOString().slice(0, 10)

export default function ExpensesPage() {
  const t = useT()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [month])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/expenses?limit=500')
    const all: Expense[] = (await res.json()).data ?? []
    setExpenses(all.filter((e) => e.date.slice(0, 7) === month))
    setLoading(false)
  }

  const openAdd = () => {
    setDescription('')
    setAmount('')
    setDate(today)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!description.trim() || !amount || !date) {
      toast.error('Please fill all fields.')
      return
    }
    const amt = Number(amount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description.trim(), amount: amt, date }),
    })
    setSaving(false)
    if (!res.ok) { toast.error('Failed to save.'); return }
    setOpen(false)
    load()
    toast.success('Expense added.')
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Group expenses by date for visual separation
  const grouped: Record<string, Expense[]> = {}
  expenses.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('expenses.title')}</h1>
        <button
          onClick={openAdd}
          className="w-9 h-9 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setMonth(addMonths(month, -1))}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-base dark:text-white min-w-36 text-center">{formatMonthLabel(month)}</span>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary card */}
      {!loading && expenses.length > 0 && (
        <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 mb-1">{t('expenses.totalSpent')}</p>
              <p className="text-2xl font-bold text-red-400">{fmt(total)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}</p>
            </div>
            <div className="w-12 h-12 bg-red-900/30 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('expenses.noExpenses')}</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
            Track your PG expenses to understand your net income each month.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((d) => (
            <div key={d}>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 px-1">{fmtDay(d)}</p>
              <div className="space-y-2">
                {grouped[d].map((e) => (
                  <div
                    key={e.id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm dark:text-white truncate">{e.description}</p>
                    </div>
                    <p className="text-base font-bold text-red-500 shrink-0">{fmt(e.amount)}</p>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('expenses.addExpense')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('expenses.description')}</label>
              <input
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('expenses.descriptionPlaceholder')}
                autoFocus
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('expenses.amount')}</label>
              <input
                type="number" min="1" max="999999" inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('expenses.amountPlaceholder')}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('expenses.date')}</label>
              <input
                type="date" max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >{t('common.cancel')}</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? t('expenses.saving') : t('expenses.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
