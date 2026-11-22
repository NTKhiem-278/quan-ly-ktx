const router = require('express').Router();
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/', authRequired, async (req, res) => {
  const [rows] = await pool.query('SELECT s.*, r.zone FROM students s LEFT JOIN rooms r ON r.id=s.room_id ORDER BY s.id');
  res.json(rows);
});

router.post('/', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const { id, name, sex, room_id, faculty, phone } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Thiếu mã hoặc tên' });
  
  const finalRoom = (room_id && room_id.trim() !== '') ? room_id : null;

  try {
    await pool.query(
      `INSERT INTO students (id,name,sex,room_id,faculty,phone,start_date) VALUES (?,?,?,?,?,?,CURDATE())`,
      [id, name, sex, finalRoom, faculty, phone]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Mã sinh viên đã tồn tại' : e.message });
  }
});

router.put('/:id', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const { name, sex, room_id, faculty, phone } = req.body;
  const finalRoom = (room_id && room_id.trim() !== '') ? room_id : null;
  await pool.query('UPDATE students SET name=?,sex=?,room_id=?,faculty=?,phone=? WHERE id=?', [name, sex, finalRoom, faculty, phone, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;