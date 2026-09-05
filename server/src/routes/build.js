import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { getSetWithParts } from '../services/rebrickable.js'
import { getUserRebrickableKey } from '../services/credentials.js'

const router = Router()

function matchKey(part, { ignoreColors, ignorePrints }) {
  if (part.type === 'minifig') return part.canonicalId
  const partIdentity = ignorePrints ? (part.basePartNum || part.partNum) : part.partNum
  return ignoreColors ? `part:${partIdentity}` : `part:${partIdentity}:${part.colorId}`
}

router.get('/:setNum', requireAuth, async (req, res) => {
  try {
    const matching = {
      ignoreColors: req.query.ignoreColors === 'true',
      ignorePrints: req.query.ignorePrints === 'true',
    }
    const apiKey = await getUserRebrickableKey(req.user._id)
    const targetSet = await getSetWithParts(req.params.setNum, apiKey)
    const ownedSets = await OwnedSet.find({ userId: req.user._id })
    const availableByKey = new Map()

    for (const ownedSet of ownedSets) {
      for (const part of ownedSet.parts) {
        const key = matchKey(part, matching)
        availableByKey.set(key, (availableByKey.get(key) || 0) + part.qtyPerSet * ownedSet.copyCount)
      }
    }

    const remainingByKey = new Map(availableByKey)
    const parts = targetSet.parts.map((part) => {
      const key = matchKey(part, matching)
      const poolAvailable = availableByKey.get(key) || 0
      const available = Math.min(part.qtyPerSet, remainingByKey.get(key) || 0)
      const missing = part.qtyPerSet - available
      remainingByKey.set(key, Math.max(0, (remainingByKey.get(key) || 0) - part.qtyPerSet))
      return { ...part, required: part.qtyPerSet, available, poolAvailable, missing, status: missing === 0 ? 'have' : 'missing' }
    })

    const totalRequired = parts.reduce((sum, part) => sum + part.required, 0)
    const totalMissing = parts.reduce((sum, part) => sum + part.missing, 0)
    res.json({
      set: { setNum: targetSet.setNum, setName: targetSet.setName, imageUrl: targetSet.imageUrl },
      matching,
      summary: { totalRequired, totalMissing, totalAvailable: totalRequired - totalMissing, canBuild: totalMissing === 0, uniqueParts: parts.length, missingPartTypes: parts.filter((part) => part.missing > 0).length },
      parts,
    })
  } catch (error) { res.status(404).json({ error: error.message }) }
})

export default router
