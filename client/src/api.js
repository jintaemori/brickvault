const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('brickvault-token')
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

export const api = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  rebrickableStatus: () => request('/auth/rebrickable-key'),
  saveRebrickableKey: (apiKey) => request('/auth/rebrickable-key', { method: 'PUT', body: JSON.stringify({ apiKey }) }),
  lookupSet: (setNum) => request(`/sets/lookup/${encodeURIComponent(setNum)}`),
  listOwnedSets: () => request('/sets/owned'),
  addOwnedSet: (data) => request('/sets/owned', { method: 'POST', body: JSON.stringify(data) }),
  backfillPartMetadata: () => request('/sets/owned/backfill-part-metadata', { method: 'POST' }),
  removeOwnedSet: (id) => request(`/sets/owned/${id}`, { method: 'DELETE' }),
  updateOwnedSet: (id, data) => request(`/sets/owned/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  incrementCopyCount: (id) => request(`/sets/owned/${id}`, { method: 'PATCH', body: JSON.stringify({ incrementCopyCount: true }) }),
  inventory: () => request('/inventory'),
  buildCheck: (setNum, matching) => {
    const query = new URLSearchParams({ ignoreColors: String(matching.ignoreColors), ignorePrints: String(matching.ignorePrints) })
    return request(`/build/${encodeURIComponent(setNum)}?${query}`)
  },
  listWishlist: () => request('/wishlist'),
  listWishlistData: () => request('/wishlist/data'),
  addToWishlist: (data) => request('/wishlist', { method: 'POST', body: JSON.stringify(data) }),
  removeFromWishlist: (id) => request(`/wishlist/${id}`, { method: 'DELETE' }),
}
