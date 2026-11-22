const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { user, pass } = req.body;
  if (!user || !pass) return res.status(400).json({ error: 'Thiếu thông tin' });

  const [rows] = await pool.query('SELECT * FROM accounts WHERE LOWER(user) = ? LIMIT 1', [user.toLowerCase()]);
  const acc = rows[0];
  if (!acc) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
  if (!acc.active) return res.status(403).json({ error: 'Tài khoản đã bị khóa' });

  const ok = await bcrypt.compare(pass, acc.pass_hash);
  if (!ok) return res.status(401).json({ error: 'Mật khẩu không đúng' });

  await pool.query('UPDATE accounts SET last_login = NOW() WHERE id = ?', [acc.id]);

  const token = jwt.sign(
    { id: acc.id, user: acc.user, role: acc.role, studentId: acc.student_id, name: acc.name },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: { user: acc.user, name: acc.name, role: acc.role, svId: acc.student_id, email: acc.email },
  });
});

router.post('/register', async (req, res) => {
  const { name, user, mail, pass } = req.body;
  if (!name || !user || !pass) return res.status(400).json({ error: 'Điền đầy đủ thông tin' });
  if (pass.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  if (user.length < 4) return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 4 ký tự' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [exist] = await conn.query('SELECT id FROM accounts WHERE LOWER(user) = ?', [user.toLowerCase()]);
    if (exist.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng' });
    }

    const hash = await bcrypt.hash(pass, 10);

    const [rooms] = await conn.query(`
      SELECT r.*, (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id) AS occ
      FROM rooms r WHERE r.status='ok' HAVING occ < r.capacity ORDER BY occ ASC LIMIT 1
    `);
    const room = rooms[0];

    const [[{ maxId }]] = await conn.query(
      "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxId FROM students"
    );
    const studentId = 'SV' + ((maxId || 21000) + 1);

    await conn.query(
      `INSERT INTO students (id,name,sex,room_id,faculty,phone,start_date) VALUES (?,?,?,?,?,?,CURDATE())`,
      [studentId, name, 'Nam', room ? room.id : null, 'Chưa cập nhật', '—']
    );

    await conn.query(
      `INSERT INTO accounts (user, pass_hash, name, role, email, student_id, active) VALUES (?,?,?,?,?,?,1)`,
      [user.toLowerCase(), hash, name, 'Sinh viên', mail || user + '@ktx.edu.vn', studentId]
    );

    await conn.commit();
    res.json({ ok: true, studentId, role: 'Sinh viên' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.get('/me', authRequired, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id,user,name,role,email,student_id,last_login FROM accounts WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(rows[0]);
});

module.exports = router;