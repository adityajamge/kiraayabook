'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserCog, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/lib/i18n'

type StaffMember = {
  id: string
  name: string | null
  email: string
  role: string
  property_id: string | null
  property_name: string | null
  created_at: string
}

type Property = { id: string; name: string }

const emptyForm = { name: '', email: '', password: '', staff_role: 'staff', property_id: '' }

const ROLE_BADGE: Record<string, string> = {
  manager: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staff:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export default function StaffPage() {
  const t = useT()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [staffRes, propRes] = await Promise.all([
      fetch('/api/staff'),
      fetch('/api/properties'),
    ])
    const staffData = await staffRes.json().catch(() => [])
    const propData  = await propRes.json().catch(() => [])
    setStaffList(Array.isArray(staffData) ? staffData : [])
    setProperties(Array.isArray(propData) ? propData : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(s: StaffMember) {
    setEditing(s)
    setForm({ name: s.name ?? '', email: s.email, password: '', staff_role: s.role, property_id: s.property_id ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!editing && !form.password) {
      toast.error('Password is required')
      return
    }
    setSaving(true)
    try {
      const url    = editing ? `/api/staff/${editing.id}` : '/api/staff'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          email:       form.email.trim(),
          password:    form.password || undefined,
          staff_role:  form.staff_role,
          property_id: form.property_id || null,
        }),
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
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Failed to delete')
      return
    }
    toast.success('Staff removed')
    setDeleteId(null)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('staff.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('staff.subtitle')}</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('staff.addStaff')}</span>
          <span className="sm:hidden">{t('common.add')}</span>
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <UserCog className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('staff.noStaff')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staffList.map(s => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-11 h-11 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
                <UserCog className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name ?? s.email}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[s.role] ?? ROLE_BADGE.staff}`}>
                    {s.role === 'manager' ? t('staff.roleManager') : t('staff.roleStaff')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{s.email}</p>
                {s.property_name ? (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.property_name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('staff.propertyAll')}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(s)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(s.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('staff.editStaff') : t('staff.addStaff')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t('staff.name')} *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('staff.namePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.email')} *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('staff.emailPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.password')} {editing ? '' : '*'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editing ? t('staff.passwordEditHint') : t('staff.passwordPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('staff.role')} *</Label>
                <Select value={form.staff_role} onValueChange={v => setForm(f => ({ ...f, staff_role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">{t('staff.roleManager')}</SelectItem>
                    <SelectItem value="staff">{t('staff.roleStaff')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('staff.property')}</Label>
                <Select value={form.property_id || 'all'} onValueChange={v => setForm(f => ({ ...f, property_id: v === 'all' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('staff.propertyAll')}</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? t('staff.saving') : t('staff.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.delete')} Staff Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This will permanently remove the staff member. They will no longer be able to log in.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteId && handleDelete(deleteId)}>
              {t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
