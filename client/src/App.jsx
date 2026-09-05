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
  async function refresh() {
    const [sets, parts] = await Promise.all([api.listOwnedSets(), api.inventory()])
    setOwnedSets(sets.sets); setInventory(parts)
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
  function check(setNum) { run(async () => setBuild(await api.buildCheck(setNum))) }
  function logout() { localStorage.removeItem('brickvault-token'); localStorage.removeItem('brickvault-user'); setUser(null); setKeyReady(null) }
  function authenticated(account) { localStorage.setItem('brickvault-user', JSON.stringify(account)); setUser(account); setKeyReady(account.hasRebrickableKey) }
  function keySaved() { const updatedUser = { ...user, hasRebrickableKey: true }; localStorage.setItem('brickvault-user', JSON.stringify(updatedUser)); setUser(updatedUser); setKeyReady(true) }
  if (!user) return <Auth onAuthenticated={authenticated} />
  if (keyReady !== true) return <ApiKeySetup checking={keyReady === null} onSaved={keySaved} onLogout={logout} />
  return <div className="app-shell"><header><a className="brand" href="#top">Brick<span>Vault</span></a><div className="account">{user.name || user.email}<button className="text-button" onClick={logout}>Log out</button></div></header>
    <main id="top"><section className="hero"><p className="eyebrow">PERSONAL LEGO INVENTORY</p><h1>Build from what you own.</h1><p>Track dismantled sets and see exactly which pieces stand between you and your next build.</p></section>
      <nav>{[['add', 'Add sets'], ['inventory', 'My inventory'], ['build', 'Build checker']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {error && <p className="notice error">{error}</p>}{notice && <p className="notice success">{notice}</p>}
      {tab === 'add' && <section className="panel"><h2>Add a dismantled set</h2><p className="muted">Enter a set number and its official inventory will be added to yours.</p><SetForm label="Set number" action="Find set" busy={busy} onSubmit={lookup} />
        {preview && <article className="set-card">{preview.imageUrl && <img src={preview.imageUrl} alt="" />}<div><p className="eyebrow">{preview.setNum}</p><h3>{preview.setName}</h3><p className="muted">{preview.numParts} pieces in the official inventory</p><label className="copies">Copies you own <input type="number" min="1" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} /></label><button onClick={addSet} disabled={busy}>Add to my vault</button></div></article>}</section>}
      {tab === 'inventory' && <section className="panel"><div className="panel-title"><div><h2>My inventory</h2><p className="muted">Parts are summed across every dismantled set.</p></div>{inventory && <p className="stat"><strong>{inventory.totalPieces}</strong> pieces · {inventory.totalUniqueParts} unique</p>}</div>
        <div className="owned">{ownedSets.length ? ownedSets.map((set) => <article className="owned-set" key={set._id}>{set.imageUrl && <img src={set.imageUrl} alt="" />}<div><p className="eyebrow">{set.setNum} · {set.copyCount} {set.copyCount === 1 ? 'copy' : 'copies'}</p><h3>{set.setName}</h3><p className="muted">{set.partCount} part entries</p></div><button className="danger" onClick={() => removeSet(set._id)} disabled={busy}>Remove</button></article>) : <p className="empty">Your vault is empty. Add your first dismantled set.</p>}</div>
        {inventory?.parts?.length > 0 && <Parts parts={inventory.parts.slice(0, 20)} />}</section>}
      {tab === 'build' && <section className="panel"><h2>Can I build this?</h2><p className="muted">This checks your vault without removing any pieces.</p><SetForm label="Set number to build" action="Check parts" busy={busy} onSubmit={check} />
        {build && <><article className="set-card build-card">{build.set.imageUrl && <img src={build.set.imageUrl} alt="" />}<div><p className="eyebrow">{build.set.setNum}</p><h3>{build.set.setName}</h3><p className={`status ${build.summary.canBuild ? 'have' : 'missing'}`}>{build.summary.canBuild ? 'You can build this set!' : `${build.summary.totalMissing} pieces still needed`}</p></div><p className="summary"><strong>{build.summary.uniqueParts - build.summary.missingPartTypes}/{build.summary.uniqueParts}</strong> part types covered</p></article><Parts parts={build.parts} comparison /></>}</section>}
    </main></div>
}

function Parts({ parts, comparison = false }) {
  return <div className="part-list">{parts.map((part) => <article className="part" key={part.canonicalId}>{part.imageUrl ? <img src={part.imageUrl} alt="" /> : <div className="part-image" />}<div><h3>{part.name}</h3><p className="muted">{part.colorName || 'Minifigure'} · {comparison ? `need ${part.required}, have ${part.available}` : part.partNum}</p></div><strong className={part.status}>{comparison ? part.missing ? `Need ${part.missing}` : 'Have' : `×${part.quantity}`}</strong></article>)}</div>
}

export default App
