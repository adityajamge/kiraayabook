'use client'

import { useEffect } from 'react'
import { X, Printer, Share2 } from 'lucide-react'

export interface BillData {
  pgName: string
  address: string | null
  phone: string | null
  logoUrl: string | null
  billNotes: string | null
  billNo: string
  date: string
  tenantName: string
  roomNumber: string
  joiningDate: string
  periodFrom: string
  periodTo: string
  amount: number
  paymentMode: string | null
}

const MAROON = '#8B0000'
const DARK   = '#3a0000'
const CREAM  = '#faf0ec'
const SERIF  = 'Georgia, "Times New Roman", serif'
const SANS   = 'Arial, sans-serif'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Field({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex }}>
      <span style={{ fontSize: 13, color: DARK, whiteSpace: 'nowrap', fontFamily: SERIF }}>{label}</span>
      <div style={{
        flex: 1,
        background: '#fff',
        borderRadius: 6,
        padding: '6px 10px',
        minHeight: 32,
        fontSize: 13,
        color: '#222',
        fontFamily: SANS,
      }}>
        {value}
      </div>
    </div>
  )
}

function PayMode({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 48, height: 48,
        background: '#fff',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke={MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 12, color: DARK, fontFamily: SERIF }}>{label}</span>
    </div>
  )
}

export function BillPreview({ data, onClose }: { data: BillData; onClose: () => void }) {
  useEffect(() => {
    const style = document.createElement('style')
    style.id = '__bill_print_css__'
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body > * { visibility: hidden !important; }
        #__bill_print_area__, #__bill_print_area__ * { visibility: visible !important; }
        #__bill_print_area__ {
          position: fixed !important;
          inset: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          width: 100% !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById('__bill_print_css__')?.remove() }
  }, [])

  const handlePrint = () => window.print()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rent Bill – ${data.tenantName}`,
          text: [
            `Bill No: ${data.billNo}`,
            `Name: ${data.tenantName}`,
            `Room: ${data.roomNumber}`,
            `Rent: ₹${data.amount.toLocaleString('en-IN')}`,
            `Period: ${fmtDate(data.periodFrom)} – ${fmtDate(data.periodTo)}`,
            `Date: ${fmtDate(data.date)}`,
          ].join('\n'),
        })
        return
      } catch { /* fall through */ }
    }
    window.print()
  }

  const isOnline  = data.paymentMode === 'upi' || data.paymentMode === 'bank'
  const isCash    = data.paymentMode === 'cash'
  const isCheque  = data.paymentMode === 'cheque'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg mb-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 print:hidden">
          <span className="text-white font-semibold text-sm">Bill Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-600"
            >
              <Share2 className="w-4 h-4" />Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <Printer className="w-4 h-4" />Print / PDF
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── THE BILL ── */}
        <div
          id="__bill_print_area__"
          style={{
            background: CREAM,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            fontFamily: SERIF,
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', padding: '28px 80px 16px', position: 'relative' }}>
            {/* Logo — top-right, no background */}
            {data.logoUrl && (
              <div style={{ position: 'absolute', top: 20, right: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.logoUrl}
                  alt=""
                  style={{ width: 60, height: 60, objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: MAROON,
              margin: 0,
              lineHeight: 1.2,
            }}>
              {data.pgName}
            </h1>
          </div>

          {/* Address strip */}
          <div style={{
            background: MAROON,
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '9px 24px',
            fontSize: 12,
            fontFamily: SANS,
            fontWeight: 600,
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span>{data.address ?? ''}</span>
            {data.phone && <span style={{ whiteSpace: 'nowrap' }}>Mob- {data.phone}</span>}
          </div>

          {/* Form fields */}
          <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Row 1: Bill No (plain text) + Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: DARK, fontFamily: SERIF }}>Bill No :</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: MAROON, fontFamily: SERIF }}>{data.billNo}</span>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Date :" value={fmtDate(data.date)} />
              </div>
            </div>

            {/* Row 2: Full Name + Room No */}
            <div style={{ display: 'flex', gap: 20 }}>
              <Field label="Full Name :" value={data.tenantName} flex={2} />
              <Field label="Room No. :" value={data.roomNumber} flex={1} />
            </div>

            {/* Row 3: Joining Date + Date From / To */}
            <div style={{ display: 'flex', gap: 20 }}>
              <Field label="Joining Date :" value={fmtDate(data.joiningDate)} flex={1} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: DARK, whiteSpace: 'nowrap', fontFamily: SERIF }}>Date From :</span>
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', minHeight: 32, fontSize: 13, color: '#222', fontFamily: SANS, whiteSpace: 'nowrap' }}>
                  {fmtDate(data.periodFrom)}
                </div>
                <span style={{ fontSize: 13, color: DARK, whiteSpace: 'nowrap', fontFamily: SERIF }}>To :</span>
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', minHeight: 32, fontSize: 13, color: '#222', fontFamily: SANS, whiteSpace: 'nowrap' }}>
                  {fmtDate(data.periodTo)}
                </div>
              </div>
            </div>

            {/* Row 4: Rent + Adv */}
            <div style={{ display: 'flex', gap: 20 }}>
              <Field label="Rent :" value={`₹${data.amount.toLocaleString('en-IN')}`} flex={1} />
              <Field label="Adv :" value="" flex={1} />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#e0c9c0', margin: '4px 0' }} />

            {/* Row 5: Notes + Payment Mode */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {/* Notes */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: MAROON, marginBottom: 8, fontFamily: SERIF }}>Note :-</p>
                <div style={{
                  background: '#fff',
                  borderRadius: 6,
                  padding: '10px 12px',
                  minHeight: 90,
                  fontSize: 12,
                  color: '#555',
                  lineHeight: 1.7,
                  fontFamily: SANS,
                }}>
                  {data.billNotes ?? ''}
                </div>
              </div>

              {/* Payment Mode */}
              <div style={{ minWidth: 140 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: MAROON, marginBottom: 12, fontFamily: SERIF }}>Payment Mode</p>
                <div style={{ display: 'flex', gap: 14 }}>
                  <PayMode label="Online"  active={isOnline} />
                  <PayMode label="Cash"    active={isCash} />
                  <PayMode label="Cheque"  active={isCheque} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
