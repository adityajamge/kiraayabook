import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import * as http from 'http'
import * as readline from 'readline'
import { exec } from 'child_process'

config({ path: '.env.local' })

const REDIRECT_URI = 'http://localhost:9999/callback'
const SCOPE        = 'https://www.googleapis.com/auth/drive.file'

const sql = neon(process.env.DATABASE_URL!)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(res => rl.question(q, res))

function openBrowser(url: string) {
  exec(`start "" "${url}"`)
}

function waitForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, 'http://localhost:9999')
      const code  = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      res.writeHead(200, { 'Content-Type': 'text/html' })
      if (error) {
        res.end('<h2>❌ Access denied.</h2><p>You can close this tab.</p>')
        server.close()
        reject(new Error(`OAuth error: ${error}`))
        return
      }
      if (code) {
        res.end('<h2>✓ Google Drive connected!</h2><p>You can close this tab and go back to the terminal.</p>')
        server.close()
        resolve(code)
      }
    })
    server.listen(9999, () => console.log('Waiting on port 9999 for Google redirect...'))
  })
}

async function exchangeCode(code: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    error?: string
  }
  if (data.error) throw new Error(`Token exchange failed: ${data.error}`)
  return data
}

async function createDriveFolder(accessToken: string, orgName: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name:     `KiraayaBook – ${orgName}`,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  const data = await res.json() as { id: string; error?: { message: string } }
  if (data.error) throw new Error(`Drive folder creation failed: ${data.error.message}`)
  return data.id
}

async function main() {
  console.log('\n── KiraayaBook: Connect Google Drive ──\n')

  const email = await ask('PG owner email: ')

  const rows = await sql`
    SELECT o.id, o.name, o.google_client_id FROM organisations o
    JOIN users u ON u.org_id = o.id
    WHERE u.email = ${email}
    LIMIT 1
  `

  if (!rows.length) {
    console.error(`\nNo PG found for email: ${email}\n`)
    process.exit(1)
  }

  const org = rows[0] as { id: string; name: string; google_client_id: string | null }
  console.log(`\nFound: "${org.name}" (${org.id})`)

  // Ask for this org's own Google Cloud credentials
  console.log('\nEnter the Google Cloud OAuth credentials for this PG owner\'s project:\n')
  const clientId     = await ask('Google Client ID:     ')
  const clientSecret = await ask('Google Client Secret: ')
  rl.close()

  if (!clientId.trim() || !clientSecret.trim()) {
    console.error('\nClient ID and Secret are required.')
    process.exit(1)
  }

  // Build OAuth URL using their credentials
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id',     clientId)
  authUrl.searchParams.set('redirect_uri',  REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope',         SCOPE)
  authUrl.searchParams.set('access_type',   'offline')
  authUrl.searchParams.set('prompt',        'consent')

  console.log('\nOpening browser for Google sign-in...')
  console.log('(If it does not open, paste this URL in your browser:)')
  console.log('\n' + authUrl.toString() + '\n')
  openBrowser(authUrl.toString())

  const code   = await waitForCode()
  console.log('\n✓ Authorization received. Exchanging for tokens...')

  const tokens = await exchangeCode(code, clientId, clientSecret)
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  console.log('✓ Tokens received. Creating Drive folder...')

  const folderId = await createDriveFolder(tokens.access_token, org.name)
  console.log(`✓ Folder created in Drive (id: ${folderId})`)

  await sql`
    UPDATE organisations SET
      google_client_id       = ${clientId},
      google_client_secret   = ${clientSecret},
      google_access_token    = ${tokens.access_token},
      google_refresh_token   = ${tokens.refresh_token},
      google_token_expiry    = ${expiry}::timestamp,
      google_drive_folder_id = ${folderId}
    WHERE id = ${org.id}
  `

  console.log(`\n✓ Done! Google Drive connected for "${org.name}".\n`)
  process.exit(0)
}

main().catch(err => { console.error('\n' + err.message + '\n'); process.exit(1) })
