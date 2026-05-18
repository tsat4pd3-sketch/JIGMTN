import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /calibration
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM calibration_tools ORDER BY id ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /calibration  (upsert)
router.post('/', async (req, res) => {
  const t = req.body;
  if (!t.id || !t.name) return res.status(400).json({ error: 'id and name required' });
  try {
    await pool.query(
      `INSERT INTO calibration_tools (id, name, name_th, category, location, serial_no, interval_days, last_cal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), name_th=VALUES(name_th),
         category=VALUES(category), location=VALUES(location), serial_no=VALUES(serial_no),
         interval_days=VALUES(interval_days), last_cal=VALUES(last_cal)`,
      [t.id, t.name, t.th || t.nameTh || '', t.cat || t.category || '', t.loc || t.location || '',
       t.sn || t.serialNo || '', t.interval || t.intervalDays || 365, t.lastCal]
    );
    const [rows] = await pool.query('SELECT * FROM calibration_tools WHERE id=?', [t.id]);
    res.status(201).json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /calibration/:id  — record a calibration (update lastCal to today)
router.put('/:id', async (req, res) => {
  const t = { ...req.body, id: req.params.id };
  try {
    await pool.query(
      `UPDATE calibration_tools SET name=?, name_th=?, category=?, location=?,
         serial_no=?, interval_days=?, last_cal=? WHERE id=?`,
      [t.name, t.th || t.nameTh || '', t.cat || t.category || '', t.loc || t.location || '',
       t.sn || t.serialNo || '', t.interval || t.intervalDays || 365, t.lastCal, t.id]
    );
    const [rows] = await pool.query('SELECT * FROM calibration_tools WHERE id=?', [t.id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /calibration/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM calibration_tools WHERE id=?', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /calibration/bulk  — initial sync from localStorage
router.post('/bulk', async (req, res) => {
  const tools = req.body;
  if (!Array.isArray(tools)) return res.status(400).json({ error: 'array required' });
  try {
    for (const t of tools) {
      await pool.query(
        `INSERT INTO calibration_tools (id, name, name_th, category, location, serial_no, interval_days, last_cal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE last_cal=VALUES(last_cal)`,
        [t.id, t.name, t.th || t.nameTh || '', t.cat || t.category || '',
         t.loc || t.location || '', t.sn || t.serialNo || '',
         t.interval || t.intervalDays || 365, t.lastCal]
      );
    }
    const [rows] = await pool.query('SELECT * FROM calibration_tools ORDER BY id ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toClient(row) {
  const d = row.last_cal instanceof Date
    ? row.last_cal.toISOString().slice(0, 10)
    : String(row.last_cal || '').slice(0, 10);
  return {
    id:           row.id,
    name:         row.name,
    th:           row.name_th,
    cat:          row.category,
    loc:          row.location,
    sn:           row.serial_no,
    interval:     row.interval_days,
    lastCal:      d,
  };
}

export default router;
