'use client'

import { useEffect, useState } from 'react'
import { Upload, ExternalLink, Search } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Tenant { id: string; name: string }
interface Document { id: string; tenant_id: string; doc_type: string; file_url: string; uploaded_at: string }

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantFilter, setTenantFilter] = useState('')
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
    const matchTenant = !tenantFilter || d.tenant_id === tenantFilter
    const matchSearch = !search || (tenantMap[d.tenant_id] ?? '').toLowerCase().includes(search.toLowerCase())
      || d.doc_type.toLowerCase().includes(search.toLowerCase())
    return matchTenant && matchSearch
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                  <option value="">Select tenant</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
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
                <label className="block text-sm font-medium mb-1">File <span className="text-red-500">*</span></label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleUpload} disabled={!file || !selTenant || uploading}
                  className="flex-1 bg-black text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant or type"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400" />
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
          <option value="">All Tenants</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <TableSkeleton cols={4} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No documents found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['TENANT', 'DOCUMENT TYPE', 'UPLOADED ON', 'VIEW'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-3.5 tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium">{tenantMap[d.tenant_id] ?? '—'}</td>
                  <td className="px-5 py-4 capitalize text-gray-600">{d.doc_type}</td>
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
  )
}
