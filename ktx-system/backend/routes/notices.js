const router = require('express').Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

router.get('/', authRequired, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM notices ORDER BY date DESC');
  res.json(rows);
});

module.exports = router;