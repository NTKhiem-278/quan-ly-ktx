const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authRequired, requireRole } = require('../middleware/auth');

router.get('/', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, user, name, email, student_id, active, last_login FROM accounts ORDER BY user"
  );
  res.json(rows.map(a => ({ ...a, svId: a.student_id, last: a.last_login })));
});

router.post('/', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const { user, pass, name, email, svId } = req.body;
  if (!user || !pass || !name) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  if (pass.length < 6) return res.status(400).json({ error: 'Mật khẩu ít nhất 6 ký tự' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [exist] = await conn.query('SELECT id FROM accounts WHERE LOWER(user) = ?', [user.toLowerCase()]);
    if (exist.length) throw new Error('Tên đăng nhập này đã có người sử dụng');

    let finalSvId = svId ? svId.trim() : null;
    if (!finalSvId) {
      const [[{ maxId }]] = await conn.query("SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxId FROM students");
      finalSvId = 'SV' + ((maxId || 21000) + 1);
    }

    const [stuExist] = await conn.query('SELECT id FROM students WHERE id = ?', [finalSvId]);
    if (!stuExist.length) {
      await conn.query(
        `INSERT INTO students (id, name, sex, room_id, faculty, phone, start_date) 
         VALUES (?, ?, 'Nam', NULL, 'Chưa cập nhật', '—', CURDATE())`,
        [finalSvId, name]
      );
    }

    const hash = await bcrypt.hash(pass, 10);
    await conn.query(
      `INSERT INTO accounts (user, pass_hash, name, role, email, student_id, active) VALUES (?,?,?,?,?,?,1)`,
      [user.toLowerCase(), hash, name, 'Sinh viên', email || user + '@sv.edu.vn', finalSvId]
    );

    await conn.commit();
    res.json({ ok: true, svId: finalSvId, user: user.toLowerCase() });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

router.put('/:user', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  const { name, email, active } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (active !== undefined) { fields.push('active = ?'); params.push(active ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: 'Không có gì để cập nhật' });
  params.push(req.params.user);
  await pool.query(`UPDATE accounts SET ${fields.join(', ')} WHERE user = ? AND role = 'Sinh viên'`, params);
  res.json({ ok: true });
});

router.delete('/:user', authRequired, requireRole('Lễ tân', 'Quản trị viên'), async (req, res) => {
  await pool.query("DELETE FROM accounts WHERE user = ? AND role = 'Sinh viên'", [req.params.user]);
  res.json({ ok: true });
});

module.exports = router;