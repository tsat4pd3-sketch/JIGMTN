import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /pm-records
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pm_records ORDER BY created_at DESC LIMIT 2000'
    );
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /pm-records
router.post('/', async (req, res) => {
  const rec = req.body;
  if (!rec.id || !rec.jigId) return res.status(400).json({ error: 'id and jigId required' });
  try {
    await pool.query(
      `INSERT INTO pm_records (id, jig_id, jig_name, pm_date, inspector, shift, overall_result, data_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         overall_result = VALUES(overall_result),
         data_json      = VALUES(data_json)`,
      [
        rec.id,
        rec.jigId,
        rec.jigName || '',
        rec.pmDate  || new Date().toISOString().slice(0, 10),
        rec.inspector || '',
        rec.shift || '',
        rec.overallResult || 'OK',
        JSON.stringify(rec),
        rec.createdAt || Date.now(),
      ]
    );
    const [rows] = await pool.query('SELECT * FROM pm_records WHERE id = ?', [rec.id]);
    res.status(201).json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /pm-records/:id
router.put('/:id', async (req, res) => {
  const rec = { ...req.body, id: req.params.id };
  try {
    await pool.query(
      `UPDATE pm_records SET jig_id=?, jig_name=?, pm_date=?, inspector=?, shift=?,
         overall_result=?, data_json=? WHERE id=?`,
      [
        rec.jigId,
        rec.jigName || '',
        rec.pmDate,
        rec.inspector || '',
        rec.shift || '',
        rec.overallResult || 'OK',
        JSON.stringify(rec),
        rec.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM pm_records WHERE id = ?', [rec.id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /pm-records/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pm_records WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Map snake_case DB row → camelCase client object
function toClient(row) {
  let parsed = {};
  try { parsed = JSON.parse(row.data_json || '{}'); } catch (_) {}
  return {
    ...parsed,
    id:            row.id,
    jigId:         row.jig_id,
    jigName:       row.jig_name,
    pmDate:        row.pm_date instanceof Date
      ? row.pm_date.toISOString().slice(0, 10)
      : String(row.pm_date || '').slice(0, 10),
    inspector:     row.inspector,
    shift:         row.shift,
    overallResult: row.overall_result,
    createdAt:     Number(row.created_at),
  };
}

export default router;
