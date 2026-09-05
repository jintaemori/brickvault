import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { view = 'total', setId, type, colorId } = req.query
  const ownedSets = await OwnedSet.find({ userId: req.user._id })

  if (view === 'by-set') {
    return res.json({
      view,
      sets: ownedSets.map((set) => ({
        id: set._id,
        setNum: set.setNum,
        setName: set.setName,
        copyCount: set.copyCount,
        partCount: set.partCount,
        parts: set.parts,
      })),
    })
  }

  const aggregated = new Map()

  for (const ownedSet of ownedSets) {
    if (setId && ownedSet._id.toString() !== setId) continue

    for (const part of ownedSet.parts) {
      if (type && part.type !== type) continue
      if (colorId && String(part.colorId) !== String(colorId)) continue

      const totalQty = part.qtyPerSet * ownedSet.copyCount
      const existing = aggregated.get(part.canonicalId)

      if (existing) {
        existing.quantity += totalQty
        existing.sources.push({
          ownedSetId: ownedSet._id,
          setNum: ownedSet.setNum,
          setName: ownedSet.setName,
          quantity: totalQty,
        })
      } else {
        aggregated.set(part.canonicalId, {
          ...part,
          quantity: totalQty,
          sources: [{
            ownedSetId: ownedSet._id,
            setNum: ownedSet.setNum,
            setName: ownedSet.setName,
            quantity: totalQty,
          }],
        })
      }
    }
  }

  const parts = [...aggregated.values()].sort((a, b) =>
    (a.name || a.partNum || 'Unnamed LEGO part').localeCompare(b.name || b.partNum || 'Unnamed LEGO part'),
  )
  const needsPartMetadataBackfill = ownedSets.some((ownedSet) =>
    ownedSet.parts.some((part) => part.type === 'part' && !part.basePartNum),
  )

  res.json({
    view: view || 'total',
    totalUniqueParts: parts.length,
    totalPieces: parts.reduce((sum, part) => sum + part.quantity, 0),
    needsPartMetadataBackfill,
    parts,
  })
})

export default router
