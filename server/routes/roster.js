import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /roster
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roster WHERE active=1 ORDER BY emp ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /roster  (upsert by emp)
router.post('/', async (req, res) => {
  const u = req.body;
  if (!u.emp || !u.name) return res.status(400).json({ error: 'emp and name required' });
  try {
    await pool.query(
      `INSERT INTO roster (emp, name, pin, role, shift, active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name=VALUES(name), pin=VALUES(pin),
         role=VALUES(role), shift=VALUES(shift), active=1`,
      [u.emp.toUpperCase(), u.name, u.pin || '', u.role || 'inspector', u.shift || 'A']
    );
    const [rows] = await pool.query('SELECT * FROM roster WHERE emp=?', [u.emp.toUpperCase()]);
    res.status(201).json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /roster/:emp
router.put('/:emp', async (req, res) => {
  const u = { ...req.body, emp: req.params.emp.toUpperCase() };
  try {
    await pool.query(
      'UPDATE roster SET name=?, pin=?, role=?, shift=? WHERE emp=?',
      [u.name, u.pin || '', u.role || 'inspector', u.shift || 'A', u.emp]
    );
    const [rows] = await pool.query('SELECT * FROM roster WHERE emp=?', [u.emp]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /roster/:emp  (soft-delete via active flag)
router.delete('/:emp', async (req, res) => {
  try {
    await pool.query('UPDATE roster SET active=0 WHERE emp=?', [req.params.emp.toUpperCase()]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /roster/bulk  — replace entire roster (used on first sync from localStorage)
router.post('/bulk', async (req, res) => {
  const users = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: 'array required' });
  try {
    for (const u of users) {
      await pool.query(
        `INSERT INTO roster (emp, name, pin, role, shift, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name=VALUES(name), pin=VALUES(pin),
           role=VALUES(role), shift=VALUES(shift), active=1`,
        [u.emp.toUpperCase(), u.name, u.pin || '', u.role || 'inspector', u.shift || 'A']
      );
    }
    const [rows] = await pool.query('SELECT * FROM roster WHERE active=1 ORDER BY emp ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toClient(row) {
  return {
    emp:   row.emp,
    name:  row.name,
    pin:   row.pin,
    role:  row.role,
    shift: row.shift,
  };
}

export default router;
