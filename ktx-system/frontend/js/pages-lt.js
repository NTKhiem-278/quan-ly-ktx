PAGES["lt-home"] = () => {
  const totalBeds = DB.rooms.reduce((s, r) => s + r.cap, 0);
  const occupiedBeds = DB.students.length;
  const freeBeds = totalBeds - occupiedBeds;
  const fullRooms = DB.rooms.filter((r) => roomState(r).k === "full").length;
  const vps = DB.violations;

  return `
  <div class="grid g4 section">
    <div class="stat accent"><div class="lbl">Chỗ trống còn nhận</div><div class="val">${freeBeds}</div><div class="foot">Trên tổng ${totalBeds} giường</div></div>
    <div class="stat"><div class="lbl">Sinh viên đang ở</div><div class="val">${occupiedBeds}</div><div class="foot">${DB.rooms.length} phòng thuộc 3 khu</div></div>
    <div class="stat"><div class="lbl">Phòng đã kín chỗ</div><div class="val">${fullRooms}</div><div class="foot">Không nhận thêm sinh viên</div></div>
    <div class="stat"><div class="lbl">Vi phạm trong tháng</div><div class="val">${vps.length}</div><div class="foot">Bạn lập ${vps.filter((v) => v.by === CURRENT.name).length} biên bản</div></div>
  </div>

  <div class="section">
    <div class="section-h"><h2>Phòng còn nhận sinh viên</h2><p>Sắp theo số chỗ trống nhiều nhất</p>
      <button class="btn right" onclick="page='lt-rooms';render()">Xem toàn bộ sơ đồ</button></div>
    ${LEGEND}
    ${keytags(
      DB.rooms
        .filter((r) => roomState(r).k !== "full")
        .sort((a, b) => b.cap - occ(b.id) - (a.cap - occ(a.id)))
        .slice(0, 8),
      "roomModal",
    )}
  </div>

  <div class="card">
    <div class="card-h"><h3>Vi phạm mới ghi nhận</h3>
      <button class="btn k sm right" onclick="vpModal()">Lập biên bản mới</button></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Ngày</th><th>Sinh viên</th><th>Phòng</th><th>Nội dung</th><th>Mức độ</th></tr></thead>
      <tbody>${vps
        .slice(0, 4)
        .map(
          (v) => `<tr>
        <td>${v.date ? String(v.date).slice(0, 10) : ""}</td>
        <td>${stuOf(v.sv).name}</td>
        <td>${v.room}</td>
        <td>${v.type}</td>
        <td>${lvTag(v.level)}</td>
      </tr>`,
        )
        .join("")}</tbody>
    </table></div>
  </div>`;
};

PAGES["lt-rooms"] = () => `
  <div class="toolbar">
    <select id="fZone" onchange="filterRooms()"><option value="">Tất cả các khu</option>${[...new Set(DB.rooms.map((r) => r.zone))].map((z) => `<option>${z}</option>`).join("")}</select>
    <select id="fState" onchange="filterRooms()">
      <option value="">Mọi tình trạng</option><option value="free">Còn chỗ</option><option value="full">Đã đầy</option>
      <option value="empty">Phòng trống</option><option value="fix">Đang sửa chữa</option></select>
    ${role === "lt" ? `<button class="btn k right" onclick="roomAddModal()">Thêm phòng</button>` : ""}
    <span class="muted right" id="rCount"></span>
  </div>
  ${LEGEND}
  <div id="roomGrid">${keytags(DB.rooms, "roomModal")}</div>
  
  <div class="card section" style="margin-top: 20px;">
    <div class="card-h"><h3>Bảng giá và sức chứa</h3><span class="muted right">Giá tính theo người, thu hằng tháng</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Phòng</th><th>Khu</th><th>Loại</th><th class="num">Sức chứa</th><th class="num">Đang ở</th><th class="num">Giá phòng</th><th>Tình trạng</th></tr></thead>
      <tbody>${DB.rooms
        .map((r) => {
          const st = roomState(r);
          return `<tr>
          <td><b>${r.id}</b></td><td>${r.zone}</td><td>${r.type}</td>
          <td class="num">${r.cap}</td><td class="num">${occ(r.id)}</td>
          <td class="num">${money(r.price)}</td>
          <td><span class="tag ${st.k === "full" ? "bad" : st.k === "free" ? "wait" : "mute"}">${st.t}</span></td>
        </tr>`;
        })
        .join("")}</tbody>
    </table></div>
  </div>`;

function filterRooms() {
  const z = $("#fZone").value,
    s = $("#fState").value;
  const list = DB.rooms.filter(
    (r) => (!z || r.zone === z) && (!s || roomState(r).k === s),
  );
  $("#roomGrid").innerHTML = list.length
    ? keytags(list, "roomModal")
    : `<div class="card"><div class="empty"><b>Không có phòng nào khớp bộ lọc</b>Thử bỏ bớt một điều kiện.</div></div>`;
  $("#rCount").textContent = `${list.length} phòng`;
}

