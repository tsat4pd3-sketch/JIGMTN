/**
 * auth.js — PIN-based auth for shop floor
 *
 * When VITE_SQL_API_URL is set, roster is read from / written to MySQL via the
 * Express /roster API. localStorage is used as a fast cache and offline fallback.
 */

const SESSION_KEY = 'pm_jig_session_v2';
const ROSTER_KEY  = 'pm_jig_roster_v2';
const SQL_API_URL = (import.meta.env.VITE_SQL_API_URL || '').replace(/\/$/, '');

const DEFAULT_ROSTER = [
  { emp: 'EMP-04821', name: 'สมชาย ค.',    pin: '1234', role: 'inspector',  shift: 'A' },
  { emp: 'EMP-03914', name: 'อนุชา ส.',    pin: '1234', role: 'inspector',  shift: 'A' },
  { emp: 'EMP-05102', name: 'วิชัย ม.',    pin: '1234', role: 'inspector',  shift: 'B' },
  { emp: 'EMP-02011', name: 'ธนวัฒน์ ป.', pin: '1234', role: 'inspector',  shift: 'C' },
  { emp: 'SUP-001',   name: 'หัวหน้า A.',  pin: '9999', role: 'supervisor', shift: 'A' },
  { emp: 'ENG-001',   name: 'Engineer A.',  pin: '8888', role: 'engineer',   shift: 'A' },
  { emp: 'ADM-001',   name: 'IT Admin',     pin: '0000', role: 'admin',      shift: '-' },
];

const hasSql = () => Boolean(SQL_API_URL);

async function apiFetch(path, options = {}) {
  const r = await fetch(`${SQL_API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${path}`);
  if (r.status === 204) return null;
  return r.json();
}

/* ---- roster ---- */

export function getRoster() {
  try {
    const stored = localStorage.getItem(ROSTER_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  localStorage.setItem(ROSTER_KEY, JSON.stringify(DEFAULT_ROSTER));
  return DEFAULT_ROSTER;
}

export function saveRoster(roster) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
}

/** Load roster from MySQL and update localStorage cache. Falls back to cache. */
export async function loadRosterFromDB() {
  if (!hasSql()) return getRoster();
  try {
    const rows = await apiFetch('/roster');
    if (rows?.length) {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(rows));
      return rows;
    }
    // DB empty → seed it with current localStorage data
    const local = getRoster();
    await apiFetch('/roster/bulk', { method: 'POST', body: JSON.stringify(local) });
    return local;
  } catch (_) {
    return getRoster();
  }
}

/** Persist a single user to MySQL and update local cache. */
export async function saveUserToDB(user) {
  const roster = getRoster();
  let next;
  if (roster.find(u => u.emp === user.emp)) {
    next = roster.map(u => u.emp === user.emp ? user : u);
  } else {
    next = [...roster, user];
  }
  saveRoster(next);
  if (hasSql()) {
    try { await apiFetch('/roster', { method: 'POST', body: JSON.stringify(user) }); } catch (_) {}
  }
  return next;
}

/** Remove a user from MySQL and local cache. */
export async function deleteUserFromDB(emp) {
  const next = getRoster().filter(u => u.emp !== emp);
  saveRoster(next);
  if (hasSql()) {
    try { await apiFetch(`/roster/${encodeURIComponent(emp)}`, { method: 'DELETE' }); } catch (_) {}
  }
  return next;
}

/* ---- session ---- */

export function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const session = JSON.parse(s);
    if (Date.now() - session.startedAt > 12 * 3600 * 1000) { logout(); return null; }
    return session;
  } catch (_) {
    return null;
  }
}

export function login(emp, pin) {
  const roster = getRoster();
  const user = roster.find(u => u.emp === emp.trim().toUpperCase() && u.pin === pin);
  if (!user) return { ok: false, reason: 'invalid' };
  const session = { emp: user.emp, name: user.name, role: user.role, shift: user.shift, startedAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function can(session, action) {
  if (!session) return false;
  const matrix = {
    'pm.create':      ['inspector', 'technician', 'supervisor', 'engineer', 'admin'],
    'pm.edit':        ['inspector', 'technician', 'supervisor', 'engineer', 'admin'],
    'pm.delete':      ['supervisor', 'engineer', 'admin'],
    'dashboard.view': ['supervisor', 'engineer', 'admin'],
    'admin.view':     ['admin'],
    'cal.view':       ['inspector', 'technician', 'supervisor', 'engineer', 'admin'],
    'cal.edit':       ['supervisor', 'engineer', 'admin'],
    'jig.setup':      ['supervisor', 'engineer', 'admin'],
  };
  return (matrix[action] || []).includes(session.role);
}
