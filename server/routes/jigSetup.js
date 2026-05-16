import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /jig-setup  →  all jig setups
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jig_setup');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /jig-setup/:jigId
router.get('/:jigId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jig_setup WHERE jig_id = ?', [req.params.jigId]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /jig-setup/:jigId  →  upsert
router.post('/:jigId', async (req, res) => {
  const data = req.body;
  try {
    await pool.query(
      `INSERT INTO jig_setup (jig_id, data_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
      [req.params.jigId, JSON.stringify(data)]
    );
    const [rows] = await pool.query('SELECT * FROM jig_setup WHERE jig_id = ?', [req.params.jigId]);
    res.status(201).json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /jig-setup/:jigId
router.delete('/:jigId', async (req, res) => {
  try {
    await pool.query('DELETE FROM jig_setup WHERE jig_id = ?', [req.params.jigId]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toClient(row) {
  let parsed = {};
  try { parsed = JSON.parse(row.data_json || '{}'); } catch (_) {}
  return { jigId: row.jig_id, updatedAt: row.updated_at, ...parsed };
}

export default router;
