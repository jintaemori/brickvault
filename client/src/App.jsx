import { useEffect, useState } from 'react'
import { api } from './api'
import './App.css'

function SetForm({ label, action, busy, onSubmit }) {
  const [setNum, setSetNum] = useState('')
  function submit(event) {
    event.preventDefault()
    if (setNum.trim()) onSubmit(setNum.trim())
  }
  return (
    <form className="set-form" onSubmit={submit}>
      <label>{label}<input value={setNum} onChange={(event) => setSetNum(event.target.value)} placeholder="e.g. 71845" /></label>
      <button disabled={busy}>{busy ? 'Working…' : action}</button>
    </form>
  )
}

function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const data = mode === 'login' ? await api.login(form) : await api.register(form)
      localStorage.setItem('brickvault-token', data.token)
      localStorage.setItem('brickvault-user', JSON.stringify(data.user))
      onAuthenticated(data.user)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-shell"><section className="auth-card">
    <p className="eyebrow">BRICKVAULT</p><h1>Your LEGO parts, accounted for.</h1>
    <p className="muted">Add dismantled sets, then find out what you can build with the pieces you own.</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && <input required placeholder="Your name" onChange={(e) => setForm({ ...form, name: e.target.value })} />}
      <input required type="email" placeholder="Email address" onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input required minLength="8" type="password" placeholder="Password (8+ characters)" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <p className="error">{error}</p>}<button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
    </form>
    <button className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}</button>
  </section></main>
}

