'use client'

import { useRef, useState, useEffect } from 'react'
import { X, Download, Share2, Loader2 } from 'lucide-react'
import { useT } from '@/lib/i18n'

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
  status: string
}

const MAROON = '#8B0000'
const CREAM  = '#faf0ec'
const SERIF  = 'Georgia, "Times New Roman", serif'
const SANS   = 'Arial, Helvetica, sans-serif'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// White box — value only, no border
function Box({ value, minW }: { value: string; minW?: number }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 5,
      padding: '5px 10px',
      minHeight: 30,
      minWidth: minW,
      fontSize: 12,
      color: '#222',
      fontFamily: SANS,
      display: 'inline-flex',
      alignItems: 'center',
      flex: 1,
    }}>
      {value}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#3a0000', whiteSpace: 'nowrap', fontFamily: SERIF, minWidth: 90 }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function PayMode({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 44, height: 44,
        background: '#fff',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke={MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#3a0000', fontFamily: SERIF }}>{label}</span>
    </div>
  )
}

function BillContent({ data }: { data: BillData }) {
  const t = useT()
  const isOnline = data.paymentMode === 'online'
  const isCash   = data.paymentMode === 'cash'
  const isCheque = data.paymentMode === 'cheque'

  return (
    <div style={{
      background: CREAM,
      width: 880,
      fontFamily: SERIF,
    }}>
      {/* Header — flex so logo placement is captured correctly by html2canvas */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px 14px', gap: 12 }}>
        {/* spacer mirrors logo width so title stays centered */}
        <div style={{ width: 64, flexShrink: 0 }} />
        <h1 style={{ flex: 1, fontSize: 26, fontWeight: 700, color: MAROON, margin: 0, lineHeight: 1.2, textAlign: 'center' }}>
          {data.pgName}
        </h1>
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logoUrl}
            alt=""
            crossOrigin="anonymous"
            style={{ width: 64, height: 64, display: 'block', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 64, flexShrink: 0 }} />
        )}
      </div>

      {/* Address strip */}
      <div style={{
        background: MAROON, color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 24px', fontSize: 12, fontFamily: SANS, fontWeight: 600,
        gap: 12, flexWrap: 'wrap',
      }}>
        <span>{data.address ?? ''}</span>
        {data.phone && <span style={{ whiteSpace: 'nowrap' }}>{t('bill.mob')} {data.phone}</span>}
      </div>

      {/* Body — two columns */}
      <div style={{ display: 'flex', gap: 0, padding: '20px 24px 0' }}>

        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13, paddingRight: 20 }}>
          {/* Bill No + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 30 }}>
            <span style={{ fontSize: 12, color: '#3a0000', fontFamily: SERIF }}>{t('bill.billNo')}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: MAROON, fontFamily: SERIF }}>{data.billNo}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              padding: '2px 8px', borderRadius: 4,
              background: data.status === 'paid' ? '#166534' : '#991b1b',
              color: '#fff', fontFamily: 'Arial, sans-serif',
            }}>
              {data.status === 'paid' ? t('bill.paid') : t('bill.unpaid')}
            </span>
          </div>
          <Row label={t('bill.fullName')}><Box value={data.tenantName} /></Row>
          <Row label={t('bill.joiningDate')}><Box value={fmtDate(data.joiningDate)} /></Row>
          <Row label={t('bill.rent')}><Box value={`₹${data.amount.toLocaleString('en-IN')}`} /></Row>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: '#e0c9c0', margin: '0 4px' }} />

        {/* Right column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13, paddingLeft: 20 }}>
          <Row label={t('bill.date')}><Box value={fmtDate(data.date)} /></Row>
          <Row label={t('bill.roomNo')}><Box value={data.roomNumber} /></Row>
          {/* Date From / To inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#3a0000', whiteSpace: 'nowrap', fontFamily: SERIF }}>{t('bill.dateFrom')}</span>
            <Box value={fmtDate(data.periodFrom)} minW={90} />
            <span style={{ fontSize: 12, color: '#3a0000', whiteSpace: 'nowrap', fontFamily: SERIF }}>{t('bill.to')}</span>
            <Box value={fmtDate(data.periodTo)} minW={90} />
          </div>
          <Row label={t('bill.adv')}><Box value="" /></Row>
        </div>
      </div>

      {/* Horizontal divider */}
      <div style={{ height: 1, background: '#e0c9c0', margin: '16px 24px 14px' }} />

      {/* Notes + Payment Mode */}
      <div style={{ display: 'flex', gap: 24, padding: '0 24px 22px', alignItems: 'flex-start' }}>
        {/* Notes */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: MAROON, marginBottom: 8, fontFamily: SERIF }}>{t('bill.note')}</p>
          <div style={{
            background: '#fff', borderRadius: 6,
            padding: '10px 12px', minHeight: 80,
            fontSize: 12, color: '#555', lineHeight: 1.7, fontFamily: SANS,
          }}>
            {data.billNotes ?? ''}
          </div>
        </div>

        {/* Payment Mode */}
        <div style={{ minWidth: 180 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: MAROON, marginBottom: 12, fontFamily: SERIF }}>{t('bill.paymentMode')}</p>
          <div style={{ display: 'flex', gap: 18 }}>
            <PayMode label={t('bill.online')}  active={isOnline} />
            <PayMode label={t('bill.cash')}    active={isCash}   />
            <PayMode label={t('bill.cheque')}  active={isCheque} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function BillPreview({ data, onClose }: { data: BillData; onClose: () => void }) {
  const t = useT()
  const billRef  = useRef<HTMLDivElement>(null)
  const zoomRef  = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - 32
      setScale(Math.min(1, available / 880))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const captureJpeg = async (): Promise<{ dataUrl: string; blob: Blob } | null> => {
    const el = billRef.current
    const zw = zoomRef.current
    if (!el) return null
    // Reset zoom so html2canvas captures at full 880px resolution
    if (zw) zw.style.zoom = '1'
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: CREAM,
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.96)
      const blob = await (await fetch(dataUrl)).blob()
      return { dataUrl, blob }
    } finally {
      if (zw) zw.style.zoom = String(scale)
    }
  }

  const handleShare = async () => {
    setExporting(true)
    try {
      const result = await captureJpeg()
      if (!result) return

      if (navigator.share && navigator.canShare) {
        const file = new File([result.blob], `bill-${data.billNo}.jpg`, { type: 'image/jpeg' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Rent Bill – ${data.tenantName}` })
          return
        }
      }
      // Fallback: download the JPEG
      const a = document.createElement('a')
      a.href = result.dataUrl
      a.download = `bill-${data.billNo}.jpg`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  const handlePdf = async () => {
    setExporting(true)
    try {
      const result = await captureJpeg()
      if (!result) return
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = pdf.internal.pageSize.getWidth()
      const H = pdf.internal.pageSize.getHeight()
      const img = new window.Image()
      img.src = result.dataUrl
      await new Promise(r => { img.onload = r })
      const ratio = img.width / img.height
      const pdfH = W / ratio
      pdf.addImage(result.dataUrl, 'JPEG', 0, 0, W, pdfH > H ? H : pdfH)
      pdf.save(`bill-${data.billNo}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex flex-col items-center px-4 py-4 pb-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 w-full" style={{ maxWidth: 880 * scale }}>
          <span className="text-white font-semibold text-sm">{t('bill.preview')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-green-500 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-green-600 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {t('bill.share')}
            </button>
            <button
              onClick={handlePdf}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-white text-black text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('bill.pdf')}
            </button>
            <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* zoom wrapper — affects layout so bill fits screen, reset before capture */}
        <div ref={zoomRef} style={{ zoom: scale, width: 880 }}>
          <div
            ref={billRef}
            style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
          >
            <BillContent data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
