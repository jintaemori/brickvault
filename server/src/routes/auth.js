import { Router } from 'express'
import { User } from '../models/User.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { decrypt, encrypt } from '../services/credentials.js'
import { validateApiKey } from '../services/rebrickable.js'

const router = Router()

function publicUser(user) {
  return { id: user._id, email: user.email, name: user.name, hasRebrickableKey: Boolean(user.rebrickableKey) }
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await User.hashPassword(password)
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name?.trim() || '',
    })

    const token = signToken(user._id)
    res.status(201).json({
      token,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+rebrickableKey')
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user._id)
    res.json({
      token,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/rebrickable-key', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).select('+rebrickableKey')
  if (!user?.rebrickableKey) return res.json({ linked: false })
  try {
    decrypt(user.rebrickableKey)
    res.json({ linked: true })
  } catch {
    res.json({ linked: false })
  }
})

router.put('/rebrickable-key', requireAuth, async (req, res) => {
  const apiKey = req.body.apiKey?.trim()
  if (!apiKey) return res.status(400).json({ error: 'A Rebrickable API key is required' })
  try {
    await validateApiKey(apiKey)
  } catch {
    return res.status(400).json({ error: 'Rebrickable rejected that API key. Check it and try again.' })
  }

  try {
    await User.findByIdAndUpdate(req.user._id, { rebrickableKey: encrypt(apiKey) })
    res.json({ linked: true })
  } catch (error) {
    console.error('Could not encrypt Rebrickable API key:', error.message)
    res.status(500).json({ error: 'BrickVault is missing its encryption configuration. Ask the app owner to set ENCRYPTION_KEY.' })
  }
})

export default router
