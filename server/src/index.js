import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { connectDb } from './db.js'
import authRoutes from './routes/auth.js'
import setRoutes from './routes/sets.js'
import inventoryRoutes from './routes/inventory.js'
import buildRoutes from './routes/build.js'
import wishlistRoutes from './routes/wishlist.js'

const app = express()
app.use(cors({
  origin: config.clientUrl,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.options('*', cors({
  origin: config.clientUrl,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/sets', setRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/build', buildRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Something went wrong' }) })

connectDb().then(() => app.listen(config.port, () => console.log(`BrickVault API listening on port ${config.port}`))).catch((error) => { console.error('Could not start BrickVault API:', error.message); process.exit(1) })
