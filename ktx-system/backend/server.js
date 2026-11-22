require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ktx_db",
  dateStrings: true,
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: 10,
});
const SECRET = process.env.JWT_SECRET || "ktx-dev-secret-doi-di";
const q = async (sql, p = []) => (await pool.query(sql, p))[0];

class HttpErr extends Error {
  constructor(s, m) {
    super(m);
    this.status = s;
  }
}
const bad = (m, s = 400) => {
  throw new HttpErr(s, m);
};
const h = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    if (!(e instanceof HttpErr)) console.error(e);
    res
      .status(e.status || 500)
      .json({ error: e.status ? e.message : "Lỗi máy chủ: " + e.message });
  });

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- xác thực ---------- */
const authMw = (req, res, next) => {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  let p;
  try {
    p = jwt.verify(t, SECRET);
  } catch {
    return res
      .status(401)
      .json({ error: "Phiên hết hạn, vui lòng đăng nhập lại" });
  }
  q(
    "SELECT user,name,email,role,student_id,active FROM accounts WHERE user=?",
    [p.user],
  )
    .then(([a]) => {
      if (!a || !a.active)
        return res.status(401).json({ error: "Tài khoản không khả dụng" });
      req.u = a;
      next();
    })
    .catch((e) => res.status(500).json({ error: e.message }));
};
const onlyLT = (req, res, next) =>
  req.u.role === "Lễ tân" || req.u.role === "Quản trị viên"
    ? next()
    : res
        .status(403)
        .json({ error: "Bạn không có quyền thực hiện thao tác này" });
const isLT = (u) => u.role === "Lễ tân" || u.role === "Quản trị viên";

app.post(
  "/api/auth/login",
  h(async (req, res) => {
    const user = String(req.body.user || "")
      .trim()
      .toLowerCase();
    const pass = String(req.body.pass || "");
    const [a] = await q("SELECT * FROM accounts WHERE user=?", [user]);
    if (!a || !(await bcrypt.compare(pass, a.pass_hash)))
      bad("Sai tên đăng nhập hoặc mật khẩu", 400);
    if (!a.active) bad("Tài khoản đã bị khóa, liên hệ Lễ tân", 403);
    await q("UPDATE accounts SET last_login=NOW() WHERE user=?", [user]);
    const token = jwt.sign({ user: a.user }, SECRET, { expiresIn: "12h" });
    res.json({
      token,
      user: {
        user: a.user,
        name: a.name,
        role: a.role,
        svId: a.student_id,
        email: a.email,
      },
    });
  }),
);

async function nextStudentId(conn) {
  const [[r]] = await conn.query(
    "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) m FROM students WHERE id REGEXP '^SV[0-9]+$'",
  );
  return "SV" + ((r.m || 21000) + 1);
}

app.post(
  "/api/auth/register",
  h(async (req, res) => {
    const { name, mail = "", pass } = req.body;
    const user = String(req.body.user || "")
      .trim()
      .toLowerCase();
    if (!name || !user || !pass)
      bad("Điền đầy đủ họ tên, tên đăng nhập và mật khẩu.");
    if (user.length < 4) bad("Tên đăng nhập phải có ít nhất 4 ký tự.");
    if (String(pass).length < 6) bad("Mật khẩu phải có ít nhất 6 ký tự.");
    if (req.body.roleReg && req.body.roleReg !== "Sinh viên")
      bad("Chỉ được tự đăng ký tài khoản Sinh viên.", 403);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[ex]] = await conn.query(
        "SELECT 1 x FROM accounts WHERE user=? FOR UPDATE",
        [user],
      );
      if (ex) bad("Tên đăng nhập đã tồn tại.");
      const sid = await nextStudentId(conn);
      await conn.query("INSERT INTO students (id,name) VALUES (?,?)", [
        sid,
        name.trim(),
      ]);
      await conn.query(
        "INSERT INTO accounts (user,pass_hash,name,email,role,student_id) VALUES (?,?,?,?,?,?)",
        [
          user,
          await bcrypt.hash(pass, 10),
          name.trim(),
          mail || user + "@sv.edu.vn",
          "Sinh viên",
          sid,
        ],
      );
      await conn.commit();
      res.json({ ok: true, studentId: sid });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }),
);

