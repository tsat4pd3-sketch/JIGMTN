/**
 * db.js — Persistence gateway for PM JIG-FIXTURE
 *
 * Production mode: set VITE_SQL_API_URL to a REST service backed by SQL
 * (PostgreSQL / MS SQL / MySQL). The frontend never connects to SQL directly;
 * it calls API endpoints and the API writes normalized tables.
 *
 * Compatibility mode: without VITE_SQL_API_URL, existing PM records continue to
 * use GitHub Issues and PM plans use localStorage so the demo remains runnable.
 */

const REPO  = import.meta.env.VITE_GITHUB_REPO  || 'tsat4pd3-sketch/JIGMTN'
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN  || ''
const SQL_API_URL = (import.meta.env.VITE_SQL_API_URL || '').replace(/\/$/, '')
const SQL_API_KEY = import.meta.env.VITE_SQL_API_KEY || ''
const LABEL = 'pm-record'
const API   = `https://api.github.com/repos/${REPO}`
const PLAN_CACHE_KEY = 'pm_jig_plans_v3'
const RECORD_CACHE_KEY = 'pm_jig_records_sql_cache_v3'
const JIG_CONFIG_CACHE_KEY = 'pm_jig_fixture_config_v1'

const githubHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github+json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
})

const sqlHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  ...(SQL_API_KEY ? { 'Authorization': `Bearer ${SQL_API_KEY}` } : {}),
})

const hasSqlBackend = () => Boolean(SQL_API_URL)

async function sqlFetch(path, options = {}) {
  const r = await fetch(`${SQL_API_URL}${path}`, {
    ...options,
    headers: { ...sqlHeaders(), ...(options.headers || {}) },
  })
  if (!r.ok) throw new Error(`SQL API error ${r.status}: ${path}`)
  if (r.status === 204) return null
  return r.json()
}

function readCache(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch (_) { return fallback }
}

function writeCache(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

/* ---------- ensure label exists (GitHub compatibility mode) ---------- */
export async function ensureLabel() {
  if (hasSqlBackend()) return
  try {
    await fetch(`${API}/labels/${LABEL}`, { headers: githubHeaders() })
      .then(async r => {
        if (r.status === 404) {
          await fetch(`${API}/labels`, {
            method: 'POST',
            headers: githubHeaders(),
            body: JSON.stringify({ name: LABEL, color: '1d4ed8', description: 'PM JIG Record' }),
          })
        }
      })
  } catch (_) {}
}

/* ---------- load all PM inspection records ---------- */
export async function loadRecords() {
  if (hasSqlBackend()) {
    const records = await sqlFetch('/pm-records')
    writeCache(RECORD_CACHE_KEY, records)
    return records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }

  let page = 1, all = []
  while (true) {
    const r = await fetch(
      `${API}/issues?labels=${LABEL}&state=open&per_page=100&page=${page}`,
      { headers: githubHeaders() }
    )
    if (!r.ok) {
      const cached = readCache(RECORD_CACHE_KEY, [])
      if (cached.length) return cached
      throw new Error(`GitHub API error: ${r.status}`)
    }
    const issues = await r.json()
    if (!issues.length) break
    for (const issue of issues) {
      try {
        const rec = JSON.parse(issue.body)
        rec._issueNumber = issue.number
        all.push(rec)
      } catch (_) {}
    }
    if (issues.length < 100) break
    page++
  }
  writeCache(RECORD_CACHE_KEY, all)
  return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/* ---------- create PM inspection record ---------- */
export async function createRecord(record) {
  if (hasSqlBackend()) {
    const created = await sqlFetch('/pm-records', { method: 'POST', body: JSON.stringify(record) })
    const cache = readCache(RECORD_CACHE_KEY, [])
    writeCache(RECORD_CACHE_KEY, [created, ...cache.filter(r => r.id !== created.id)])
    return created
  }

  await ensureLabel()
  const title = `${record.jigId} | ${record.pmDate} | ${record.inspector}`
  const r = await fetch(`${API}/issues`, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      title,
      body: JSON.stringify(record, null, 2),
      labels: [LABEL],
    }),
  })
  if (!r.ok) throw new Error(`Create failed: ${r.status}`)
  const issue = await r.json()
  record._issueNumber = issue.number
  const cache = readCache(RECORD_CACHE_KEY, [])
  writeCache(RECORD_CACHE_KEY, [record, ...cache])
  return record
}

/* ---------- update PM inspection record ---------- */
export async function updateRecord(record) {
  if (hasSqlBackend()) {
    const updated = await sqlFetch(`/pm-records/${encodeURIComponent(record.id)}`, { method: 'PUT', body: JSON.stringify(record) })
    const cache = readCache(RECORD_CACHE_KEY, [])
    writeCache(RECORD_CACHE_KEY, cache.map(r => r.id === updated.id ? updated : r))
    return updated
  }

  if (!record._issueNumber) return createRecord(record)
  const title = `${record.jigId} | ${record.pmDate} | ${record.inspector}`
  const r = await fetch(`${API}/issues/${record._issueNumber}`, {
    method: 'PATCH',
    headers: githubHeaders(),
    body: JSON.stringify({ title, body: JSON.stringify(record, null, 2) }),
  })
  if (!r.ok) throw new Error(`Update failed: ${r.status}`)
  return record
}

