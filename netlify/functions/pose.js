export async function handler(event) {
  const q = event.queryStringParameters || {}
  const text = q.text || ''
  const spoken = q.spoken || 'es'
  const signed = q.signed || 'mfs'

  if (!text.trim()) {
    return { statusCode: 400, body: 'Missing text' }
  }

  const upstream =
    'https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose?' +
    new URLSearchParams({ text, spoken, signed })

  try {
    const r = await fetch(upstream)
    const buffer = Buffer.from(await r.arrayBuffer())

    return {
      statusCode: r.status,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err?.message || 'pose proxy failed' }),
    }
  }
}
