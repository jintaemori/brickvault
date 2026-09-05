import { config } from '../config.js'

const BASE_URL = 'https://rebrickable.com/api/v3'
const USER_AGENT = 'BrickVault/0.1 (lego inventory app)'

async function rebrickableFetch(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('key', config.rebrickableApiKey)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Rebrickable API error (${response.status}): ${body}`)
  }

  return response.json()
}

export async function resolveSetNumber(input) {
  const trimmed = input.trim()

  if (/^\d+-\d+$/.test(trimmed)) {
    return getSet(trimmed)
  }

  const results = await rebrickableFetch('/lego/sets/', {
    search: trimmed,
    page_size: 10,
  })

  const exact = results.results?.find((set) => set.set_num.startsWith(`${trimmed}-`))
  if (exact) return exact

  const partial = results.results?.[0]
  if (!partial) {
    throw new Error(`No set found for "${input}"`)
  }

  return partial
}

export async function getSet(setNum) {
  return rebrickableFetch(`/lego/sets/${setNum}/`)
}

export async function getSetParts(setNum) {
  const parts = []
  let nextUrl = null
  let page = 1

  do {
    const data = nextUrl
      ? await fetch(nextUrl, { headers: { 'User-Agent': USER_AGENT } }).then((r) => r.json())
      : await rebrickableFetch(`/lego/sets/${setNum}/parts/`, {
          page_size: 1000,
          inc_color_details: 1,
        })

    for (const row of data.results || []) {
      parts.push(normalizePart(row))
    }

    nextUrl = data.next
    page += 1
  } while (nextUrl && page < 20)

  return parts
}

function normalizePart(row) {
  const part = row.part || {}
  const color = row.color || {}
  const isMinifig = part.part_cat_id === 69 || part.name?.toLowerCase().includes('minifig')

  if (isMinifig) {
    return {
      canonicalId: `minifig:${part.part_num}`,
      name: part.name,
      type: 'minifig',
      designId: part.part_num,
      partNum: part.part_num,
      colorId: null,
      colorName: null,
      rebrickableId: part.part_num,
      brickOwlBoid: null,
      qtyPerSet: row.quantity,
      imageUrl: part.part_img_url || null,
    }
  }

  return {
    canonicalId: `part:${part.part_num}:${color.id}`,
    name: part.name,
    type: 'part',
    designId: part.part_num,
    partNum: part.part_num,
    colorId: color.id,
    colorName: color.name,
    rebrickableId: part.part_num,
    brickOwlBoid: null,
    qtyPerSet: row.quantity,
    imageUrl: part.part_img_url || null,
  }
}

export async function getSetWithParts(setNumInput) {
  const setMeta = await resolveSetNumber(setNumInput)
  const parts = await getSetParts(setMeta.set_num)

  return {
    setNum: setMeta.set_num,
    setName: setMeta.name,
    year: setMeta.year,
    numParts: setMeta.num_parts,
    imageUrl: setMeta.set_img_url,
    parts,
  }
}