/* ---------- delete PM inspection record ---------- */
export async function deleteRecord(issueNumberOrId) {
  if (hasSqlBackend()) {
    await sqlFetch(`/pm-records/${encodeURIComponent(issueNumberOrId)}`, { method: 'DELETE' })
    return
  }
  const r = await fetch(`${API}/issues/${issueNumberOrId}`, {
    method: 'PATCH',
    headers: githubHeaders(),
    body: JSON.stringify({ state: 'closed' }),
  })
  if (!r.ok) throw new Error(`Delete failed: ${r.status}`)
}


/* ---------- JIG/FIXTURE master configuration ---------- */
export async function loadJigConfigs() {
  if (hasSqlBackend()) {
    const jigs = await sqlFetch('/jig-fixtures')
    writeCache(JIG_CONFIG_CACHE_KEY, jigs)
    return jigs
  }
  return readCache(JIG_CONFIG_CACHE_KEY, [])
}

export async function saveJigConfig(jig) {
  const next = { ...jig, updatedAt: Date.now() }
  if (hasSqlBackend()) {
    const saved = await sqlFetch(`/jig-fixtures/${encodeURIComponent(next.id)}`, {
      method: 'PUT',
      body: JSON.stringify(next),
    })
    const cache = readCache(JIG_CONFIG_CACHE_KEY, [])
    writeCache(JIG_CONFIG_CACHE_KEY, [saved, ...cache.filter(j => j.id !== saved.id)])
    return saved
  }
  const cache = readCache(JIG_CONFIG_CACHE_KEY, [])
  writeCache(JIG_CONFIG_CACHE_KEY, [next, ...cache.filter(j => j.id !== next.id)])
  return next
}

export async function deleteJigConfig(jigId) {
  if (hasSqlBackend()) {
    await sqlFetch(`/jig-fixtures/${encodeURIComponent(jigId)}`, { method: 'DELETE' })
    return
  }
  const cache = readCache(JIG_CONFIG_CACHE_KEY, [])
  writeCache(JIG_CONFIG_CACHE_KEY, [{ id: jigId, isActive: false, updatedAt: Date.now() }, ...cache.filter(j => j.id !== jigId)])
}

/* ---------- PM plans ---------- */
export async function loadPlans() {
  if (hasSqlBackend()) {
    const plans = await sqlFetch('/pm-plans')
    writeCache(PLAN_CACHE_KEY, plans)
    return plans
  }
  return readCache(PLAN_CACHE_KEY, [])
}

export async function createPlan(plan) {
  if (hasSqlBackend()) {
    const created = await sqlFetch('/pm-plans', { method: 'POST', body: JSON.stringify(plan) })
    const cache = readCache(PLAN_CACHE_KEY, [])
    writeCache(PLAN_CACHE_KEY, [created, ...cache.filter(p => p.id !== created.id)])
    return created
  }
  const plans = readCache(PLAN_CACHE_KEY, [])
  writeCache(PLAN_CACHE_KEY, [plan, ...plans.filter(p => p.id !== plan.id)])
  return plan
}

export async function updatePlan(plan) {
  const next = { ...plan, updatedAt: Date.now() }
  if (hasSqlBackend()) {
    const updated = await sqlFetch(`/pm-plans/${encodeURIComponent(next.id)}`, { method: 'PUT', body: JSON.stringify(next) })
    const cache = readCache(PLAN_CACHE_KEY, [])
    writeCache(PLAN_CACHE_KEY, cache.map(p => p.id === updated.id ? updated : p))
    return updated
  }
  const plans = readCache(PLAN_CACHE_KEY, [])
  writeCache(PLAN_CACHE_KEY, plans.map(p => p.id === next.id ? next : p))
  return next
}

export async function completePlan(planId, record, nextPlan = null) {
  if (hasSqlBackend()) {
    return sqlFetch(`/pm-plans/${encodeURIComponent(planId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ recordId: record.id, completedAt: Date.now(), nextPlan }),
    })
  }
  const plans = readCache(PLAN_CACHE_KEY, [])
  const completed = plans.map(p => p.id === planId ? {
    ...p,
    status: 'completed',
    completedAt: Date.now(),
    completedRecordId: record.id,
    updatedAt: Date.now(),
  } : p)
  writeCache(PLAN_CACHE_KEY, nextPlan ? [nextPlan, ...completed] : completed)
  return nextPlan ? [nextPlan, ...completed] : completed
}

/* ---------- check configured backend ---------- */
export async function checkAuth() {
  if (hasSqlBackend()) {
    try {
      await sqlFetch('/health')
      return { ok: true, backend: 'sql' }
    } catch (e) {
      return { ok: false, backend: 'sql', reason: 'sql_api_unreachable' }
    }
  }
  if (!TOKEN) return { ok: false, backend: 'github', reason: 'no_token' }
  const r = await fetch(`${API}`, { headers: githubHeaders() })
  if (r.ok) return { ok: true, backend: 'github' }
  return { ok: false, backend: 'github', reason: r.status === 401 ? 'invalid_token' : 'no_write' }
}

export function getBackendMode() {
  return hasSqlBackend() ? 'sql' : 'github-demo'
}
