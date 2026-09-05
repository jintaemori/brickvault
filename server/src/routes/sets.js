import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { getSetWithParts } from '../services/rebrickable.js'

const router = Router()

router.get('/lookup/:setNum', requireAuth, async (req, res) => {
  try {
    const data = await getSetWithParts(req.params.setNum)
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

    const setData = await getSetWithParts(setNum)

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
