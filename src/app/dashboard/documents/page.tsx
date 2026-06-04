'use client'

import { useEffect, useState } from 'react'
import { Upload, ExternalLink, Search, FileText, CreditCard, Image as ImageIcon, File } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Tenant { id: string; name: string }
interface Document { id: string; tenant_id: string; doc_type: string; file_url: string; uploaded_at: string }

type DocFilter = 'all' | 'aadhaar' | 'pan' | 'photo' | 'other'

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  photo: 'Photo',
  other: 'Other',
}

function docIcon(type: string) {
  if (type === 'photo') return <ImageIcon className="w-5 h-5 text-gray-500" />
  if (type === 'aadhaar' || type === 'pan') return <CreditCard className="w-5 h-5 text-gray-500" />
  return <File className="w-5 h-5 text-gray-500" />
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [docFilter, setDocFilter] = useState<DocFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selTenant, setSelTenant] = useState('')
  const [docType, setDocType] = useState('aadhaar')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [dr, tr] = await Promise.all([fetch('/api/documents'), fetch('/api/tenants')])
    setDocs(await dr.json())
    setTenants(await tr.json())
    setLoading(false)
  }

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.name]))

  const filtered = docs.filter((d) => {
    const matchFilter = docFilter === 'all' || d.doc_type === docFilter
    const matchSearch = !search ||
      (tenantMap[d.tenant_id] ?? '').toLowerCase().includes(search.toLowerCase()) ||
      d.doc_type.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleUpload = async () => {
    if (!file || !selTenant) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tenant_id', selTenant)
    fd.append('doc_type', docType)
    await fetch('/api/documents', { method: 'POST', body: fd })
    setUploading(false)
    setOpen(false)
    setFile(null)
    setSelTenant('')
    setDocType('aadhaar')
    load()
  }

  const uploadDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0">
          <Upload className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Tenant <span className="text-red-500">*</span></label>
            <select value={selTenant} onChange={(e) => setSelTenant(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
              <option value="">Select tenant</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="photo">Photo</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File <span className="text-red-500">*</span></label>
            <label className="flex items-center gap-3 w-full border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="shrink-0 bg-black text-white text-xs font-medium px-3 py-1 rounded-md">Choose File</span>
              <span className="text-sm text-gray-500 truncate">{file ? file.name : 'No file chosen'}</span>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setOpen(false)}
              className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleUpload} disabled={!file || !selTenant || uploading}
              className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold dark:text-white">Documents</h1>
          {uploadDialog}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant or type"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none dark:text-white" />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'aadhaar', 'pan', 'photo', 'other'] as DocFilter[]).map((f) => (
            <button key={f} onClick={() => setDocFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${docFilter === f ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {f === 'all' ? 'All' : f === 'aadhaar' ? 'Aadhaar' : f === 'pan' ? 'PAN' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Document card list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">No documents found.</p>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((d) => (
              <div key={d.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center shrink-0">
                  {docIcon(d.doc_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm dark:text-white">{tenantMap[d.tenant_id] ?? '—'}</p>
                  <p className="text-xs text-gray-500">{DOC_LABELS[d.doc_type] ?? d.doc_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-gray-500 text-sm mt-0.5">Tenant identity and verification documents</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800">
                <Upload className="w-4 h-4" />Upload Document
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant <span className="text-red-500">*</span></label>
                  <select value={selTenant} onChange={(e) => setSelTenant(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select tenant</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
                    <option value="aadhaar">Aadhaar</option>
                    <option value="pan">PAN</option>
                    <option value="photo">Photo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File <span className="text-red-500">*</span></label>
                  <label className="flex items-center gap-3 w-full border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span className="shrink-0 bg-black text-white text-xs font-medium px-3 py-1 rounded-md">Choose File</span>
                    <span className="text-sm text-gray-500 truncate">{file ? file.name : 'No file chosen'}</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button onClick={handleUpload} disabled={!file || !selTenant || uploading}
                    className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-45 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant or type"
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400" />
          </div>
          <select value={docFilter} onChange={(e) => setDocFilter(e.target.value as DocFilter)}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-gray-800 dark:text-white">
            <option value="all">All Types</option>
            <option value="aadhaar">Aadhaar</option>
            <option value="pan">PAN</option>
            <option value="photo">Photo</option>
            <option value="other">Other</option>
          </select>
        </div>

        {loading ? <TableSkeleton cols={4} /> : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No documents found.</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['TENANT', 'DOCUMENT TYPE', 'UPLOADED ON', 'VIEW'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-5 py-3.5 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-5 py-4 font-medium">{tenantMap[d.tenant_id] ?? '—'}</td>
                    <td className="px-5 py-4 capitalize text-gray-600 dark:text-gray-400">{DOC_LABELS[d.doc_type] ?? d.doc_type}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(d.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
