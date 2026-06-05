'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

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
    const res = await fetch('/api/expenses')
    const all: Expense[] = await res.json()
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

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold dark:text-white">Expenses</h1>
          <button onClick={openAdd}
            className="w-9 h-9 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => setMonth(addMonths(month, -1))}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-base dark:text-white min-w-32 text-center">{formatMonthLabel(month)}</span>
          <button onClick={() => setMonth(addMonths(month, 1))}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Total card */}
        {!loading && expenses.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total spent</p>
              <p className="text-2xl font-bold text-red-500">{fmt(total)}</p>
            </div>
            <Receipt className="w-8 h-8 text-gray-200 dark:text-gray-700" />
          </div>
        )}

        {/* Expense list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-center py-16 text-gray-400 text-sm">No expenses this month.</p>
        ) : (
          <div className="space-y-2.5">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm dark:text-white truncate">{e.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDay(e.date)}</p>
                </div>
                <p className="text-base font-bold text-red-500 shrink-0">{fmt(e.amount)}</p>
                <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 disabled:opacity-40">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Expenses</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track your PG running costs.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
            <button onClick={openAdd}
              className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
              <Plus className="w-4 h-4" />Add Expense
            </button>
          </div>
        </div>

        {!loading && expenses.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total spent this month</p>
              <p className="text-2xl font-bold text-red-500">{fmt(total)}</p>
            </div>
            <Receipt className="w-8 h-8 text-gray-200 dark:text-gray-700" />
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-800">
                <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No expenses this month.</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['DATE', 'DESCRIPTION', 'AMOUNT', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDay(e.date)}</td>
                    <td className="px-5 py-4 font-medium dark:text-white">{e.description}</td>
                    <td className="px-5 py-4 font-bold text-red-500">{fmt(e.amount)}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · Total {fmt(total)}
            </div>
          </div>
        )}
      </div>

      {/* Add Expense dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Electricity bill"
                autoFocus
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount (₹)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
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
    </>
  )
}
