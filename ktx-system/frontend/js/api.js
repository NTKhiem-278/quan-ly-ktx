const API_BASE = "http://localhost:3000/api";
let TOKEN = localStorage.getItem("ktx_token");

async function api(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (TOKEN) headers.Authorization = "Bearer " + TOKEN;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") {
    if (typeof doLogout === "function") doLogout();
    throw new Error(data.error || "Phiên hết hạn, vui lòng đăng nhập lại");
  }
  if (!res.ok) throw new Error(data.error || "Lỗi API");
  return data;
}

const Api = {
  login: (user, pass) =>
    api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ user, pass }),
    }),
  register: (body) =>
    api("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  rooms: () => api("/rooms"),
  roomSave: (id, status) =>
    api("/rooms/" + id, { method: "PATCH", body: JSON.stringify({ status }) }),
  students: () => api("/students"),
  studentAdd: (b) =>
    api("/students", { method: "POST", body: JSON.stringify(b) }),
  studentUpdate: (id, b) =>
    api("/students/" + id, { method: "PUT", body: JSON.stringify(b) }),
  studentDel: (id) => api("/students/" + id, { method: "DELETE" }),
  invoices: (q = "") => api("/invoices" + q),
  payInvoice: (id, method, paid) =>
    api("/invoices/" + id + "/pay", {
      method: "PATCH",
      body: JSON.stringify({ method, paid }),
    }),
  violations: (q = "") => api("/violations" + q),
  violationAdd: (b) =>
    api("/violations", { method: "POST", body: JSON.stringify(b) }),
  violationResolve: (id) =>
    api("/violations/" + id + "/resolve", { method: "PATCH" }),
  violationReply: (id, reply) =>
    api("/violations/" + id + "/reply", {
      method: "PATCH",
      body: JSON.stringify({ reply }),
    }),
  notices: () => api("/notices"),
  accounts: () => api("/accounts"),
  accountAdd: (b) =>
    api("/accounts", { method: "POST", body: JSON.stringify(b) }),
  accountUpdate: (user, b) =>
    api("/accounts/" + user, { method: "PUT", body: JSON.stringify(b) }),
  accountReset: (user) =>
    api("/accounts/" + user + "/reset", { method: "PATCH" }),
  accountDel: (user) => api("/accounts/" + user, { method: "DELETE" }),
};

const PERMS = {
  "Sinh viên": [
    "Xem phòng của mình",
    "Tra cứu & thanh toán hóa đơn",
    "Xem thông báo vi phạm",
  ],
  "Lễ tân": [
    "Quản lý tình trạng phòng",
    "Quản lý sinh viên nội trú",
    "Ghi nhận & xử lý vi phạm",
    "Ghi chỉ số điện nước",
    "Thu tiền phòng theo phòng",
    "Cấp tài khoản sinh viên",
  ],
};

const ROLE_CODE = { "Sinh viên": "sv", "Lễ tân": "lt" };
