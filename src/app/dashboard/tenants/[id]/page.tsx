'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, ExternalLink, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Tenant {
  id: string; name: string; phone: string; email: string | null
  room_id: string; cot_number: string | null; move_in_date: string
  move_out_date: string | null; status: string; rent_amount: number | null
}
interface Document { id: string; doc_type: string; file_url: string; uploaded_at: string }
interface Room { id: string; room_number: string }

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

  useEffect(() => { load() }, [id])

  const load = async () => {
    const [tr, dr, rr] = await Promise.all([
      fetch(`/api/tenants/${id}`),
      fetch(`/api/documents?tenant_id=${id}`),
      fetch('/api/rooms'),
    ])
    const tenantData: Tenant = await tr.json()
    setTenant(tenantData)
    setEditForm(tenantToForm(tenantData))
    setDocs(await dr.json())
    setRooms(await rr.json())
  }

  const roomMap = Object.fromEntries(rooms.map((r: Room) => [r.id, r.room_number]))

  const setField = (k: keyof EditForm, v: string) =>
    setEditForm(f => f ? { ...f, [k]: v } : f)

  const handleSave = async () => {
    if (!editForm) return
    setSaving(true)
    const res = await fetch(`/api/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        email:         editForm.email || undefined,
        cot_number:    editForm.cot_number || undefined,
        move_out_date: editForm.move_out_date || undefined,
      }),
    })
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
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft className="w-4 h-4" />Back to tenants
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{tenant.name}</h1>
          <p className="text-gray-500 text-sm">Tenant details and documents</p>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 border border-gray-200 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shrink-0">
              <Pencil className="w-3.5 h-3.5" />Edit
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Tenant</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
                  <input value={editForm.name} onChange={e => setField('name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone <span className="text-red-500">*</span></label>
                  <input value={editForm.phone} onChange={e => setField('phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Room <span className="text-red-500">*</span></label>
                  <select value={editForm.room_id} onChange={e => setField('room_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cot</label>
                  <input value={editForm.cot_number} onChange={e => setField('cot_number', e.target.value)} placeholder="e.g. C1, Top Bunk"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Move-in Date <span className="text-red-500">*</span></label>
                  <input type="date" value={editForm.move_in_date} onChange={e => setField('move_in_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Move-out Date</label>
                  <input type="date" value={editForm.move_out_date} onChange={e => setField('move_out_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setField('status', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    <option value="active">Active</option>
                    <option value="vacated">Vacated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Rent (₹)</label>
                  <input type="number" min="0" value={editForm.rent_amount} onChange={e => setField('rent_amount', e.target.value)} placeholder="e.g. 5000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditOpen(false)}
                  className="flex-1 border border-gray-200 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving || !editForm.name || !editForm.phone || !editForm.room_id}
                  className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Tenant Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ['Phone', tenant.phone],
            ['Email', tenant.email ?? '—'],
            ['Room', roomMap[tenant.room_id] ? `Room ${roomMap[tenant.room_id]}` : '—'],
            ['Cot', tenant.cot_number ?? '—'],
            ['Monthly Rent', tenant.rent_amount != null ? `₹${tenant.rent_amount.toLocaleString('en-IN')}` : '—'],
            ['Move-in', new Date(tenant.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
            ['Move-out', tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
            ['Status', null],
          ].map(([label, value]) =>
            label === 'Status' ? (
              <div key="status">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <span className={tenant.status === 'active'
                  ? 'bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full'
                  : 'bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full'}>
                  {tenant.status === 'active' ? 'Active' : 'Vacated'}
                </span>
              </div>
            ) : (
              <div key={label as string}>
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Documents</h2>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800">
                <Upload className="w-3.5 h-3.5" />Upload
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                    <option value="aadhaar">Aadhaar</option>
                    <option value="pan">PAN</option>
                    <option value="photo">Photo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File</label>
                  <label className="flex items-center gap-3 w-full border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className="shrink-0 bg-black text-white text-xs font-medium px-3 py-1 rounded-md">Choose File</span>
                    <span className="text-sm text-gray-500 truncate">{file ? file.name : 'No file chosen'}</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setUploadOpen(false)}
                    className="flex-1 border border-gray-200 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleUpload} disabled={!file || uploading}
                    className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium capitalize">{d.doc_type}</p>
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
    </div>
  )
}