function ApiKeySetup({ checking, onSaved, onLogout }) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api.saveRebrickableKey(apiKey); onSaved() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-shell"><section className="auth-card key-dialog" role="dialog" aria-modal="true" aria-labelledby="api-key-title">
    <p className="eyebrow">ONE-TIME SETUP</p><h1 id="api-key-title">Link Rebrickable.</h1>
    {checking ? <p className="muted">Checking your account setup…</p> : <><p className="muted">BrickVault uses your personal Rebrickable key only to look up set inventories. It is encrypted before it is saved and never shown again.</p>
      <form className="auth-form" onSubmit={submit}><input required type="password" autoComplete="off" placeholder="Paste your Rebrickable API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />{error && <p className="error">{error}</p>}<button disabled={busy}>{busy ? 'Verifying…' : 'Link key and continue'}</button></form>
      <a className="help-link" href="https://rebrickable.com/api/" target="_blank" rel="noreferrer">Need a free Rebrickable API key?</a><br /><button className="text-button" onClick={onLogout}>Log out</button></>}
  </section></main>
}

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('brickvault-user') || 'null'))
  const [keyReady, setKeyReady] = useState(null)
  const [tab, setTab] = useState('add')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ownedSets, setOwnedSets] = useState([])
  const [inventory, setInventory] = useState(null)
  const [preview, setPreview] = useState(null)
  const [copies, setCopies] = useState(1)
  const [build, setBuild] = useState(null)
  const [matching, setMatching] = useState({ ignoreColors: false, ignorePrints: false })
  const [buildResultTab, setBuildResultTab] = useState('need')
  const [needSort, setNeedSort] = useState('desc')
  const [wishlist, setWishlist] = useState([])
  const [wishlistBusy, setWishlistBusy] = useState(false)
  async function refresh() {
    let [sets, parts, wl] = await Promise.all([api.listOwnedSets(), api.inventory(), api.listWishlist()])
    if (parts.needsPartMetadataBackfill) {
      await api.backfillPartMetadata()
      ;[sets, parts] = await Promise.all([api.listOwnedSets(), api.inventory()])
      setNotice('Updated saved sets with printed-part metadata.')
    }
    setOwnedSets(sets.sets); setInventory(parts); setWishlist(wl.items)
  }
  useEffect(() => {
    if (!user || keyReady !== true) return undefined
    const timer = window.setTimeout(() => refresh().catch((err) => setError(err.message)), 0)
    return () => window.clearTimeout(timer)
  }, [user, keyReady])
  useEffect(() => {
    if (!user) return undefined
    const timer = window.setTimeout(() => api.rebrickableStatus().then(({ linked }) => setKeyReady(linked)).catch((err) => setError(err.message)), 0)
    return () => window.clearTimeout(timer)
  }, [user])
  async function run(work) {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function lookup(setNum) { run(async () => { setPreview(await api.lookupSet(setNum)); setCopies(1) }) }
  function addSet() { run(async () => { await api.addOwnedSet({ setNum: preview.setNum, copyCount: copies }); await refresh(); setNotice(`${preview.setName} added to your vault.`); setPreview(null) }) }
  function removeSet(id) { run(async () => { await api.removeOwnedSet(id); await refresh(); setNotice('Set removed from your vault.') }) }
  async function incrementCopies(id) {
    try {
      const updated = await api.incrementCopyCount(id)
      setOwnedSets((prev) => prev.map((s) => s._id === id ? { ...s, ...updated.set } : s))
    } catch (err) { setError(err.message) }
  }
  async function updateExclusion(id, excludeFromBuild, excludeCount) {
    try {
      const updated = await api.updateOwnedSet(id, { excludeFromBuild, excludeCount })
      setOwnedSets((prev) => prev.map((s) => s._id === id ? { ...s, ...updated.set } : s))
    } catch (err) { setError(err.message) }
  }
  function check(setNum) {
    run(async () => {
      const result = await api.buildCheck(setNum, matching)
      setBuild(result)
      setBuildResultTab(result.summary.totalMissing > 0 ? 'need' : 'have')
    })
  }
  async function toggleWishlist(set, isWishlisted) {
    setWishlistBusy(true)
    try {
      if (isWishlisted) {
        const item = wishlist.find((w) => w.setNum === set.setNum)
        if (item) { await api.removeFromWishlist(item._id); setWishlist((prev) => prev.filter((w) => w._id !== item._id)) }
      } else {
        const { item } = await api.addToWishlist({ setNum: set.setNum, setName: set.setName, imageUrl: set.imageUrl, matching })
        setWishlist((prev) => [item, ...prev])
      }
    } catch (err) { setError(err.message) } finally { setWishlistBusy(false) }
  }
  async function removeFromWishlist(id) {
    try { await api.removeFromWishlist(id); setWishlist((prev) => prev.filter((w) => w._id !== id)) }
    catch (err) { setError(err.message) }
  }
  async function refreshWishlist() {
    try { const wl = await api.listWishlist(); setWishlist(wl.items) } catch (err) { setError(err.message) }
  }
  function logout() { localStorage.removeItem('brickvault-token'); localStorage.removeItem('brickvault-user'); setUser(null); setKeyReady(null) }
  function authenticated(account) { localStorage.setItem('brickvault-user', JSON.stringify(account)); setUser(account); setKeyReady(account.hasRebrickableKey) }
  function keySaved() { const updatedUser = { ...user, hasRebrickableKey: true }; localStorage.setItem('brickvault-user', JSON.stringify(updatedUser)); setUser(updatedUser); setKeyReady(true) }
  const buildParts = build
    ? build.parts
      .filter((part) => buildResultTab === 'have' ? part.missing === 0 : part.missing > 0)
      .sort((a, b) => buildResultTab === 'need'
        ? needSort === 'asc' ? a.missing - b.missing : b.missing - a.missing
        : a.name.localeCompare(b.name))
    : []
  if (!user) return <Auth onAuthenticated={authenticated} />
  if (keyReady !== true) return <ApiKeySetup checking={keyReady === null} onSaved={keySaved} onLogout={logout} />
  return <div className="app-shell"><header><a className="brand" href="#top">Brick<span>Vault</span></a><div className="account">{user.name || user.email}<button className="text-button" onClick={logout}>Log out</button></div></header>
    <main id="top"><section className="hero"><p className="eyebrow">PERSONAL LEGO INVENTORY</p><h1>Build from what you own.</h1><p>Track dismantled sets and see exactly which pieces stand between you and your next build.</p></section>
      <nav>{[['add', 'Add sets'], ['inventory', 'My inventory'], ['build', 'Build checker'], ['wishlist', 'Wishlist']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); if (id === 'wishlist') refreshWishlist() }}>{label}</button>)}</nav>
      {error && <p className="notice error">{error}</p>}{notice && <p className="notice success">{notice}</p>}
      {tab === 'add' && <section className="panel"><h2>Add a dismantled set</h2><p className="muted">Enter a set number and its official inventory will be added to yours.</p><SetForm label="Set number" action="Find set" busy={busy} onSubmit={lookup} />
        {preview && <article className="set-card">{preview.imageUrl && <img src={preview.imageUrl} alt="" />}<div><p className="eyebrow">{preview.setNum}</p><h3>{preview.setName}</h3><p className="muted">{preview.numParts} pieces in the official inventory</p><label className="copies">Copies you own <input type="number" min="1" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} /></label><button onClick={addSet} disabled={busy}>Add to my vault</button></div></article>}</section>}
      {tab === 'inventory' && <section className="panel"><div className="panel-title"><div><h2>My inventory</h2><p className="muted">Parts are summed across every dismantled set.</p></div>{inventory && <p className="stat"><strong>{inventory.totalPieces}</strong> pieces · {inventory.totalUniqueParts} unique</p>}</div>
        <div className="owned">{ownedSets.length ? ownedSets.map((set) => <article className="owned-set" key={set._id}><label className="exclude-toggle" title={set.excludeFromBuild ? 'Include in build checker' : 'Exclude from build checker'}><input type="checkbox" checked={!!set.excludeFromBuild} onChange={(e) => updateExclusion(set._id, e.target.checked, e.target.checked ? (set.excludeCount ?? set.copyCount) : null)} /><span className="exclude-pip" /></label>{set.imageUrl && <img src={set.imageUrl} alt="" />}<div><p className="eyebrow">{set.setNum} · {set.copyCount} {set.copyCount === 1 ? 'copy' : 'copies'}</p><h3>{set.setName}</h3><p className="muted">{set.partCount} part entries</p></div><div className="owned-set-actions">{set.excludeFromBuild && set.copyCount > 1 && <label className="exclude-count">Exclude <input type="number" min="1" max={set.copyCount} value={set.excludeCount ?? set.copyCount} onChange={(e) => updateExclusion(set._id, true, Math.min(set.copyCount, Math.max(1, Number(e.target.value))))} /> of {set.copyCount}</label>}<button className="add-copy" title="Add another copy" onClick={() => incrementCopies(set._id)} disabled={busy}>+</button><button className="danger icon-btn" title="Remove set" onClick={() => removeSet(set._id)} disabled={busy}><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></div></article>) : <p className="empty">Your vault is empty. Add your first dismantled set.</p>}</div>
        {inventory?.parts?.length > 0 && <Parts parts={inventory.parts.slice(0, 20)} />}</section>}
      {tab === 'build' && <section className="panel"><h2>Can I build this?</h2><p className="muted">This checks your vault without removing any pieces. Minifigures always match exactly.</p>
        <div className="matching-options"><label><input type="checkbox" checked={matching.ignoreColors} onChange={(event) => setMatching({ ...matching, ignoreColors: event.target.checked })} /> Ignore part colors</label><label><input type="checkbox" checked={matching.ignorePrints} onChange={(event) => setMatching({ ...matching, ignorePrints: event.target.checked })} /> Ignore printed designs</label></div>
        <SetForm label="Set number to build" action="Check parts" busy={busy} onSubmit={check} />
        {build && <><article className="set-card build-card">{build.set.imageUrl && <img src={build.set.imageUrl} alt="" />}<div><p className="eyebrow">{build.set.setNum}</p><h3>{build.set.setName}</h3><p className={`status ${build.summary.canBuild ? 'have' : 'missing'}`}>{build.summary.canBuild ? 'You can build this set!' : `${build.summary.totalMissing} pieces still needed`}</p></div><div className="build-card-right"><p className="summary"><strong>{build.summary.uniqueParts - build.summary.missingPartTypes}/{build.summary.uniqueParts}</strong> part types covered</p><button className={`wishlist-btn ${wishlist.some((w) => w.setNum === build.set.setNum) ? 'wishlisted' : ''}`} onClick={() => toggleWishlist(build.set, wishlist.some((w) => w.setNum === build.set.setNum))} disabled={wishlistBusy}>{wishlist.some((w) => w.setNum === build.set.setNum) ? '★ Wishlisted' : '☆ Add to wishlist'}</button></div></article>
          <div className="build-result-controls"><div className="build-result-tabs"><button className={buildResultTab === 'need' ? 'active' : ''} onClick={() => setBuildResultTab('need')}>Need <span>{build.summary.missingPartTypes}</span></button><button className={buildResultTab === 'have' ? 'active' : ''} onClick={() => setBuildResultTab('have')}>Have <span>{build.summary.uniqueParts - build.summary.missingPartTypes}</span></button></div>{buildResultTab === 'need' && <label className="need-sort">Sort <select value={needSort} onChange={(event) => setNeedSort(event.target.value)}><option value="desc">Most needed first</option><option value="asc">Least needed first</option></select></label>}</div>
          <Parts parts={buildParts} comparison tabKey={buildResultTab} /></>}</section>}
      {tab === 'wishlist' && <section className="panel"><h2>Wishlist</h2><p className="muted">Sets you want to build. Coverage reflects your current vault.</p>
        <div className="owned">{wishlist.length ? wishlist.map((item) => <article className="owned-set wishlist-card" key={item._id}>{item.imageUrl && <img src={item.imageUrl} alt="" />}<div><p className="eyebrow">{item.setNum}{item.matching?.ignoreColors || item.matching?.ignorePrints ? ' · ' : ''}{item.matching?.ignoreColors ? 'any color' : ''}{item.matching?.ignoreColors && item.matching?.ignorePrints ? ', ' : ''}{item.matching?.ignorePrints ? 'any print' : ''}</p><h3>{item.setName}</h3>{item.summary ? <p className={`status ${item.summary.canBuild ? 'have' : 'missing'}`}>{item.summary.canBuild ? 'You can build this!' : `${item.summary.totalMissing} pieces still needed`}</p> : <p className="muted">Coverage unavailable</p>}</div>{item.summary && <p className="summary"><strong>{item.summary.uniqueParts - item.summary.missingPartTypes}/{item.summary.uniqueParts}</strong> part types covered</p>}<button className="danger icon-btn" title="Remove from wishlist" onClick={() => removeFromWishlist(item._id)}><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></article>) : <p className="empty">Your wishlist is empty. Check a set in the Build checker and add it.</p>}</div>
      </section>}
    </main></div>
}

function Parts({ parts, comparison = false, tabKey = '' }) {
  return <div className="part-list">{parts.map((part, i) => <article className="part" key={`${tabKey}:${i}:${part.canonicalId}`}>{part.imageUrl ? <img src={part.imageUrl} alt="" /> : <div className="part-image" />}<div><h3>{part.name}</h3><p className="muted">{part.colorName || 'Minifigure'} · {comparison ? `need ${part.required}, matching pool ${part.poolAvailable}` : part.partNum}</p></div>{comparison ? <Availability part={part} /> : <strong>×{part.quantity}</strong>}</article>)}</div>
}

function Availability({ part }) {
  if (part.missing) return <strong className="missing">Need {part.missing}</strong>
  return <span className="availability have" tabIndex="0">Have<span className="inventory-tooltip" role="tooltip"><span>Matching inventory</span>{part.inventoryMatches.map((match) => <span className="tooltip-part" key={match.canonicalId}>{match.imageUrl && <img src={match.imageUrl} alt="" />}<span>{match.name}<small>{match.colorName || 'Minifigure'}{match.isPrinted ? ' · Printed' : ''}</small></span><strong>×{match.quantity}</strong></span>)}</span></span>
}

export default App
