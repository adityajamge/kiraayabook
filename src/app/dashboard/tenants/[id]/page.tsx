'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, ExternalLink, Pencil, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BillPreview, type BillData } from '@/components/bill-preview'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

interface Tenant {
  id: string; name: string; phone: string; email: string | null
  room_id: string; cot_number: string | null; move_in_date: string
  move_out_date: string | null; status: string; rent_amount: number | null
}
interface Document { id: string; doc_type: string; file_url: string; uploaded_at: string }
interface Room { id: string; room_number: string }
interface RentRecord {
  id: string; tenant_id: string; amount: number
  period_start: string; period_end: string
  due_date: string; paid_date: string | null
  payment_mode: string | null; status: string; bill_no: number
}
interface OrgSettings {
  name: string; address: string | null; phone: string | null
  logo_url: string | null; bill_notes: string | null
}

type EditForm = {
  name: string; phone: string; email: string; room_id: string
  cot_number: string; move_in_date: string; move_out_date: string; status: string
  rent_amount: string
}

function tenantToForm(t: Tenant): EditForm {
  return {
    name:          t.name,
    phone:         t.phone,
    email:         t.email ?? '',
    room_id:       t.room_id,
    cot_number:    t.cot_number ?? '',
    move_in_date:  t.move_in_date,
    move_out_date: t.move_out_date ?? '',
    status:        t.status,
    rent_amount:   t.rent_amount != null ? String(t.rent_amount) : '',
  }
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useT()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('aadhaar')
  const [uploading, setUploading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([])
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [billRecord, setBillRecord] = useState<RentRecord | null>(null)

  useEffect(() => { load() }, [id])

  const load = async () => {
    const [tr, dr, rr, rentr, sr] = await Promise.all([
      fetch(`/api/tenants/${id}`),
      fetch(`/api/documents?tenant_id=${id}`),
      fetch('/api/rooms'),
      fetch(`/api/rent?tenant_id=${id}`),
      fetch('/api/settings'),
    ])
    const tenantData: Tenant = await tr.json()
    setTenant(tenantData)
    setEditForm(tenantToForm(tenantData))
    setDocs(await dr.json())
    setRooms(await rr.json())
    setRentRecords(await rentr.json())
    setOrg(await sr.json())
  }

  const buildBillData = (r: RentRecord): BillData | null => {
    if (!tenant || !org) return null
    return {
      pgName:      org.name,
      address:     org.address,
      phone:       org.phone,
      logoUrl:     org.logo_url,
      billNotes:   org.bill_notes,
      billNo:      String(r.bill_no),
      date:        r.paid_date ?? new Date().toISOString().slice(0, 10),
      tenantName:  tenant.name,
      roomNumber:  roomMap[tenant.room_id] ?? '—',
      joiningDate: tenant.move_in_date,
      periodFrom:  r.period_start,
      periodTo:    r.period_end,
      amount:      r.amount,
      paymentMode: r.payment_mode,
      status:      r.status,
    }
  }

  const roomMap = Object.fromEntries(rooms.map((r: Room) => [r.id, r.room_number]))

  const setField = (k: keyof EditForm, v: string) =>
    setEditForm(f => f ? { ...f, [k]: v } : f)

  const handleSave = async () => {
    if (!editForm) return
    const trimmedName = editForm.name.trim()
    if (!trimmedName || !editForm.phone || !editForm.room_id || !editForm.move_in_date) {
      toast.error('Please fill all required fields.')
      return
    }
    if (!/^\d{10}$/.test(editForm.phone)) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }
    if (editForm.move_out_date && editForm.move_out_date <= editForm.move_in_date) {
      toast.error('Move-out date must be after move-in date.')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        name:          trimmedName,
        email:         editForm.email.trim() || undefined,
        cot_number:    editForm.cot_number || undefined,
        move_out_date: editForm.move_out_date || undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Failed to update tenant.')
      setSaving(false)
      return
    }
    const updated: Tenant = await res.json()
    setTenant(updated)
    setEditForm(tenantToForm(updated))
    setSaving(false)
    setEditOpen(false)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tenant_id', id)
    fd.append('doc_type', docType)
    await fetch('/api/documents', { method: 'POST', body: fd })
    setUploading(false)
    setUploadOpen(false)
    setFile(null)
    load()
  }

  if (!tenant || !editForm) return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-32 bg-gray-200 rounded-md" />
      <div className="h-8 w-48 bg-gray-200 rounded-md" />
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}><div className="h-3 w-16 bg-gray-200 rounded-md mb-2" /><div className="h-4 w-28 bg-gray-200 rounded-md" /></div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" />{t('tenants.backToTenants')}
      </button>

      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white truncate">{tenant.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('tenants.tenantDetails')}</p>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 dark:text-gray-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0">
              <Pencil className="w-3.5 h-3.5" />{t('common.edit')}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{t('common.edit')} {t('tenants.title')}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.name')} <span className="text-red-500">*</span></label>
                  <input maxLength={100} value={editForm.name} onChange={e => setField('name', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.phone')} <span className="text-red-500">*</span></label>
                  <input type="tel" inputMode="numeric" maxLength={10} value={editForm.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.email')}</label>
                <input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} placeholder={t('common.optional')}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.roomLabel')} <span className="text-red-500">*</span></label>
                  <select value={editForm.room_id} onChange={e => setField('room_id', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white">
                    {rooms.map(r => <option key={r.id} value={r.id}>{t('common.room')} {r.room_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.cot')}</label>
                  <input maxLength={10} value={editForm.cot_number} onChange={e => setField('cot_number', e.target.value)} placeholder="e.g. C1"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.moveInDate')} <span className="text-red-500">*</span></label>
                  <input type="date" value={editForm.move_in_date} onChange={e => setField('move_in_date', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.moveOutDate')}</label>
                  <input type="date" min={editForm.move_in_date || undefined} value={editForm.move_out_date} onChange={e => setField('move_out_date', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.status')}</label>
                  <select value={editForm.status} onChange={e => setField('status', e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white">
                    <option value="active">{t('tenants.active')}</option>
                    <option value="vacated">{t('common.vacated')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.monthlyRent')}</label>
                  <input type="number" min="0" max="999999" inputMode="numeric" value={editForm.rent_amount} onChange={e => setField('rent_amount', e.target.value)} placeholder="e.g. 5000"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditOpen(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
                <button onClick={handleSave} disabled={saving || !editForm.name.trim() || !editForm.phone || !editForm.room_id || !editForm.move_in_date}
                  className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6 mb-4">
        <h2 className="font-semibold mb-4 dark:text-white">{t('tenants.tenantInformation')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
          {[
            [t('tenants.phone'), tenant.phone],
            [t('tenants.email'), tenant.email ?? '—'],
            [t('tenants.roomLabel'), roomMap[tenant.room_id] ? `${t('common.room')} ${roomMap[tenant.room_id]}` : '—'],
            [t('tenants.cot'), tenant.cot_number ?? '—'],
            [t('tenants.monthlyRent'), tenant.rent_amount != null ? `₹${tenant.rent_amount.toLocaleString('en-IN')}` : '—'],
            [t('tenants.moveInDate'), new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
            [t('tenants.moveOutDate'), tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
            [t('tenants.status'), null],
          ].map(([label, value]) =>
            label === t('tenants.status') ? (
              <div key="status">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{t('tenants.status')}</p>
                <span className={tenant.status === 'active'
                  ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-2.5 py-1 rounded-full'}>
                  {tenant.status === 'active' ? t('tenants.active') : t('common.vacated')}
                </span>
              </div>
            ) : (
              <div key={label as string} className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-medium dark:text-white break-all">{value}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bill preview */}
      {billRecord && (() => { const bd = buildBillData(billRecord); return bd ? <BillPreview data={bd} onClose={() => setBillRecord(null)} /> : null })()}

      {/* Documents */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold dark:text-white">{t('tenants.documents')}</h2>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800">
                <Upload className="w-3.5 h-3.5" />{t('common.upload')}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>{t('tenants.uploadDocument')}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.documentType')}</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white dark:bg-gray-800 dark:text-white">
                    <option value="aadhaar">Aadhaar</option>
                    <option value="pan">PAN</option>
                    <option value="photo">Photo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.fileLabel')}</label>
                  <label className="flex items-center gap-3 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span className="shrink-0 bg-black text-white text-xs font-medium px-3 py-1 rounded-md">{t('common.chooseFile')}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{file ? file.name : t('common.noFileChosen')}</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setUploadOpen(false)}
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
                  <button onClick={handleUpload} disabled={!file || uploading}
                    className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {uploading ? t('common.uploading') : t('common.upload')}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{t('tenants.noDocuments')}</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div>
                  <p className="text-sm font-medium capitalize dark:text-white">{d.doc_type}</p>
                  <p className="text-xs text-gray-400">{new Date(d.uploaded_at).toLocaleDateString('en-IN')}</p>
                </div>
                <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rent Records */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6 mt-4">
        <h2 className="font-semibold dark:text-white mb-4">{t('tenants.rentRecords')}</h2>
        {rentRecords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{t('tenants.noRentRecords')}</p>
        ) : (
          <div className="space-y-3">
            {rentRecords.map((r) => {
              const overdue = r.status === 'pending' && new Date(r.due_date) < new Date()
              return (
                <div key={r.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold dark:text-white">
                        {new Date(r.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        {' – '}
                        {new Date(r.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t('tenants.due', { date: new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                      </p>
                    </div>
                    {r.status === 'paid' ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {t('common.paid')}
                      </span>
                    ) : overdue ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {t('common.overdue')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {t('common.pending')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold dark:text-white">₹{r.amount.toLocaleString('en-IN')}</p>
                      {r.paid_date && (
                        <p className="text-xs text-gray-400">
                          {t('tenants.paidOn', { date: new Date(r.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                          {r.payment_mode ? ` · ${r.payment_mode}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setBillRecord(r)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FileText className="w-3.5 h-3.5" /> {t('rent.bill')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
