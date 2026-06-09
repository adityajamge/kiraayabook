'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, ExternalLink, Pencil, FileText, CheckCircle, AlertTriangle, Clock, Phone, Building2, BedDouble, Calendar, IndianRupee } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BillPreview, type BillData } from '@/components/bill-preview'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

interface Tenant {
  id: string; name: string; phone: string; email: string | null
  room_id: string; property_id: string; cot_number: string | null; move_in_date: string
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
  logo_url: string | null; bill_notes: string | null
}
interface Property {
  id: string; name: string; address: string | null; phones: string[] | null
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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

type DetailTab = 'info' | 'docs' | 'rent'

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useT()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>('info')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('aadhaar')
  const [uploading, setUploading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([])
  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [billRecord, setBillRecord] = useState<RentRecord | null>(null)

  useEffect(() => { load() }, [id])

  const load = async () => {
    const [tr, dr, rr, rentr, sr, pr] = await Promise.all([
      fetch(`/api/tenants/${id}`),
      fetch(`/api/documents?tenant_id=${id}`),
      fetch('/api/rooms?limit=200'),
      fetch(`/api/rent?tenant_id=${id}&limit=200`),
      fetch('/api/settings'),
      fetch('/api/properties'),
    ])
    const tenantData: Tenant = await tr.json()
    setTenant(tenantData)
    setEditForm(tenantToForm(tenantData))
    setDocs(await dr.json())
    setRooms((await rr.json()).data ?? [])
    setRentRecords((await rentr.json()).data ?? [])
    setOrg(await sr.json())
    const allProperties: Property[] = await pr.json()
    setProperty(allProperties.find(p => p.id === tenantData.property_id) ?? null)
  }

  const buildBillData = (r: RentRecord): BillData | null => {
    if (!tenant || !org) return null
    return {
      pgName:      property?.name    ?? 'Your PG',
      address:     property?.address ?? null,
      phones:      property?.phones  ?? null,
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
      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  )

  const paidCount = rentRecords.filter((r) => r.status === 'paid').length
  const pendingAmount = rentRecords.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      {/* Bill preview overlay */}
      {billRecord && (() => { const bd = buildBillData(billRecord); return bd ? <BillPreview data={bd} onClose={() => setBillRecord(null)} /> : null })()}

      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />{t('tenants.backToTenants')}
      </button>

      {/* Hero card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl flex items-center justify-center text-lg font-bold shrink-0">
            {initials(tenant.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold dark:text-white leading-tight">{tenant.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{tenant.phone}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${
                tenant.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                {tenant.status === 'active' ? t('tenants.active') : t('common.vacated')}
              </span>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Building2 className="w-3.5 h-3.5" />
                {t('common.room')} {roomMap[tenant.room_id] ?? '—'}
                {tenant.cot_number && ` · Cot ${tenant.cot_number}`}
              </span>
              {tenant.rent_amount != null && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <IndianRupee className="w-3 h-3" />
                  {tenant.rent_amount.toLocaleString('en-IN')}/mo
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Edit button */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Pencil className="w-3.5 h-3.5" />{t('common.edit')} Tenant
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{t('common.edit')} {t('tenants.title')}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.name')} <span className="text-red-500">*</span></label>
                    <input maxLength={100} value={editForm.name} onChange={e => setField('name', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.phone')} <span className="text-red-500">*</span></label>
                    <input type="tel" inputMode="numeric" maxLength={10} value={editForm.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.email')}</label>
                  <input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} placeholder={t('common.optional')}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.roomLabel')} <span className="text-red-500">*</span></label>
                    <select value={editForm.room_id} onChange={e => setField('room_id', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                      {rooms.map(r => <option key={r.id} value={r.id}>{t('common.room')} {r.room_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.cot')}</label>
                    <input maxLength={10} value={editForm.cot_number} onChange={e => setField('cot_number', e.target.value)} placeholder="e.g. C1"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.moveInDate')} <span className="text-red-500">*</span></label>
                    <input type="date" value={editForm.move_in_date} onChange={e => setField('move_in_date', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.moveOutDate')}</label>
                    <input type="date" min={editForm.move_in_date || undefined} value={editForm.move_out_date} onChange={e => setField('move_out_date', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.status')}</label>
                    <select value={editForm.status} onChange={e => setField('status', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                      <option value="active">{t('tenants.active')}</option>
                      <option value="vacated">{t('common.vacated')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.monthlyRent')}</label>
                    <input type="number" min="0" max="999999" inputMode="numeric" value={editForm.rent_amount} onChange={e => setField('rent_amount', e.target.value)} placeholder="e.g. 5000"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditOpen(false)}
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editForm.name.trim() || !editForm.phone || !editForm.room_id || !editForm.move_in_date}
                    className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50"
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rent snapshot (only when records exist) */}
      {rentRecords.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-lg font-bold text-green-600">{paidCount} months</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="w-7 h-7 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
              <Clock className="w-3.5 h-3.5 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-lg font-bold text-red-500">₹{pendingAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Detail tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
        {([['info', t('tenants.tenantInformation')], ['docs', t('tenants.documents')], ['rent', t('tenants.rentRecords')]] as [DetailTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500'}`}
          >
            {label}
            {tab === 'docs' && docs.length > 0 && (
              <span className="ml-1 text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{docs.length}</span>
            )}
            {tab === 'rent' && rentRecords.length > 0 && (
              <span className="ml-1 text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{rentRecords.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {[
              { label: t('tenants.phone'), value: tenant.phone, icon: Phone },
              { label: t('tenants.email'), value: tenant.email ?? '—', icon: null },
              { label: t('tenants.roomLabel'), value: roomMap[tenant.room_id] ? `${t('common.room')} ${roomMap[tenant.room_id]}` : '—', icon: Building2 },
              { label: t('tenants.cot'), value: tenant.cot_number ?? '—', icon: BedDouble },
              { label: t('tenants.monthlyRent'), value: tenant.rent_amount != null ? `₹${tenant.rent_amount.toLocaleString('en-IN')}` : '—', icon: IndianRupee },
              { label: t('tenants.moveInDate'), value: new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), icon: Calendar },
              ...(tenant.move_out_date ? [{ label: t('tenants.moveOutDate'), value: new Date(tenant.move_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), icon: Calendar }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-medium dark:text-white break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'docs' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold dark:text-white">{t('tenants.documents')}</h2>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-gray-700">
                  <Upload className="w-3.5 h-3.5" />{t('common.upload')}
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>{t('tenants.uploadDocument')}</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.documentType')}</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="photo">Photo</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('tenants.fileLabel')}</label>
                    <label className="flex items-center gap-3 w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <span className="shrink-0 bg-gray-900 text-white text-xs font-medium px-3 py-1 rounded-lg">{t('common.chooseFile')}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{file ? file.name : t('common.noFileChosen')}</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
                    </label>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setUploadOpen(false)}
                      className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
                    <button onClick={handleUpload} disabled={!file || uploading}
                      className="flex-1 bg-gray-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50">
                      {uploading ? t('common.uploading') : t('common.upload')}
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {docs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">{t('tenants.noDocuments')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
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
      )}

      {/* Rent Records tab */}
      {activeTab === 'rent' && (
        <div className="space-y-3">
          {rentRecords.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center shadow-sm">
              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('tenants.noRentRecords')}</p>
            </div>
          ) : (
            rentRecords.map((r) => {
              const overdue = r.status === 'pending' && new Date(r.due_date) < new Date()
              return (
                <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
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
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FileText className="w-3.5 h-3.5" /> {t('rent.bill')}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