app.get("/api/auth/me", authMw, (req, res) => {
  const a = req.u;
  res.json({
    user: a.user,
    name: a.name,
    role: a.role,
    student_id: a.student_id,
    email: a.email,
  });
});

/* ---------- phòng ---------- */
const ROOM_SQL =
  "SELECT id,zone,type,capacity AS cap,price,status FROM rooms ORDER BY id";
app.get(
  "/api/rooms",
  authMw,
  h(async (req, res) => res.json(await q(ROOM_SQL))),
);
app.post(
  "/api/rooms",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const { id, zone, type, capacity, price } = req.body;
    if (!id || !capacity || capacity < 1)
      bad("Thiếu mã phòng hoặc sức chứa không hợp lệ");
    const [ex] = await q("SELECT 1 x FROM rooms WHERE id=?", [id]);
    if (ex) bad("Mã phòng đã tồn tại");
    await q(
      "INSERT INTO rooms (id,zone,type,capacity,price) VALUES (?,?,?,?,?)",
      [id.trim().toUpperCase(), zone, type, capacity, price || 0],
    );
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/rooms/:id",
  authMw,
  onlyLT,
  h(async (req, res) => {
    if (!["ok", "fix"].includes(req.body.status))
      bad("Tình trạng không hợp lệ");
    await q("UPDATE rooms SET status=? WHERE id=?", [
      req.body.status,
      req.params.id,
    ]);
    res.json({ ok: true });
  }),
);

/* ---------- sinh viên ---------- */
const STU_COLS = "id,name,sex,faculty,phone,room_id,start_date";
app.get(
  "/api/students",
  authMw,
  h(async (req, res) => {
    if (isLT(req.u))
      return res.json(await q(`SELECT ${STU_COLS} FROM students ORDER BY id`));
    const sid = req.u.student_id;
    res.json(
      await q(
        `SELECT ${STU_COLS} FROM students
      WHERE id=? OR (room_id IS NOT NULL AND room_id=(SELECT room_id FROM students WHERE id=?))
      ORDER BY id`,
        [sid, sid],
      ),
    );
  }),
);

