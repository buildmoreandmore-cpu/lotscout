/**
 * Optional email notification via Composio (Gmail). No-op if not configured.
 */
import { optionalEnv } from './env'

export async function sendEmail(subject: string, body: string): Promise<void> {
  const key = optionalEnv('COMPOSIO_KEY')
  const connection = optionalEnv('GMAIL_CONNECTION')
  const recipient = optionalEnv('NOTIFICATION_EMAIL')
  if (!key || !connection || !recipient) {
    console.log('📭 Email skipped (COMPOSIO_KEY / GMAIL_CONNECTION / NOTIFICATION_EMAIL not set)')
    return
  }
  const api = optionalEnv('COMPOSIO_API')
    || 'https://backend.composio.dev/api/v2/actions/GMAIL_SEND_EMAIL/execute'
  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        connectedAccountId: connection,
        input: { recipient_email: recipient, subject, body },
      }),
    })
    const data = await res.json()
    console.log(data.successfull || data.successful ? '📧 Email sent' : '❌ Email failed')
  } catch (err) {
    console.error('❌ Email error:', err instanceof Error ? err.message : err)
  }
}
