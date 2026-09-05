import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { WishlistItem } from '../models/WishlistItem.js'
import { SetCache } from '../models/SetCache.js'
import { OwnedSet } from '../models/OwnedSet.js'

const router = Router()

// Lightweight list — no coverage computation, used for wishlist state init
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json({ items })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Full data endpoint — returns wishlist items with cached parts + owned inventory for client-side coverage
router.get('/data', requireAuth, async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user._id }).sort({ createdAt: -1 })
    if (!items.length) return res.json({ items: [], ownedSets: [] })

    const [ownedSets, cachedSets] = await Promise.all([
      OwnedSet.find({ userId: req.user._id }),
      SetCache.find({ setNum: { $in: items.map((i) => i.setNum) } }),
    ])

    const cacheBySetNum = new Map(cachedSets.map((c) => [c.setNum, c]))

    const result = items.map((item) => {
      const cached = cacheBySetNum.get(item.setNum)
      return {
        _id: item._id,
        setNum: item.setNum,
        setName: item.setName,
        imageUrl: item.imageUrl,
        parts: cached ? cached.parts : null,
      }
    })

    // Strip parts from ownedSets down to just what coverage needs
    const inventory = ownedSets.map((s) => ({
      copyCount: s.copyCount,
      excludeFromBuild: s.excludeFromBuild,
      excludeCount: s.excludeCount,
      parts: s.parts,
    }))

    res.json({ items: result, ownedSets: inventory })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { setNum, setName, imageUrl, matching = {} } = req.body
    if (!setNum || !setName) return res.status(400).json({ error: 'setNum and setName are required' })

    const item = await WishlistItem.findOneAndUpdate(
      { userId: req.user._id, setNum },
      { setName, imageUrl, matching: { ignoreColors: !!matching.ignoreColors, ignorePrints: !!matching.ignorePrints } },
      { upsert: true, new: true },
    )
    res.status(201).json({ item })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const result = await WishlistItem.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
  if (!result) return res.status(404).json({ error: 'Wishlist item not found' })
  res.json({ ok: true })
})

export default router
