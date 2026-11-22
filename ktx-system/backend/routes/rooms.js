const router = require('express').Router();
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/', authRequired, async (req, res) => {
  const [rooms] = await pool.query(`
    SELECT r.id, r.zone, r.type, r.capacity AS cap, r.price, r.status,
      (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id) AS occupancy
    FROM rooms r ORDER BY r.id
  `);
  res.json(rooms);
});

router.post('/', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const { id, zone, type, capacity, price } = req.body;
  if (!id || !zone || !type) return res.status(400).json({ error: 'Thiếu thông tin' });
  try {
    await pool.query(
      `INSERT INTO rooms (id, zone, type, capacity, price, status) VALUES (?, ?, ?, ?, ?, 'ok')`,
      [id, zone, type, capacity, price]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Mã phòng đã tồn tại' : e.message });
  }
});

router.patch('/:id', authRequired, requireRole('Lễ tân'), async (req, res) => {
  const { status } = req.body;
  if (!['ok', 'fix', 'maintenance'].includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  await pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
});

router.get('/:id/students', authRequired, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM students WHERE room_id = ?', [req.params.id]);
  res.json(rows);
});

module.exports = router;