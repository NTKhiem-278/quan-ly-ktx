const router = require('express').Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

router.get('/', authRequired, async (req, res) => {
  const { student_id, month, paid } = req.query;
  const where = []; const params = [];

  if (req.user.role === 'Sinh viên') {
    where.push('i.student_id = ?'); params.push(req.user.studentId);
  } else if (student_id) {
    where.push('i.student_id = ?'); params.push(student_id);
  }
  if (month) { where.push('i.month = ?'); params.push(month); }
  if (paid !== undefined) { where.push('i.paid = ?'); params.push(paid === '1' ? 1 : 0); }

  const [rows] = await pool.query(
    `SELECT i.*, s.name AS student_name FROM invoices i JOIN students s ON s.id = i.student_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.month DESC, i.id`, params
  );

  res.json(rows.map(i => ({
    ...i,
    elec_amt:  (i.elec_new  - i.elec_old)  * i.elec_rate,
    water_amt: (i.water_new - i.water_old) * i.water_rate,
    total: i.room_fee + (i.elec_new - i.elec_old) * i.elec_rate + (i.water_new - i.water_old) * i.water_rate,
  })));
});

router.patch('/:id/pay', authRequired, async (req, res) => {
  const { method, paid } = req.body;

  if (req.user.role === 'Sinh viên') {
    const [[inv]] = await pool.query('SELECT student_id FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv || inv.student_id !== req.user.studentId) return res.status(403).json({ error: 'Không có quyền' });
  }

  const isPaid = paid === undefined ? 1 : (paid ? 1 : 0);
  await pool.query(
    'UPDATE invoices SET paid=?, paid_at=?, method=? WHERE id=?',
    [isPaid, isPaid ? new Date() : null, isPaid ? (method || 'VNPay') : null, req.params.id]
  );

  const [[inv]] = await pool.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  res.json(inv);
});

module.exports = router;