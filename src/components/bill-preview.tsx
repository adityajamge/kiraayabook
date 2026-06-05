'use client'

import { useRef, useEffect } from 'react'
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PayMode({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{
        width: 36, height: 36, borderRadius: 6,
        border: '2px solid #8B0000',
        background: active ? '#8B0000' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#8B0000', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function Field({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#3a0000', whiteSpace: 'nowrap' }}>{label} :</span>
      <div style={{
        flex: 1,
        background: '#fff',
        border: '1px solid #d1b8b0',
        borderRadius: 6,
        padding: '5px 10px',
        minHeight: 32,
        fontSize: 13,
        color: '#222',
        fontWeight: 500,
      }}>
        {value}
      </div>
    </div>
  )
}

export function BillPreview({ data, onClose }: { data: BillData; onClose: () => void }) {
  const billRef = useRef<HTMLDivElement>(null)

  // Inject print CSS on mount, clean up on unmount
  useEffect(() => {
    const style = document.createElement('style')
    style.id = '__bill_print_css__'
    style.textContent = `
      @media print {
        @page { size: A5; margin: 0; }
        body > * { visibility: hidden !important; }
        #__bill_print_area__, #__bill_print_area__ * { visibility: visible !important; }
        #__bill_print_area__ {
          position: fixed !important;
          inset: 0 !important;
          width: 148mm !important;
          margin: auto !important;
          padding: 0 !important;
          box-shadow: none !important;
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
          text: `Bill No: ${data.billNo}\nTenant: ${data.tenantName}\nRoom: ${data.roomNumber}\nAmount: ₹${data.amount.toLocaleString('en-IN')}\nPeriod: ${fmtDate(data.periodFrom)} – ${fmtDate(data.periodTo)}`,
        })
        return
      } catch { /* fall through to print */ }
    }
    window.print()
  }

  const modeLabel = data.paymentMode === 'upi' ? 'Online' : data.paymentMode === 'bank' ? 'Online' : data.paymentMode ?? ''

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg mb-4">
        {/* toolbar — hidden when printing */}
        <div id="__bill_toolbar__" className="flex items-center justify-between mb-3 print:hidden">
          <span className="text-white font-semibold text-sm">Bill Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-600"
            >
              <Share2 className="w-4 h-4" />Share / Save
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <Printer className="w-4 h-4" />Print PDF
            </button>
            <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── THE BILL ── */}
        <div
          id="__bill_print_area__"
          ref={billRef}
          style={{
            background: '#faf0ec',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            position: 'relative',
          }}
        >
          {/* Watermark logo */}
          {data.logoUrl && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logoUrl}
                alt=""
                style={{ width: 220, height: 220, objectFit: 'contain', opacity: 0.07 }}
              />
            </div>
          )}

          {/* Content above watermark */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', padding: '24px 24px 12px' }}>
              <p style={{ fontSize: 11, color: '#8B0000', letterSpacing: 2, marginBottom: 4 }}>— RECEIPT —</p>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#8B0000', margin: 0, lineHeight: 1.2 }}>
                {data.pgName}
              </h1>
            </div>

            {/* Address strip */}
            <div style={{
              background: '#8B0000',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 20px',
              fontSize: 12,
              fontFamily: 'Arial, sans-serif',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <span>{data.address ?? 'Your PG Address'}</span>
              {data.phone && <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Mob- {data.phone}</span>}
            </div>

            {/* Form fields */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Row 1: Bill No + Date */}
              <div style={{ display: 'flex', gap: 16 }}>
                <Field label="Bill No" value={data.billNo} />
                <Field label="Date" value={fmtDate(data.date)} />
              </div>

              {/* Row 2: Full Name + Room No */}
              <div style={{ display: 'flex', gap: 16 }}>
                <Field label="Full Name" value={data.tenantName} flex={2} />
                <Field label="Room No" value={data.roomNumber} />
              </div>

              {/* Row 3: Joining Date + Date From / To */}
              <div style={{ display: 'flex', gap: 16 }}>
                <Field label="Joining Date" value={fmtDate(data.joiningDate)} />
                <Field label="Date From" value={fmtDate(data.periodFrom)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#3a0000', whiteSpace: 'nowrap' }}>To :</span>
                  <div style={{
                    background: '#fff', border: '1px solid #d1b8b0', borderRadius: 6,
                    padding: '5px 10px', minHeight: 32, fontSize: 13, color: '#222', fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {fmtDate(data.periodTo)}
                  </div>
                </div>
              </div>

              {/* Row 4: Rent + Adv */}
              <div style={{ display: 'flex', gap: 16 }}>
                <Field label="Rent" value={`₹${data.amount.toLocaleString('en-IN')}`} />
                <Field label="Adv" value="" />
              </div>

              {/* Row 5: Notes + Payment Mode */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 4 }}>
                {/* Notes */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#8B0000', marginBottom: 6 }}>Note :–</p>
                  <div style={{
                    background: '#fff',
                    border: '1px solid #d1b8b0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    minHeight: 80,
                    fontSize: 12,
                    color: '#444',
                    lineHeight: 1.6,
                  }}>
                    {data.billNotes ?? ''}
                  </div>
                </div>

                {/* Payment Mode */}
                <div style={{ minWidth: 110 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#8B0000', marginBottom: 10 }}>Payment Mode</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <PayMode label="Online" active={modeLabel === 'Online'} />
                    <PayMode label="Cash" active={data.paymentMode === 'cash'} />
                    <PayMode label="Cheque" active={data.paymentMode === 'cheque'} />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px dashed #c49a8a',
              margin: '0 24px',
              paddingTop: 10,
              paddingBottom: 16,
              textAlign: 'center',
              fontSize: 11,
              color: '#8B0000',
              fontFamily: 'Arial, sans-serif',
            }}>
              Thank you for staying with us 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
