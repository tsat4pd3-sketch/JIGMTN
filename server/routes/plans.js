import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /pm-plans
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pm_plans ORDER BY due_date ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /pm-plans
router.post('/', async (req, res) => {
  const p = req.body;
  if (!p.id || !p.jigId) return res.status(400).json({ error: 'id and jigId required' });
  try {
    await pool.query(
      `INSERT INTO pm_plans (id, jig_id, jig_name, frequency, priority, due_date,
         assigned_to_emp, engineer_note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, p.jigId, p.jigName || '', p.frequency || 'monthly',
        p.priority || 'normal', p.dueDate || null,
        p.assignedToEmp || null, p.engineerNote || null,
        p.status || 'pending', p.createdAt || Date.now(), Date.now(),
      ]
    );
    const [rows] = await pool.query('SELECT * FROM pm_plans WHERE id = ?', [p.id]);
    res.status(201).json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /pm-plans/:id
router.put('/:id', async (req, res) => {
  const p = { ...req.body, id: req.params.id };
  try {
    await pool.query(
      `UPDATE pm_plans SET jig_id=?, jig_name=?, frequency=?, priority=?, due_date=?,
         assigned_to_emp=?, engineer_note=?, status=?, updated_at=? WHERE id=?`,
      [
        p.jigId, p.jigName || '', p.frequency || 'monthly',
        p.priority || 'normal', p.dueDate || null,
        p.assignedToEmp || null, p.engineerNote || null,
        p.status || 'pending', Date.now(), p.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM pm_plans WHERE id = ?', [p.id]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(toClient(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /pm-plans/:id/complete
router.post('/:id/complete', async (req, res) => {
  const { recordId, completedAt, nextPlan } = req.body;
  try {
    await pool.query(
      `UPDATE pm_plans SET status='completed', completed_at=?, completed_record_id=?, updated_at=? WHERE id=?`,
      [completedAt || Date.now(), recordId || null, Date.now(), req.params.id]
    );

    if (nextPlan?.id) {
      await pool.query(
        `INSERT INTO pm_plans (id, jig_id, jig_name, frequency, priority, due_date,
           assigned_to_emp, engineer_note, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE due_date=VALUES(due_date), updated_at=VALUES(updated_at)`,
        [
          nextPlan.id, nextPlan.jigId, nextPlan.jigName || '',
          nextPlan.frequency || 'monthly', nextPlan.priority || 'normal',
          nextPlan.dueDate || null, nextPlan.assignedToEmp || null,
          nextPlan.engineerNote || null, nextPlan.status || 'pending',
          Date.now(), Date.now(),
        ]
      );
    }

    const [rows] = await pool.query('SELECT * FROM pm_plans ORDER BY due_date ASC');
    res.json(rows.map(toClient));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function toClient(row) {
  const dueDate = row.due_date instanceof Date
    ? row.due_date.toISOString().slice(0, 10)
    : String(row.due_date || '').slice(0, 10);
  return {
    id:                 row.id,
    jigId:              row.jig_id,
    jigName:            row.jig_name,
    frequency:          row.frequency,
    priority:           row.priority,
    dueDate:            dueDate || undefined,
    assignedToEmp:      row.assigned_to_emp   || undefined,
    engineerNote:       row.engineer_note     || undefined,
    status:             row.status,
    completedAt:        row.completed_at      ? Number(row.completed_at) : undefined,
    completedRecordId:  row.completed_record_id || undefined,
    createdAt:          Number(row.created_at),
    updatedAt:          Number(row.updated_at),
  };
}

export default router;
