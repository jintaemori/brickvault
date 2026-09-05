import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { getSetWithParts } from '../services/rebrickable.js'

const router = Router()

router.get('/:setNum', requireAuth, async (req, res) => {
  try {
    const targetSet = await getSetWithParts(req.params.setNum)
    const ownedSets = await OwnedSet.find({ userId: req.user._id })
    const availableByPart = new Map()
    for (const ownedSet of ownedSets) {
      for (const part of ownedSet.parts) {
        availableByPart.set(part.canonicalId, (availableByPart.get(part.canonicalId) || 0) + part.qtyPerSet * ownedSet.copyCount)
      }
    }
    const parts = targetSet.parts.map((part) => {
      const available = availableByPart.get(part.canonicalId) || 0
      const missing = Math.max(0, part.qtyPerSet - available)
      return { ...part, required: part.qtyPerSet, available, missing, status: missing === 0 ? 'have' : 'missing' }
    })
    const totalRequired = parts.reduce((sum, part) => sum + part.required, 0)
    const totalMissing = parts.reduce((sum, part) => sum + part.missing, 0)
    res.json({
      set: { setNum: targetSet.setNum, setName: targetSet.setName, imageUrl: targetSet.imageUrl },
      summary: { totalRequired, totalMissing, totalAvailable: totalRequired - totalMissing, canBuild: totalMissing === 0, uniqueParts: parts.length, missingPartTypes: parts.filter((part) => part.missing > 0).length },
      parts,
    })
  } catch (error) { res.status(404).json({ error: error.message }) }
})

export default router
