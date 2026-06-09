'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Building2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'

type Property = {
  id: string
  name: string
  address: string | null
  phones: string[] | null
  room_count: number
  tenant_count: number
  created_at: string
}

const emptyForm = { name: '', address: '', phones: [''] }

export default function PropertiesPage() {
  const t = useT()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Property | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/properties')
    const data = await res.json().catch(() => [])
    setProperties(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(p: Property) {
    setEditing(p)
    setForm({ name: p.name, address: p.address ?? '', phones: p.phones?.length ? p.phones : [''] })
    setDialogOpen(true)
  }

  function setPhone(index: number, value: string) {
    setForm(f => {
      const phones = [...f.phones]
      phones[index] = value.replace(/\D/g, '').slice(0, 10)
      return { ...f, phones }
    })
  }

  function addPhone() {
    setForm(f => ({ ...f, phones: [...f.phones, ''] }))
  }

  function removePhone(index: number) {
    setForm(f => ({ ...f, phones: f.phones.filter((_, i) => i !== index) }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(t('properties.name') + ' is required')
      return
    }
    setSaving(true)
    try {
      const phones = form.phones.filter(p => p.trim().length > 0)
      const url    = editing ? `/api/properties/${editing.id}` : '/api/properties'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, address: form.address, phones: phones.length ? phones : null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Failed to save')
        return
      }
      toast.success(t('common.saved'))
      setDialogOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Failed to delete')
      return
    }
    toast.success('Property deleted')
    setDeleteId(null)
    load()
  }

  const formContent = (
    <div className="space-y-3 mt-2">
      <div>
        <label className="block text-sm font-medium mb-1">{t('properties.name')} <span className="text-red-500">*</span></label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={t('properties.namePlaceholder')}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('properties.address')}</label>
        <input
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          placeholder={t('properties.addressPlaceholder')}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('properties.phone')}</label>
        <div className="space-y-2">
          {form.phones.map((ph, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={ph}
                onChange={e => setPhone(i, e.target.value)}
                placeholder={t('properties.phonePlaceholder')}
                inputMode="numeric"
                maxLength={10}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white"
              />
              {form.phones.length > 1 && (
                <button
                  onClick={() => removePhone(i)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPhone}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add another number
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setDialogOpen(false)}
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? t('properties.saving') : t('properties.save')}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight dark:text-white">{t('properties.title')}</h1>
          <div className="h-5 mt-0.5">
            {!loading && properties.length > 0 && (
              <p className="text-sm text-gray-500">{properties.length} {properties.length === 1 ? 'property' : 'properties'}</p>
            )}
          </div>
        </div>
        <button
          onClick={openAdd}
          className="w-9 h-9 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('properties.noProperties')}</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
            Add your first property to start managing rooms and tenants.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" /> Add Property
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(p => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] dark:text-white truncate">{p.name}</p>
                  {p.address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{p.address}</p>
                  )}
                  {p.phones && p.phones.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.phones.join(' / ')}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-50 dark:border-gray-800">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      <Building2 className="w-3.5 h-3.5" />
                      {p.room_count} {t('properties.rooms')}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      <Users className="w-3.5 h-3.5" />
                      {p.tenant_count} {t('properties.tenants')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('properties.editProperty') : t('properties.addProperty')}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.delete')} Property?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This will permanently delete the property. Rooms and tenants linked to it will remain but lose their property association.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => deleteId && handleDelete(deleteId)}
              className="flex-1 bg-red-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-red-700"
            >
              {t('common.delete')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