async function roomProblem(roomId, selfId) {
  if (!roomId) return null;
  const [r] = await q("SELECT capacity,status FROM rooms WHERE id=?", [roomId]);
  if (!r) return "Phòng không tồn tại";
  if (r.status === "fix") return "Phòng đang sửa chữa";
  const [c] = await q(
    "SELECT COUNT(*) n FROM students WHERE room_id=? AND id<>?",
    [roomId, selfId || ""],
  );
  return c.n >= r.capacity ? "Phòng đã đầy" : null;
}
app.post(
  "/api/students",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const { name, sex = "Nam", faculty = "", phone = "" } = req.body;
    const id = String(req.body.id || "")
      .trim()
      .toUpperCase();
    const room = req.body.room_id || null;
    if (!id || !name) bad("Thiếu mã hoặc họ tên sinh viên");
    const [ex] = await q("SELECT 1 x FROM students WHERE id=?", [id]);
    if (ex) bad("Mã sinh viên đã tồn tại");
    const p = await roomProblem(room, id);
    if (p) bad(p);
    await q(
      "INSERT INTO students (id,name,sex,faculty,phone,room_id,start_date) VALUES (?,?,?,?,?,?,?)",
      [
        id,
        name,
        sex,
        faculty,
        phone,
        room,
        room ? new Date().toISOString().slice(0, 10) : null,
      ],
    );
    res.json({ ok: true });
  }),
);
app.put(
  "/api/students/:id",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const [old] = await q(
      "SELECT room_id,start_date FROM students WHERE id=?",
      [req.params.id],
    );
    if (!old) bad("Không tìm thấy sinh viên", 404);
    const { name, sex = "Nam", faculty = "", phone = "" } = req.body;
    const room = req.body.room_id || null;
    const p = await roomProblem(room, req.params.id);
    if (p) bad(p);
    const start = !room
      ? null
      : room !== old.room_id || !old.start_date
        ? new Date().toISOString().slice(0, 10)
        : old.start_date;
    await q(
      "UPDATE students SET name=?,sex=?,faculty=?,phone=?,room_id=?,start_date=? WHERE id=?",
      [name, sex, faculty, phone, room, start, req.params.id],
    );
    await q("UPDATE accounts SET name=? WHERE student_id=?", [
      name,
      req.params.id,
    ]);
    res.json({ ok: true });
  }),
);
app.delete(
  "/api/students/:id",
  authMw,
  onlyLT,
  h(async (req, res) => {
    await q("DELETE FROM students WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  }),
);

/* ---------- hóa đơn (theo phòng – tháng) ---------- */
const INV_SQL = `SELECT id,room_id,month,room_fee,elec_old,elec_new,elec_rate,water_old,water_new,water_rate,
                        due_date,paid,paid_at,method FROM invoices`;
app.get(
  "/api/invoices",
  authMw,
  h(async (req, res) => {
    if (isLT(req.u))
      return res.json(await q(INV_SQL + " ORDER BY month, room_id"));
    res.json(
      await q(
        INV_SQL +
          " WHERE room_id=(SELECT room_id FROM students WHERE id=?) ORDER BY month",
        [req.u.student_id],
      ),
    );
  }),
);
app.patch(
  "/api/invoices/:id/pay",
  authMw,
  h(async (req, res) => {
    const [inv] = await q("SELECT room_id,paid FROM invoices WHERE id=?", [
      req.params.id,
    ]);
    if (!inv) bad("Không tìm thấy hóa đơn", 404);
    if (!isLT(req.u)) {
      const [s] = await q("SELECT room_id FROM students WHERE id=?", [
        req.u.student_id,
      ]);
      if (!s || s.room_id !== inv.room_id)
        bad("Hóa đơn không thuộc phòng của bạn", 403);
    }
    if (inv.paid) bad("Hóa đơn này đã được thanh toán");
    await q("UPDATE invoices SET paid=1, paid_at=NOW(), method=? WHERE id=?", [
      req.body.method || "Tiền mặt",
      req.params.id,
    ]);
    res.json({ ok: true });
  }),
);

/* ---------- vi phạm ---------- */
// LƯU Ý: Lấy id trực tiếp từ DB, không ghép thêm chữ VP nữa vì DB đã lưu dạng VP001 rồi
const VP_SQL = `SELECT id, student_id, room_id, type, level, note, status, reply,
                       created_at AS date, created_by FROM violations`;
app.get(
  "/api/violations",
  authMw,
  h(async (req, res) => {
    if (isLT(req.u))
      return res.json(await q(VP_SQL + " ORDER BY created_at DESC, id DESC"));
    res.json(
      await q(
        VP_SQL + " WHERE student_id=? ORDER BY created_at DESC, id DESC",
        [req.u.student_id],
      ),
    );
  }),
);
app.post(
  "/api/violations",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const { student_id, type, level = "Nhắc nhở", note = "" } = req.body;
    const [s] = await q("SELECT room_id FROM students WHERE id=?", [
      student_id,
    ]);
    if (!s) bad("Không tìm thấy sinh viên");
    await q(
      "INSERT INTO violations (student_id,room_id,type,level,note,created_by) VALUES (?,?,?,?,?,?)",
      [student_id, s.room_id, type, level, note, req.u.name],
    );
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/violations/:id/resolve",
  authMw,
  onlyLT,
  h(async (req, res) => {
    await q("UPDATE violations SET status='Đã xử lý' WHERE id=?", [
      req.params.id, // Bỏ parseInt vì id là dạng chữ VP001
    ]);
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/violations/:id/reply",
  authMw,
  h(async (req, res) => {
    const { reply } = req.body;
    if (!reply) bad("Nội dung phản hồi không được để trống");
    await q("UPDATE violations SET reply=? WHERE id=?", [reply, req.params.id]);
    res.json({ ok: true });
  }),
);

/* ---------- thông báo ---------- */
app.get(
  "/api/notices",
  authMw,
  h(async (req, res) =>
    res.json(
      await q(
        "SELECT id,title,body,date FROM notices ORDER BY date DESC, id DESC",
      ),
    ),
  ),
);

/* ---------- tài khoản (chỉ Lễ tân) ---------- */
app.get(
  "/api/accounts",
  authMw,
  onlyLT,
  h(async (req, res) =>
    res.json(
      await q(
        "SELECT user AS user,name,email,role,active,last_login AS last,student_id AS svId FROM accounts ORDER BY role,user",
      ),
    ),
  ),
);
app.post(
  "/api/accounts",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const user = String(req.body.user || "")
      .trim()
      .toLowerCase();
    const { pass, name, email } = req.body;
    if (!user || !name || !pass || pass.length < 6)
      bad("Thiếu thông tin hoặc mật khẩu dưới 6 ký tự");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[ex]] = await conn.query("SELECT 1 x FROM accounts WHERE user=?", [
        user,
      ]);
      if (ex) bad("Tên đăng nhập đã tồn tại");
      let sid = req.body.svId
        ? String(req.body.svId).trim().toUpperCase()
        : null;
      if (sid) {
        const [[s]] = await conn.query("SELECT 1 x FROM students WHERE id=?", [
          sid,
        ]);
        const [[l]] = await conn.query(
          "SELECT 1 x FROM accounts WHERE student_id=?",
          [sid],
        );
        if (l) bad("Mã sinh viên này đã có tài khoản");
        if (!s)
          await conn.query("INSERT INTO students (id,name) VALUES (?,?)", [
            sid,
            name,
          ]);
      } else {
        sid = await nextStudentId(conn);
        await conn.query("INSERT INTO students (id,name) VALUES (?,?)", [
          sid,
          name,
        ]);
      }
      await conn.query(
        "INSERT INTO accounts (user,pass_hash,name,email,role,student_id) VALUES (?,?,?,?,?,?)",
        [
          user,
          await bcrypt.hash(pass, 10),
          name,
          email || user + "@sv.edu.vn",
          "Sinh viên",
          sid,
        ],
      );
      await conn.commit();
      res.json({ ok: true, svId: sid });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }),
);
app.put(
  "/api/accounts/:user",
  authMw,
  onlyLT,
  h(async (req, res) => {
    const { name, email, active } = req.body;
    if (active === false && req.params.user === req.u.user)
      bad("Không thể tự khóa tài khoản của chính mình");
    await q(
      `UPDATE accounts SET name=COALESCE(?,name), email=COALESCE(?,email), active=COALESCE(?,active) WHERE user=?`,
      [
        name ?? null,
        email ?? null,
        active === undefined ? null : active ? 1 : 0,
        req.params.user,
      ],
    );
    if (name)
      await q(
        "UPDATE students SET name=? WHERE id=(SELECT student_id FROM accounts WHERE user=?)",
        [name, req.params.user],
      );
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/accounts/:user/reset",
  authMw,
  onlyLT,
  h(async (req, res) => {
    await q("UPDATE accounts SET pass_hash=? WHERE user=?", [
      await bcrypt.hash("123456", 10),
      req.params.user,
    ]);
    res.json({ ok: true });
  }),
);
app.delete(
  "/api/accounts/:user",
  authMw,
  onlyLT,
  h(async (req, res) => {
    if (req.params.user === req.u.user)
      bad("Không thể xóa tài khoản của chính mình");
    await q("DELETE FROM accounts WHERE user=?", [req.params.user]);
    res.json({ ok: true });
  }),
);

/* ---------- khởi động ---------- */
(async () => {
  const empty = await q("SELECT user FROM accounts WHERE pass_hash=''");
  if (empty.length) {
    const hash = await bcrypt.hash("123456", 10);
    await q("UPDATE accounts SET pass_hash=? WHERE pass_hash=''", [hash]);
    console.log(`Đã đặt mật khẩu 123456 cho ${empty.length} tài khoản demo`);
  }
  app.listen(process.env.PORT || 3000, () =>
    console.log("API chạy tại http://localhost:3000/api"),
  );
})().catch((e) => {
  console.error("Không kết nối được MySQL:", e.message);
  process.exit(1);
});
