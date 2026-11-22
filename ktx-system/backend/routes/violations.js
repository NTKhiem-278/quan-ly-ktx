const router = require('express').Router();
const pool = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/', authRequired, async (req, res) => {
  const { student_id } = req.query;
  const params = [];
  let sql = `SELECT v.*, s.name AS student_name FROM violations v JOIN students s ON s.id = v.student_id`;
  const where = [];

  if (req.user.role === 'Sinh viên') {
    where.push('v.student_id = ?'); params.push(req.user.studentId);
  } else if (student_id) {
    where.push('v.student_id = ?'); params.push(student_id);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY v.created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.post('/', authRequired, requireRole('Lễ tân'), async (req, res) => {
  const { student_id, type, level, note } = req.body;
  if (!student_id || !type || !level) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });

  const [[stu]] = await pool.query('SELECT * FROM students WHERE id = ?', [student_id]);
  if (!stu) return res.status(404).json({ error: 'Sinh viên không tồn tại' });

  const [[{ nextId }]] = await pool.query(
    "SELECT CONCAT('VP', LPAD(COALESCE(MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)),0)+1,3,'0')) AS nextId FROM violations"
  );

  await pool.query(
    `INSERT INTO violations (id,student_id,room_id,date,type,level,created_by,note,status) VALUES (?,?,?,CURDATE(),?,?,?,?, 'Đã ghi nhận')`,
    [nextId, student_id, stu.room_id, type, level, req.user.name, note || '']
  );
  res.json({ id: nextId });
});

router.patch('/:id/resolve', authRequired, requireRole('Lễ tân'), async (req, res) => {
  await pool.query("UPDATE violations SET status='Đã xử lý' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;