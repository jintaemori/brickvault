import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { WishlistItem } from '../models/WishlistItem.js'
import { SetCache } from '../models/SetCache.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { computeCoverage } from './build.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user._id }).sort({ createdAt: -1 })
    if (!items.length) return res.json({ items: [] })

    const ownedSets = await OwnedSet.find({ userId: req.user._id })

    const results = await Promise.all(
      items.map(async (item) => {
        const cached = await SetCache.findOne({ setNum: item.setNum })
        if (!cached) {
          return {
            _id: item._id,
            setNum: item.setNum,
            setName: item.setName,
            imageUrl: item.imageUrl,
            matching: item.matching,
            summary: null,
          }
        }
        const { summary } = computeCoverage(cached.parts, ownedSets, item.matching)
        return {
          _id: item._id,
          setNum: item.setNum,
          setName: item.setName,
          imageUrl: item.imageUrl,
          matching: item.matching,
          summary,
        }
      }),
    )

    res.json({ items: results })
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
