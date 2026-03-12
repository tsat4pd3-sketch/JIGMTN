/**
 * db.js — Shared database via GitHub Issues API
 *
 * วิธีทำงาน:
 *  - PM record แต่ละรายการ = 1 GitHub Issue
 *  - Body ของ Issue = JSON ของ record ทั้งหมด
 *  - Label "pm-record" ใช้กรองข้อมูล
 *  - Title = "{jigId} | {pmDate} | {inspector}"
 *
 * ต้องตั้งค่าใน .env:
 *   VITE_GITHUB_TOKEN=ghp_xxxx
 *   VITE_GITHUB_REPO=tsat4pd3-sketch/JIGMTN
 */

const REPO  = import.meta.env.VITE_GITHUB_REPO  || 'tsat4pd3-sketch/JIGMTN'
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN  || ''
const LABEL = 'pm-record'
const API   = `https://api.github.com/repos/${REPO}`

const headers = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github+json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
})

/* ---------- ensure label exists ---------- */
export async function ensureLabel() {
  try {
    await fetch(`${API}/labels/${LABEL}`, { headers: headers() })
      .then(async r => {
        if (r.status === 404) {
          await fetch(`${API}/labels`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ name: LABEL, color: '1d4ed8', description: 'PM JIG Record' }),
          })
        }
      })
  } catch (_) {}
}

/* ---------- load all records ---------- */
export async function loadRecords() {
  let page = 1, all = []
  while (true) {
    const r = await fetch(
      `${API}/issues?labels=${LABEL}&state=open&per_page=100&page=${page}`,
      { headers: headers() }
    )
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`)
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
  return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/* ---------- create record ---------- */
export async function createRecord(record) {
  await ensureLabel()
  const title = `${record.jigId} | ${record.pmDate} | ${record.inspector}`
  const r = await fetch(`${API}/issues`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      title,
      body: JSON.stringify(record, null, 2),
      labels: [LABEL],
    }),
  })
  if (!r.ok) throw new Error(`Create failed: ${r.status}`)
  const issue = await r.json()
  record._issueNumber = issue.number
  return record
}

/* ---------- update record ---------- */
export async function updateRecord(record) {
  if (!record._issueNumber) {
    return createRecord(record)
  }
  const title = `${record.jigId} | ${record.pmDate} | ${record.inspector}`
  const r = await fetch(`${API}/issues/${record._issueNumber}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      title,
      body: JSON.stringify(record, null, 2),
    }),
  })
  if (!r.ok) throw new Error(`Update failed: ${r.status}`)
  return record
}

/* ---------- delete record (close issue) ---------- */
export async function deleteRecord(issueNumber) {
  const r = await fetch(`${API}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ state: 'closed' }),
  })
  if (!r.ok) throw new Error(`Delete failed: ${r.status}`)
}

/* ---------- check if token works ---------- */
export async function checkAuth() {
  if (!TOKEN) return { ok: false, reason: 'no_token' }
  const r = await fetch(`${API}`, { headers: headers() })
  if (r.ok) return { ok: true }
  return { ok: false, reason: r.status === 401 ? 'invalid_token' : 'no_write' }
}
