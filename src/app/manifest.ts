import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function cloudinaryResize(url: string, size: number): string {
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill/`)
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get('host') ?? ''
  const domain = host.split(':')[0] // strip port if present

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.domain, domain))
    .limit(1)

  const name      = org?.name       ?? 'KiraayaBook'
  const shortName = org?.short_name ?? 'KiraayaBook'
  const logoUrl   = org?.logo_url

  const icons: MetadataRoute.Manifest['icons'] = logoUrl
    ? [
        { src: cloudinaryResize(logoUrl, 192), sizes: '192x192', type: 'image/png' },
        { src: cloudinaryResize(logoUrl, 512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]

  return {
    name,
    short_name:       shortName,
    description:      `${name} — PG Management`,
    start_url:        '/dashboard',
    display:          'standalone',
    background_color: '#ffffff',
    theme_color:      '#000000',
    icons,
  }
}
