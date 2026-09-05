const BASE_URL = 'https://rebrickable.com/api/v3'
const USER_AGENT = 'BrickVault/0.1 (lego inventory app)'

async function rebrickableFetch(path, apiKey, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('key', apiKey)

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

export async function validateApiKey(apiKey) {
  await rebrickableFetch('/lego/sets/', apiKey, { page_size: 1 })
}

export async function resolveSetNumber(input, apiKey) {
  const trimmed = input.trim()

  if (/^\d+-\d+$/.test(trimmed)) {
    return getSet(trimmed, apiKey)
  }

  const results = await rebrickableFetch('/lego/sets/', apiKey, {
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

export async function getSet(setNum, apiKey) {
  return rebrickableFetch(`/lego/sets/${setNum}/`, apiKey)
}

export async function getSetParts(setNum, apiKey) {
  const parts = []
  let nextUrl = null
  let page = 1

  do {
    let data
    if (nextUrl) {
      const url = new URL(nextUrl)
      url.searchParams.set('key', apiKey)
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!response.ok) throw new Error(`Rebrickable API error (${response.status})`)
      data = await response.json()
    } else {
      data = await rebrickableFetch(`/lego/sets/${setNum}/parts/`, apiKey, {
        page_size: 1000,
        inc_color_details: 1,
      })
    }

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

export async function getSetWithParts(setNumInput, apiKey) {
  const setMeta = await resolveSetNumber(setNumInput, apiKey)
  const parts = await getSetParts(setMeta.set_num, apiKey)

  return {
    setNum: setMeta.set_num,
    setName: setMeta.name,
    year: setMeta.year,
    numParts: setMeta.num_parts,
    imageUrl: setMeta.set_img_url,
    parts,
  }
}