PAGES["lt-stu"] = () => `
  <div class="toolbar">
    <input type="search" id="q" placeholder="Tìm theo tên, mã sinh viên hoặc phòng" oninput="filterStu()">
    <select id="qRoom" onchange="filterStu()"><option value="">Mọi phòng</option>${DB.rooms.map((r) => `<option>${r.id}</option>`).join("")}</select>
    <button class="btn k right" onclick="stuModal()">Thêm sinh viên</button>
  </div>
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Sinh viên</th><th>Giới tính</th><th>Khoa</th><th>Phòng</th><th>Liên hệ</th><th>Nhận phòng</th><th></th></tr></thead>
    <tbody id="stuRows">${stuRows()}</tbody>
  </table></div></div>`;

function stuRows(list) {
  list = list || DB.students;
  if (!list.length)
    return `<tr><td colspan="7"><div class="empty"><b>Không tìm thấy sinh viên</b></div></td></tr>`;
  return list
    .map(
      (s) => `<tr>
    <td><div class="stu"><div class="avt">${initials(s.name)}</div><div><b>${s.name}</b><span class="muted">${s.id}</span></div></div></td>
    <td>${s.sex}</td><td>${s.faculty}</td>
    <td><b>${s.room || "—"}</b> <span class="muted">${(roomOf(s.room) || {}).zone || ""}</span></td>
    <td class="muted">${s.phone}</td><td class="muted">${s.start ? String(s.start).slice(0, 10) : ""}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn sm" onclick="stuModal('${s.id}')">Sửa</button>
      <button class="btn sm danger" onclick="checkout('${s.id}')">Trả phòng</button>
    </td></tr>`,
    )
    .join("");
}

function filterStu() {
  const q = ($("#q").value || "").toLowerCase(),
    r = $("#qRoom").value;
  const list = DB.students.filter(
    (s) =>
      (!r || s.room === r) &&
      (s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.room || "").toLowerCase().includes(q)),
  );
  $("#stuRows").innerHTML = stuRows(list);
}

PAGES["lt-vp"] = () => {
  const c = (l) => DB.violations.filter((v) => v.level === l).length;
  return `
  <div class="grid g4 section">
    <div class="stat accent"><div class="lbl">Tổng biên bản</div><div class="val">${DB.violations.length}</div><div class="foot">Học kỳ I năm 2025–2026</div></div>
    <div class="stat"><div class="lbl">Nhắc nhở</div><div class="val">${c("Nhắc nhở")}</div><div class="foot">Lỗi nhẹ, nhắc nhở</div></div>
    <div class="stat"><div class="lbl">Cảnh cáo</div><div class="val">${c("Cảnh cáo")}</div><div class="foot">Gửi thông báo về khoa</div></div>
    <div class="stat"><div class="lbl">Kỷ luật</div><div class="val">${c("Kỷ luật")}</div><div class="foot">Mời phụ huynh làm việc</div></div>
  </div>

  <div class="card">
    <div class="card-h"><h3>Danh sách biên bản</h3>
      <button class="btn k sm right" onclick="vpModal()">Lập biên bản mới</button></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>Ngày</th><th>Sinh viên</th><th>Phòng</th><th>Nội dung</th><th>Mức độ</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${DB.violations
        .map(
          (v) => `<tr>
        <td class="muted">${v.id}</td>
        <td>${v.date ? String(v.date).slice(0, 10) : ""}</td>
        <td><b>${stuOf(v.sv).name}</b><div class="muted">${v.sv}</div></td>
        <td>${v.room || ""}</td>
        <td>
          ${v.type}
          <div class="muted">${v.note || ""}</div>
          ${v.reply ? `<div style="margin-top:8px; padding:8px 10px; background:var(--bad-bg); border-radius:6px; font-size:12.5px; color:var(--bad);"><b>SV phản hồi:</b> ${v.reply}</div>` : ""}
        </td>
        <td>${lvTag(v.level)}</td>
        <td><span class="tag ${v.status === "Đang xử lý" ? "wait" : v.status === "Đã xử lý" ? "ok" : "mute"}">${v.status}</span></td>
        <td style="text-align:right"><button class="btn sm" onclick="resolveVp('${v.id}')" ${v.status === "Đã xử lý" ? "disabled" : ""}>Đánh dấu đã xử lý</button></td>
      </tr>`,
        )
        .join("")}</tbody>
    </table></div>
  </div>`;
};

async function resolveVp(id) {
  try {
    await Api.violationResolve(id);
    await loadAllData();
    render();
    toast(`Đã đóng biên bản ${id}`);
  } catch (e) {
    toast(e.message);
  }
}

