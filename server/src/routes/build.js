import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { OwnedSet } from '../models/OwnedSet.js'
import { SetCache } from '../models/SetCache.js'
import { getSetWithParts } from '../services/rebrickable.js'
import { getUserRebrickableKey } from '../services/credentials.js'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const router = Router()

export function matchKey(part, { ignoreColors, ignorePrints }) {
  if (part.type === 'minifig') return part.canonicalId
  const partIdentity = ignorePrints ? (part.basePartNum || part.partNum) : part.partNum
  return ignoreColors ? `part:${partIdentity}` : `part:${partIdentity}:${part.colorId}`
}

export function computeCoverage(cachedParts, ownedSets, matching) {
  const availableByKey = new Map()
  const inventoryMatchesByKey = new Map()

  for (const ownedSet of ownedSets) {
    const effectiveCopyCount = ownedSet.excludeFromBuild
      ? Math.max(0, ownedSet.copyCount - (ownedSet.excludeCount ?? ownedSet.copyCount))
      : ownedSet.copyCount
    if (effectiveCopyCount === 0) continue
    for (const part of ownedSet.parts) {
      const key = matchKey(part, matching)
      const quantity = part.qtyPerSet * effectiveCopyCount
      availableByKey.set(key, (availableByKey.get(key) || 0) + quantity)
      const matches = inventoryMatchesByKey.get(key) || new Map()
      const existing = matches.get(part.canonicalId) || {
        canonicalId: part.canonicalId,
        name: part.name,
        partNum: part.partNum,
        colorName: part.colorName,
        isPrinted: part.isPrinted,
        imageUrl: part.imageUrl,
        quantity: 0,
      }
      existing.quantity += quantity
      matches.set(part.canonicalId, existing)
      inventoryMatchesByKey.set(key, matches)
    }
  }

  const remainingByKey = new Map(availableByKey)
  const parts = cachedParts.map((part) => {
    const key = matchKey(part, matching)
    const poolAvailable = availableByKey.get(key) || 0
    const available = Math.min(part.qtyPerSet, remainingByKey.get(key) || 0)
    const missing = part.qtyPerSet - available
    remainingByKey.set(key, Math.max(0, (remainingByKey.get(key) || 0) - part.qtyPerSet))
    const inventoryMatches = [...(inventoryMatchesByKey.get(key)?.values() || [])]
      .sort((a, b) => a.name.localeCompare(b.name) || (a.colorName || '').localeCompare(b.colorName || ''))
    return { ...part.toObject?.() ?? part, required: part.qtyPerSet, available, poolAvailable, inventoryMatches, missing, status: missing === 0 ? 'have' : 'missing' }
  })

  const totalRequired = parts.reduce((sum, p) => sum + p.required, 0)
  const totalMissing = parts.reduce((sum, p) => sum + p.missing, 0)
  return {
    parts,
    summary: {
      totalRequired,
      totalMissing,
      totalAvailable: totalRequired - totalMissing,
      canBuild: totalMissing === 0,
      uniqueParts: parts.length,
      missingPartTypes: parts.filter((p) => p.missing > 0).length,
    },
  }
}

async function resolveSet(setNum, apiKey) {
  const cached = await SetCache.findOne({ setNum })
  if (cached && Date.now() - cached.lastFetched.getTime() < CACHE_TTL_MS) {
    return cached
  }
  const fresh = await getSetWithParts(setNum, apiKey)
  await SetCache.findOneAndUpdate(
    { setNum: fresh.setNum },
    { setNum: fresh.setNum, setName: fresh.setName, imageUrl: fresh.imageUrl, numParts: fresh.numParts, parts: fresh.parts, lastFetched: new Date() },
    { upsert: true, new: true },
  )
  return fresh
}

router.get('/:setNum', requireAuth, async (req, res) => {
  try {
    const matching = {
      ignoreColors: req.query.ignoreColors === 'true',
      ignorePrints: req.query.ignorePrints === 'true',
    }
    const apiKey = await getUserRebrickableKey(req.user._id)
    const targetSet = await resolveSet(req.params.setNum, apiKey)
    const ownedSets = await OwnedSet.find({ userId: req.user._id })
    const { parts, summary } = computeCoverage(targetSet.parts, ownedSets, matching)
    res.json({
      set: { setNum: targetSet.setNum, setName: targetSet.setName, imageUrl: targetSet.imageUrl },
      matching,
      summary,
      parts,
    })
  } catch (error) { res.status(404).json({ error: error.message }) }
})

export default router
