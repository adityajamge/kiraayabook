import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth'
import { LayoutGrid, ShieldCheck, Users, Wallet, FileText, MessageCircle, LogIn } from 'lucide-react'

const features = [
  { icon: Users, text: 'Track tenants and rooms' },
  { icon: Wallet, text: 'Collect and record rent' },
  { icon: FileText, text: 'Store Aadhaar and documents' },
  { icon: MessageCircle, text: 'Send WhatsApp reminders in one tap' },
]

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('kiraayabook_token')?.value
  if (token) {
    const payload = await verifyJwt(token)
    if (payload) redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base">KiraayaBook</span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 bg-black text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm px-3 py-1.5 rounded-full mb-6">
          <ShieldCheck className="w-4 h-4" />
          PG management, made simple
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-3">KiraayaBook</h1>
        <p className="text-gray-500 text-lg mb-10">
          Manage your PG — tenants, rooms, rent, all in one place.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-10 w-full max-w-lg">
          {features.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-3 text-left shadow-sm"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">{text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 bg-black text-white font-medium px-8 py-3.5 rounded-2xl hover:bg-gray-800 transition-colors mb-3"
        >
          <LogIn className="w-4 h-4" />
          Login
        </Link>
        <p className="text-sm text-gray-400">For PG owners and caretakers</p>
      </main>

      <footer className="text-center py-4 text-sm text-gray-400 border-t border-gray-100">
        © 2025 KiraayaBook — Calm, simple PG management.
      </footer>
    </div>
  )
}