PAGES["lt-acc"] = () => {
  const roles = ["Sinh viên", "Lễ tân", "Quản trị viên"];
  return `
  <div class="grid g3 section">
    ${roles
      .map((r) => {
        const count = DB.accounts.filter((a) => a.role === r).length;
        return `<div class="card">
        <div class="card-h"><h3>${r}</h3><span class="note right">${count} tài khoản</span></div>
        <div class="card-b muted" style="font-size:13px;">Quản lý các tài khoản hệ thống.</div>
      </div>`;
      })
      .join("")}
  </div>
  <p class="muted">Tài khoản bị khóa không đăng nhập được nhưng dữ liệu vẫn được giữ lại.</p>
  
  <div class="toolbar">
    <button class="btn k right" onclick="accModal()">Cấp tài khoản mới</button>
  </div>
  
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Tài khoản</th><th>Họ tên</th><th>Vai trò</th><th>Email</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${DB.accounts
      .map(
        (a) => `<tr>
      <td><b>${a.user}</b></td><td>${a.name}</td>
      <td><span class="tag ${a.role === "Quản trị viên" ? "wait" : a.role === "Lễ tân" ? "ok" : "mute"}">${a.role}</span></td>
      <td class="muted">${a.email}</td><td class="muted">${a.last ? String(a.last).slice(0, 16) : "—"}</td>
      <td>${a.active ? '<span class="tag ok"><span class="dotm"></span>Đang hoạt động</span>' : '<span class="tag bad"><span class="dotm"></span>Đã khóa</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn sm" onclick="resetPass('${a.user}')">Đặt lại mật khẩu</button>
        <button class="btn sm ${a.active ? "danger" : ""}" onclick="toggleAcc('${a.user}')">${a.active ? "Khóa" : "Mở khóa"}</button>
      </td></tr>`,
      )
      .join("")}</tbody>
  </table></div></div>`;
};

async function toggleAcc(u) {
  try {
    const a = DB.accounts.find((x) => x.user === u);
    await Api.accountUpdate(u, { active: !a.active });
    await loadAllData();
    render();
    toast(a.active ? `Đã khóa tài khoản ${u}` : `Đã mở khóa tài khoản ${u}`);
  } catch (e) {
    toast(e.message);
  }
}

async function resetPass(u) {
  if (!confirm(`Đặt lại mật khẩu cho ${u} về 123456?`)) return;
  try {
    await Api.accountReset(u);
    toast(`Đã đặt lại mật khẩu cho ${u} (pass: 123456)`);
  } catch (e) {
    toast(e.message);
  }
}

/* ===== Tiền phòng & chỉ số ===== */
let moneyMonth = null;
PAGES["lt-money"] = () => {
  const months = [...new Set(DB.invoices.map((i) => i.month))].sort().reverse();
  if (!moneyMonth || !months.includes(moneyMonth))
    moneyMonth = months[0] || null;
  const list = DB.invoices.filter((i) => i.month === moneyMonth);
  const sum = (a) => a.reduce((s, i) => s + total(i), 0);
  const paid = list.filter((i) => i.paid),
    unpaid = list.filter((i) => !i.paid);
  return `
  <div class="toolbar">
    <select onchange="setMoneyMonth(this.value)">${months.map((m) => `<option ${m === moneyMonth ? "selected" : ""}>${m}</option>`).join("")}</select>
  </div>
  <div class="grid g3 section">
    <div class="stat accent"><div class="lbl">Tổng phải thu</div><div class="val">${money(sum(list))}</div><div class="foot">${list.length} phòng · tháng ${moneyMonth || "—"}</div></div>
    <div class="stat"><div class="lbl">Đã thu</div><div class="val">${money(sum(paid))}</div><div class="foot">${paid.length} phòng</div></div>
    <div class="stat"><div class="lbl">Còn phải thu</div><div class="val">${money(sum(unpaid))}</div><div class="foot">${unpaid.length} phòng</div></div>
  </div>
  <div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>Phòng</th><th class="num">Số người</th><th class="num">Tiền phòng</th><th class="num">Điện</th><th class="num">Nước</th><th class="num">Tổng</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${
      list.length
        ? list
            .map(
              (i) => `<tr>
      <td><b>${i.room}</b></td><td class="num">${occ(i.room)}</td>
      <td class="num">${money(i.room_fee)}</td>
      <td class="num">${i.elec.new - i.elec.old} kWh · ${money(elecAmt(i))}</td>
      <td class="num">${i.water.new - i.water.old} m³ · ${money(waterAmt(i))}</td>
      <td class="num"><b>${money(total(i))}</b></td>
      <td>${i.paid ? `<span class="tag ok"><span class="dotm"></span>Đã thu</span><div class="muted">${i.paidAt ? String(i.paidAt).slice(0, 10) : ""} · ${i.method || ""}</div>` : `<span class="tag bad"><span class="dotm"></span>Chưa thu</span>`}</td>
      <td style="text-align:right">${i.paid ? "" : `<button class="btn k sm" onclick="collectRoom('${i.id}')">Thu tiền mặt</button>`}</td>
    </tr>`,
            )
            .join("")
        : `<tr><td colspan="8"><div class="empty"><b>Chưa có hóa đơn</b></div></td></tr>`
    }</tbody>
  </table></div></div>`;
};
function setMoneyMonth(m) {
  moneyMonth = m;
  render();
}
async function collectRoom(id) {
  if (!confirm(`Xác nhận đã thu tiền hóa đơn ${id}?`)) return;
  try {
    await Api.payInvoice(id, "Tiền mặt", true);
    await loadAllData();
    render();
    toast(`Đã thu tiền hóa đơn ${id}`);
  } catch (e) {
    toast(e.message);
  }
}
