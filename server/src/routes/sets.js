import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { getSetParts, getSetWithParts } from '../services/rebrickable.js'
import { getUserRebrickableKey } from '../services/credentials.js'

const router = Router()

router.get('/lookup/:setNum', requireAuth, async (req, res) => {
  try {
    const data = await getSetWithParts(req.params.setNum, await getUserRebrickableKey(req.user._id))
    res.json(data)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

router.get('/owned', requireAuth, async (req, res) => {
  const sets = await OwnedSet.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select('-parts')

  res.json({ sets })
})

router.post('/owned', requireAuth, async (req, res) => {
  try {
    const { setNum, copyCount = 1 } = req.body

    if (!setNum) {
      return res.status(400).json({ error: 'setNum is required' })
    }

    const copies = Number(copyCount)
    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).json({ error: 'copyCount must be a positive integer' })
    }

    const setData = await getSetWithParts(setNum, await getUserRebrickableKey(req.user._id))

    const ownedSet = await OwnedSet.create({
      userId: req.user._id,
      setNum: setData.setNum,
      setName: setData.setName,
      copyCount: copies,
      parts: setData.parts,
      partCount: setData.parts.length,
      imageUrl: setData.imageUrl,
    })

    res.status(201).json({ set: ownedSet })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/owned/backfill-part-metadata', requireAuth, async (req, res) => {
  try {
    const ownedSets = await OwnedSet.find({ userId: req.user._id })
    const outdatedSets = ownedSets.filter((ownedSet) =>
      ownedSet.parts.some((part) => part.type === 'part' && !part.basePartNum),
    )
    const apiKey = await getUserRebrickableKey(req.user._id)

    for (const [index, ownedSet] of outdatedSets.entries()) {
      ownedSet.parts = await getSetParts(ownedSet.setNum, apiKey)
      ownedSet.partCount = ownedSet.parts.length
      await ownedSet.save()
      if (index < outdatedSets.length - 1) await new Promise((resolve) => setTimeout(resolve, 1100))
    }

    res.json({ updatedSets: outdatedSets.length })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/owned/:id', requireAuth, async (req, res) => {
  const result = await OwnedSet.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  })

  if (!result) {
    return res.status(404).json({ error: 'Set not found' })
  }

  res.json({ ok: true })
})

export default router
