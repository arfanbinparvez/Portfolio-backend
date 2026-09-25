// Express API server — deployed standalone on Northflank.
// No static file serving here; the frontend is a separate deploy on Vercel.
// Vercel (frontend) calls this server's URL directly over CORS.

import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Only requests from your deployed frontend (and localhost, for dev) are
// allowed to call this API. Set FRONTEND_URL in Northflank's environment
// variables to your actual Vercel URL once you have it, e.g.
// https://arfan-portfolio.vercel.app — no trailing slash.
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// Both third-party clients are created lazily, inside the route handlers,
// so a missing API key only fails that one request gracefully instead of
// crashing the whole server at startup.
function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function getRedisClient() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Simple root + health check — useful for confirming the deploy is alive,
// and Northflank (like most platforms) can be pointed at this for health checks.
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'portfolio-backend' })
})
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// POST /api/contact — sends the contact form message to your inbox via Resend
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are all required.' })
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "That email address doesn't look valid." })
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long.' })
  }

  const resend = getResendClient()
  if (!resend) {
    console.error('RESEND_API_KEY is not set — see .env.example')
    return res.status(500).json({ error: 'Contact form is not configured yet.' })
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: process.env.CONTACT_TO_EMAIL,
      reply_to: email,
      subject: `Portfolio contact from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(502).json({ error: 'Failed to send — try again in a moment.' })
    }
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// POST /api/visits — increments and returns a persistent visit counter (Upstash Redis)
app.post('/api/visits', async (req, res) => {
  const redis = getRedisClient()
  if (!redis) {
    console.error('UPSTASH_REDIS_REST_URL / TOKEN not set — see .env.example')
    return res.status(500).json({ error: 'Visit counter is not configured yet.' })
  }

  try {
    const count = await redis.incr('portfolio:visits')
    return res.status(200).json({ count })
  } catch (err) {
    console.error('Visit counter error:', err)
    return res.status(500).json({ error: 'Could not update visit count.' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
