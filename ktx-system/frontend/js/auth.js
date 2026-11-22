let DB = { rooms: [], students: [], invoices: [], violations: [], notices: [], accounts: [] };

async function loadAllData() {
  const isLT = CURRENT && CURRENT.role !== "Sinh viên";
  const [rooms, students, invoices, violations, notices, accounts] = await Promise.all([
    Api.rooms(), Api.students(), Api.invoices(), Api.violations(), Api.notices(),
    isLT ? Api.accounts() : Promise.resolve([])   // Sinh viên không có quyền xem danh sách tài khoản
  ]);
  DB.rooms = rooms;
  DB.students = students.map(s => ({ ...s, room: s.room_id, start: s.start_date }));
  DB.invoices = invoices.map(i => ({
    ...i, sv: i.student_id, room: i.room_id,
    elec: { old: i.elec_old, new: i.elec_new, rate: i.elec_rate },
    water: { old: i.water_old, new: i.water_new, rate: i.water_rate },
    due: i.due_date, paidAt: i.paid_at, method: i.method
  }));
  DB.violations = violations.map(v => ({ ...v, sv: v.student_id, room: v.room_id, by: v.created_by }));
  DB.notices = notices;
  DB.accounts = accounts;
}

function switchAuth(mode) {
  const isLogin = mode === "login";
  $("#tabLogin").classList.toggle("on", isLogin);
  $("#tabReg").classList.toggle("on", !isLogin);
  $("#loginForm").classList.toggle("hide", !isLogin);
  $("#regForm").classList.toggle("hide", isLogin);
  $("#loginMsg").classList.remove("show");
  $("#regMsg").classList.remove("show");
}

function authMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.className = "auth-msg show " + (ok ? "ok" : "err");
}

function fillLogin(u) {
  $("#lgUser").value = u;
  $("#lgPass").value = "123456";
  $("#loginMsg").classList.remove("show");
}

async function doLogin() {
  const u = $("#lgUser").value.trim();
  const p = $("#lgPass").value;
  if (!u || !p) return authMsg("#loginMsg", "Nhập tên đăng nhập và mật khẩu.", false);
  try {
    const { token, user } = await Api.login(u, p);
    TOKEN = token;
    localStorage.setItem('ktx_token', token);
    CURRENT = user;
    ME = user.svId || null;
    await loadAllData();
    authMsg("#loginMsg", "Đăng nhập thành công…", true);
    setTimeout(enterApp, 380);
  } catch (e) {
    authMsg("#loginMsg", e.message, false);
  }
}

async function doRegister() {
  const name = $("#rgName").value.trim();
  const user = $("#rgUser").value.trim().toLowerCase();
  const mail = $("#rgMail").value.trim();
  const p1 = $("#rgPass").value;
  const p2 = $("#rgPass2").value;
  const roleReg = $("#rgRole").value;

  if (!name || !user || !p1) return authMsg("#regMsg", "Điền đầy đủ họ tên, tên đăng nhập và mật khẩu.", false);
  if (user.length < 4) return authMsg("#regMsg", "Tên đăng nhập phải có ít nhất 4 ký tự.", false);
  if (p1.length < 6) return authMsg("#regMsg", "Mật khẩu phải có ít nhất 6 ký tự.", false);
  if (p1 !== p2) return authMsg("#regMsg", "Xác nhận mật khẩu không khớp.", false);

  try {
    const r = await Api.register({ name, user, mail, pass: p1, roleReg });
    authMsg("#regMsg",
      roleReg === "Sinh viên"
        ? `Tạo tài khoản thành công! Mã SV: ${r.studentId}. Đăng nhập bằng ${user}.`
        : `Đã tạo tài khoản Lễ tân. Đăng nhập bằng ${user}.`,
      true);
    setTimeout(() => {
      switchAuth("login");
      fillLogin(user);
      $("#lgPass").value = p1;
    }, 1600);
  } catch (e) {
    authMsg("#regMsg", e.message, false);
  }
}

function enterApp() {
  $("#authWrap").classList.remove("show");
  $("#appRoot").classList.add("show");
  const code = ROLE_CODE[CURRENT.role] || "sv";
  applyRole(code, true);
}

function doLogout() {
  TOKEN = null;
  localStorage.removeItem('ktx_token');
  CURRENT = null;
  ME = null;
  page = "sv-home";
  role = "sv";
  DB = { rooms: [], students: [], invoices: [], violations: [], notices: [], accounts: [] };
  $("#appRoot").classList.remove("show");
  $("#authWrap").classList.add("show");
  const p = $("#lgPass"); if (p) p.value = "";
  const m = $("#loginMsg"); if (m) m.classList.remove("show");
}

/* ===== TỰ ĐỘNG KHÔI PHỤC PHIÊN KHI F5 ===== */
document.addEventListener("DOMContentLoaded", async function restoreSession() {
  if (!TOKEN) return;
  try {
    const me = await api('/auth/me');
    CURRENT = { user: me.user, name: me.name, role: me.role, svId: me.student_id, email: me.email };
    ME = me.student_id || null;
    await loadAllData();
    enterApp();
  } catch (e) {
    localStorage.removeItem('ktx_token');
    TOKEN = null;
  }
});