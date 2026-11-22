const $ = (s) => document.querySelector(s);
const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const initials = (n) =>
  (n || "").trim().split(/\s+/).slice(-2).map((w) => w[0] || "").join("").toUpperCase();
const stuOf = (id) => DB.students.find((s) => s.id === id) || { name: "—", id: id, room: "" };
const roomOf = (id) => DB.rooms.find((r) => r.id === id) || { zone: "", type: "", cap: 0, price: 0, status: "ok" };
const occ = (id) => DB.students.filter((s) => s.room === id).length;

let CURRENT = null;
let ME = null;
let role = "sv";
let page = "sv-home";

function elecAmt(i) { return (i.elec.new - i.elec.old) * i.elec.rate; }
function waterAmt(i) { return (i.water.new - i.water.old) * i.water.rate; }
function total(i) { return Number(i.room_fee) + elecAmt(i) + waterAmt(i); }

function roomMonthTotal(roomId, month) {
  const invs = DB.invoices.filter(i => i.room === roomId && i.month === month);
  return invs.reduce((s, i) => s + total(i), 0);
}
function roomMonthElecWater(roomId, month) {
  const inv = DB.invoices.find(i => i.room === roomId && i.month === month);
  return inv ? (elecAmt(inv) + waterAmt(inv)) : 0;
}
function roomMonthPaidStatus(roomId, month) {
  const invs = DB.invoices.filter(i => i.room === roomId && i.month === month);
  if (!invs.length) return "none";
  const paidCount = invs.filter(i => i.paid).length;
  if (paidCount === invs.length) return "full";
  if (paidCount === 0) return "none";
  return "partial";
}

function roomState(r) {
  if (r.status === "fix") return { k: "fix", t: "Đang sửa chữa" };
  const n = occ(r.id);
  if (n === 0) return { k: "empty", t: "Phòng trống" };
  if (n >= r.cap) return { k: "full", t: "Đã đầy" };
  return { k: "free", t: `Còn ${r.cap - n} chỗ` };
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
function closeModal() {
  $("#veil").classList.remove("show");
  $("#modal").innerHTML = "";
}
function openModal(html) {
  $("#modal").innerHTML = html;
  $("#veil").classList.add("show");
}
$("#veil").addEventListener("click", (e) => {
  if (e.target.id === "veil") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});