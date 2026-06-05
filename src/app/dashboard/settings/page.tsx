'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Save, Upload, LayoutGrid, Moon, FileText } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

type OrgSettings = {
  name: string
  owner_name: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  bill_notes: string | null
  dark_mode: boolean
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  maxLength?: number
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
      <input
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings)
  }, [])

  function set<K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) {
    setSettings(s => s ? { ...s, [key]: value } : s)
  }

  async function saveProfile() {
    if (!settings) return
    if (settings.phone && !/^\d{10}$/.test(settings.phone)) {
      toast.error('Contact number must be exactly 10 digits.')
      return
    }
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:       settings.name,
        owner_name: settings.owner_name,
        phone:      settings.phone,
        address:    settings.address,
        bill_notes: settings.bill_notes,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleDarkMode(value: boolean) {
    set('dark_mode', value)
    document.documentElement.classList.toggle('dark', value)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dark_mode: value }),
    })
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
    const data = await res.json()
    set('logo_url', data.logo_url)
    setLogoUploading(false)
  }

  async function removeLogo() {
    await fetch('/api/settings/logo', { method: 'DELETE' })
    set('logo_url', null)
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your PG profile, appearance and account preferences.
        </p>
      </div>

      {/* PG Profile */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 font-semibold dark:text-white">
            <Building2 className="w-4 h-4" />
            PG Profile
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Details shown across your dashboard and to tenants.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="PG Name"
            maxLength={100}
            value={settings.name}
            onChange={v => set('name', v)}
          />
          <Field
            label="Owner Name"
            maxLength={100}
            value={settings.owner_name ?? ''}
            onChange={v => set('owner_name', v)}
          />
          <Field
            label="Contact Number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={settings.phone ?? ''}
            onChange={v => set('phone', v.replace(/\D/g, '').slice(0, 10))}
          />
          <Field
            label="Address"
            maxLength={300}
            value={settings.address ?? ''}
            onChange={v => set('address', v)}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Bill Notes */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 font-semibold dark:text-white">
            <FileText className="w-4 h-4" />
            Bill Notes
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            This note is printed on every rent bill you generate.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1.5">Notes (shown on bill)</label>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="e.g. Rent is due on the 5th of every month. Late payment attracts ₹100 fine."
            value={settings.bill_notes ?? ''}
            onChange={e => set('bill_notes', e.target.value || null)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 font-semibold dark:text-white">
            <Moon className="w-4 h-4" />
            Appearance
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Customize how your dashboard looks for you.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Moon className="w-4 h-4 text-gray-500 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Use a dark theme across the dashboard.</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.dark_mode}
            onClick={() => toggleDarkMode(!settings.dark_mode)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white ${
              settings.dark_mode ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-black rounded-full shadow transition-transform duration-200 ${
                settings.dark_mode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Branding */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 font-semibold dark:text-white">
            <LayoutGrid className="w-4 h-4" />
            Branding
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Upload a logo to replace the default icon.
          </p>
        </div>

        <div className="flex items-center gap-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${settings.logo_url ? '' : 'bg-black'}`}>
            {settings.logo_url ? (
              <Image
                src={settings.logo_url}
                alt="PG Logo"
                width={56}
                height={56}
                className="object-contain w-full h-full"
              />
            ) : (
              <LayoutGrid className="w-6 h-6 text-white" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 dark:text-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              {settings.logo_url && (
                <button
                  onClick={removeLogo}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              PNG or SVG, recommended 256×256px, max 1MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadLogo(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
