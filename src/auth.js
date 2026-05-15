/**
 * auth.js — Simple PIN-based auth for shop floor
 *
 * Each inspector has an EMP code + 4-digit PIN. List is stored in localStorage
 * (synced via Admin screen). On login, we cache the active session.
 *
 * For real production: replace with LDAP / Active Directory federation.
 */

const SESSION_KEY = 'pm_jig_session_v2';
const ROSTER_KEY = 'pm_jig_roster_v2';

const DEFAULT_ROSTER = [
  { emp: 'TECH-04821', name: 'สมชาย ค.', pin: '1234', role: 'technician', shift: 'A' },
  { emp: 'TECH-03914', name: 'อนุชา ส.', pin: '1234', role: 'technician', shift: 'A' },
  { emp: 'TECH-05102', name: 'วิชัย ม.', pin: '1234', role: 'technician', shift: 'B' },
  { emp: 'TECH-02011', name: 'ธนวัฒน์ ป.', pin: '1234', role: 'technician', shift: 'C' },
  { emp: 'ENG-001',    name: 'วิศวกร PM', pin: '2468', role: 'engineer', shift: 'A' },
  { emp: 'SUP-001',    name: 'หัวหน้า A.', pin: '9999', role: 'supervisor', shift: 'A' },
  { emp: 'ADM-001',    name: 'IT Admin',   pin: '0000', role: 'admin', shift: '-' },
];

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

export function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const session = JSON.parse(s);
    // expire after 12 hours
    if (Date.now() - session.startedAt > 12 * 3600 * 1000) {
      logout();
      return null;
    }
    return session;
  } catch (_) {
    return null;
  }
}

export function login(emp, pin) {
  const roster = getRoster();
  const user = roster.find(u => u.emp === emp.trim().toUpperCase() && u.pin === pin);
  if (!user) return { ok: false, reason: 'invalid' };
  const session = {
    emp: user.emp,
    name: user.name,
    role: user.role,
    shift: user.shift,
    startedAt: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function can(session, action) {
  if (!session) return false;
  const matrix = {
    'pm.create':       ['technician', 'inspector', 'engineer', 'supervisor', 'admin'],
    'pm.edit':         ['technician', 'inspector', 'engineer', 'supervisor', 'admin'],
    'pm.delete':       ['supervisor', 'admin'],
    'dashboard.view':  ['engineer', 'supervisor', 'admin'],
    'planning.view':   ['engineer', 'supervisor', 'admin'],
    'planning.edit':   ['engineer', 'supervisor', 'admin'],
    'jigconfig.view':  ['supervisor', 'admin'],
    'jigconfig.edit':  ['supervisor', 'admin'],
    'admin.view':      ['admin'],
    'cal.view':        ['technician', 'inspector', 'engineer', 'supervisor', 'admin'],
    'cal.edit':        ['supervisor', 'admin'],
  };
  return (matrix[action] || []).includes(session.role);
}
