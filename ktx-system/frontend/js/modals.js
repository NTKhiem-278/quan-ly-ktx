let payPick = "vnpay";

function payModal(id) {
  const i = DB.invoices.find((x) => x.id === id);
  openModal(`
    <div class="modal-h"><h3>Thanh toán hóa đơn ${i.month}</h3><button onclick="closeModal()" aria-label="Đóng">×</button></div>
    <div class="modal-b">
      <div>
        <div class="sum-row"><span>Tiền phòng</span><span>${money(i.room_fee)}</span></div>
        <div class="sum-row"><span>Tiền điện ${i.elec.new - i.elec.old} kWh</span><span>${money(elecAmt(i))}</span></div>
        <div class="sum-row"><span>Tiền nước ${i.water.new - i.water.old} m³</span><span>${money(waterAmt(i))}</span></div>
        <div class="sum-row tot"><span>Tổng thanh toán</span><span>${money(total(i))}</span></div>
      </div>
      <div class="field"><label>Chọn cách thanh toán</label>
        <div style="display:grid;gap:8px">
          <div class="pay-opt on" data-p="vnpay" onclick="pickPay(this)"><div class="logo" style="background:#0a4d9e">VN</div><div><b>VNPay</b><span>Quét mã QR</span></div></div>
          <div class="pay-opt" data-p="momo" onclick="pickPay(this)"><div class="logo" style="background:#a50064">MM</div><div><b>Ví Momo</b><span>Chuyển sang Momo</span></div></div>
          <div class="pay-opt" data-p="atm" onclick="pickPay(this)"><div class="logo" style="background:#13603f">ATM</div><div><b>Thẻ nội địa</b><span>Internet Banking</span></div></div>
        </div>
      </div>
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="doPay('${i.id}')">Thanh toán ${money(total(i))}</button></div>`);
}
function pickPay(el) {
  document.querySelectorAll(".pay-opt").forEach((x) => x.classList.remove("on"));
  el.classList.add("on"); payPick = el.dataset.p;
}
async function doPay(id) {
  const method = payPick === "vnpay" ? "VNPay" : payPick === "momo" ? "Momo" : "Thẻ nội địa";
  try {
    await Api.payInvoice(id, method, true); closeModal(); await loadAllData(); render();
    const i = DB.invoices.find((x) => x.id === id); toast(`Đã thanh toán ${money(total(i))} cho hóa đơn ${i.id}`);
  } catch (e) { toast(e.message); }
}

function roomModal(id) {
  const r = roomOf(id), st = roomState(r), list = DB.students.filter((s) => s.room === id);
  openModal(`
    <div class="modal-h"><h3>Phòng ${r.id} · ${r.zone}</h3><button onclick="closeModal()" aria-label="Đóng">×</button></div>
    <div class="modal-b">
      <div style="display:flex;gap:12px;align-items:center">
        <span class="tag ${st.k === "full" ? "bad" : st.k === "free" ? "wait" : "mute"}">${st.t}</span>
        <span class="muted">${r.type} · ${money(r.price)}/người</span>
      </div>
      <div class="beds">${Array.from({ length: r.cap }, (_, i) => `<span class="bed ${i < occ(id) ? "on" : ""}"></span>`).join("")}</div>
      
      ${list.length ? `<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:9px"><table>
        <thead><tr><th>Sinh viên</th><th>Khoa</th><th></th></tr></thead>
        <tbody>${list.map((s) => `<tr>
          <td><b style="font-weight:600">${s.name}</b><div class="muted">${s.id}</div></td>
          <td class="muted">${s.faculty}</td>
          <td style="text-align:right">
            <button class="btn sm danger" onclick="removeFromRoom('${s.id}')">Xóa khỏi phòng</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : `<div class="empty" style="padding:20px"><b>Chưa có sinh viên nào ở phòng này</b>Xếp sinh viên vào để bắt đầu tính phí.</div>`}
      
      <div class="field"><label>Đổi tình trạng phòng</label>
        <select id="rstate">
          <option value="ok" ${r.status === "ok" ? "selected" : ""}>Đang sử dụng bình thường</option>
          <option value="fix" ${r.status === "fix" ? "selected" : ""}>Tạm ngưng để sửa chữa</option>
        </select>
      </div>
    </div>
    <div class="modal-f">
      <button class="btn" onclick="closeModal()">Đóng</button>
      <button class="btn" onclick="assignRoom('${r.id}')" ${occ(id) >= r.cap || r.status === "fix" ? "disabled" : ""}>Xếp thêm sinh viên</button>
      <button class="btn p" onclick="saveRoom('${r.id}')">Lưu thay đổi</button>
    </div>`);
}

async function removeFromRoom(svId) {
  const s = stuOf(svId);
  if (!confirm(`Bạn có chắc muốn xóa ${s.name} khỏi phòng ${s.room}?\nSinh viên này sẽ được đưa về danh sách chờ xếp phòng.`)) return;
  
  try {
    await Api.studentUpdate(svId, { 
      name: s.name, 
      sex: s.sex, 
      room_id: null, 
      faculty: s.faculty, 
      phone: s.phone 
    });
    
    await loadAllData(); 
    render();
    closeModal(); 
    toast(`Đã xóa ${s.name} khỏi phòng. Sinh viên đã về danh sách chờ.`);
  } catch (e) { 
    toast(e.message); 
  }
}

async function saveRoom(id) {
  try { await Api.roomSave(id, $("#rstate").value); closeModal(); await loadAllData(); render(); toast(`Đã cập nhật tình trạng phòng ${id}`); } catch (e) { toast(e.message); }
}

function assignRoom(roomId) {
  closeModal();
  const unassignedStudents = DB.students.filter(s => !s.room || s.room === "null" || s.room === "");
  
  if (unassignedStudents.length === 0) {
    return toast('Hiện tại không có sinh viên nào đang chờ xếp phòng!');
  }

  openModal(`
    <div class="modal-h"><h3>Xếp sinh viên vào phòng ${roomId}</h3><button onclick="closeModal()" aria-label="Đóng">×</button></div>
    <div class="modal-b">
      <div class="field">
        <label>Danh sách sinh viên chờ xếp phòng (${unassignedStudents.length} người)</label>
        <select id="assignStuSelect">
          ${unassignedStudents.map(s => `<option value="${s.id}">${s.name} (${s.id}) - ${s.faculty}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-f">
      <button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="confirmAssign('${roomId}')">Xếp vào phòng</button>
    </div>`);
}

async function confirmAssign(roomId) {
  const svId = $('#assignStuSelect').value;
  if (!svId) return;
  const s = stuOf(svId);
  try {
    await Api.studentUpdate(svId, { name: s.name, sex: s.sex, room_id: roomId, faculty: s.faculty, phone: s.phone });
    closeModal(); await loadAllData(); render();
    toast(`Đã xếp ${s.name} vào phòng ${roomId}`);
  } catch (e) { toast(e.message); }
}

const VP_TYPES = ["Về ký túc xá sau giờ quy định", "Nấu ăn trong phòng", "Gây mất trật tự sau 23h", "Không giữ vệ sinh chung", "Đưa người ngoài vào phòng", "Sử dụng thiết bị điện công suất lớn", "Hút thuốc trong khu nội trú"];

function vpModal(svId) {
  const roomsWithStudents = DB.rooms.filter(r => occ(r.id) > 0);
  openModal(`
    <div class="modal-h"><h3>Lập biên bản vi phạm</h3><button onclick="closeModal()" aria-label="Đóng">×</button></div>
    <div class="modal-b">
      <div class="field"><label>Bước 1 — Chọn phòng</label>
        <select id="vRoom" onchange="fillRoomStudents()">
          <option value="">— Chọn phòng —</option>
          ${roomsWithStudents.map(r => `<option value="${r.id}">${r.id} — ${r.zone} (${occ(r.id)} SV)</option>`).join("")}
        </select></div>
      <div class="field"><label>Bước 2 — Chọn sinh viên vi phạm</label>
        <select id="vSv" disabled><option value="">— Chọn phòng trước —</option></select></div>
      <div class="field"><label>Nội dung vi phạm</label>
        <select id="vType">${VP_TYPES.map((t) => `<option>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Mức độ xử lý</label>
        <select id="vLv"><option>Nhắc nhở</option><option>Cảnh cáo</option><option>Kỷ luật</option></select></div>
      <div class="field"><label>Mô tả sự việc</label>
        <textarea id="vNote" rows="3" placeholder="Ghi rõ thời gian, địa điểm và diễn biến"></textarea></div>
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="saveVp()">Lập biên bản</button></div>`);
}

function fillRoomStudents() {
  const roomId = $("#vRoom").value;
  const sel = $("#vSv");
  if (!roomId) {
    sel.innerHTML = '<option value="">— Chọn phòng trước —</option>';
    sel.disabled = true;
    return;
  }
  const list = DB.students.filter(s => s.room === roomId);
  sel.innerHTML = list.map(s => `<option value="${s.id}">${s.name} — ${s.id}</option>`).join("");
  sel.disabled = false;
}

async function saveVp() {
  const roomId = $("#vRoom").value;
  const svId = $("#vSv").value;
  if (!roomId) return toast("Vui lòng chọn phòng");
  if (!svId) return toast("Vui lòng chọn sinh viên vi phạm");
  try {
    await Api.violationAdd({ student_id: svId, type: $("#vType").value, level: $("#vLv").value, note: $("#vNote").value });
    closeModal(); await loadAllData(); render(); toast('Đã lập biên bản');
  } catch (e) { toast(e.message); }
}

function stuModal(id) {
  const s = id ? stuOf(id) : { name: "", id: "", sex: "Nam", room: "", faculty: "", phone: "", start: "" };
  openModal(`
    <div class="modal-h"><h3>${id ? "Sửa thông tin sinh viên" : "Thêm sinh viên nội trú"}</h3><button onclick="closeModal()" aria-label="Đóng">×</button></div>
    <div class="modal-b">
      <div class="grid g2" style="gap:12px">
        <div class="field"><label>Họ và tên</label><input id="sName" value="${s.name}"></div>
        <div class="field"><label>Mã sinh viên</label><input id="sId" value="${s.id}" ${id ? "disabled" : ""} placeholder="SV21027"></div>
        <div class="field"><label>Giới tính</label><select id="sSex"><option ${s.sex === "Nam" ? "selected" : ""}>Nam</option><option ${s.sex === "Nữ" ? "selected" : ""}>Nữ</option></select></div>
        <div class="field"><label>Khoa</label><input id="sFac" value="${s.faculty}" placeholder="Công nghệ thông tin"></div>
        <div class="field"><label>Số điện thoại</label><input id="sPhone" value="${s.phone}" placeholder="0912 345 678"></div>
        <div class="field"><label>Phòng (Để trống nếu chưa xếp)</label>
          <select id="sRoom">
            <option value="">-- Chưa xếp phòng --</option>
            ${DB.rooms.map((r) => {
              const st = roomState(r);
              const disabled = (st.k === "full" && r.id !== s.room) || r.status === "fix";
              return `<option value="${r.id}" ${r.id === s.room ? "selected" : ""} ${disabled ? "disabled" : ""}>${r.id} — ${st.t}</option>`;
            }).join("")}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="saveStu('${id || ""}')">${id ? "Lưu thay đổi" : "Thêm sinh viên"}</button></div>`);
}

async function saveStu(id) {
  const roomId = $("#sRoom").value;
  const body = { 
    name: $("#sName").value, 
    sex: $("#sSex").value, 
    room_id: roomId, 
    faculty: $("#sFac").value, 
    phone: $("#sPhone").value 
  };
  try {
    if (id) { 
      await Api.studentUpdate(id, body); 
    } else {
      const sid = $("#sId").value.trim(); 
      if (!sid) return toast("Nhập mã sinh viên");
      await Api.studentAdd({ id: sid, ...body });
    }
    closeModal(); await loadAllData(); render(); 
    toast(id ? "Đã cập nhật" : "Đã thêm sinh viên");
  } catch (e) { toast(e.message); }
}

async function checkout(id) {
  const s = stuOf(id);
  if (!s.room) return toast(`Sinh viên ${s.name} hiện không ở phòng nào.`);
  
  if (!confirm(`Xác nhận cho ${s.name} trả phòng ${s.room}?\nSinh viên này sẽ được đưa về danh sách chờ xếp phòng.`)) return;
  
  try { 
    await Api.studentUpdate(id, { 
      name: s.name, 
      sex: s.sex, 
      room_id: null, 
      faculty: s.faculty, 
      phone: s.phone 
    }); 
    await loadAllData(); 
    render(); 
    toast(`${s.name} đã trả phòng ${s.room} và trở về danh sách chờ.`); 
  } catch (e) { 
    toast(e.message); 
  }
}

function roomAddModal() {
  openModal(`
    <div class="modal-h"><h3>Thêm phòng mới</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-b">
      <div class="grid g2" style="gap:12px">
        <div class="field"><label>Mã phòng</label><input id="newRId" placeholder="VD: D101"></div>
        <div class="field"><label>Khu</label><select id="newRZone"><option>Khu A</option><option>Khu B</option><option>Khu C</option><option>Khu D</option></select></div>
        <div class="field"><label>Loại phòng</label><input id="newRType" value="4 giường · Nam"></div>
        <div class="field"><label>Sức chứa</label><input id="newRCap" type="number" value="4"></div>
        <div class="field"><label>Giá phòng</label><input id="newRPrice" type="number" value="450000"></div>
      </div>
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="saveNewRoom()">Lưu phòng</button></div>`);
}

async function saveNewRoom() {
  const id = $("#newRId").value.trim();
  if(!id) return toast("Vui lòng nhập mã phòng");
  try {
    await api('/rooms', { method: 'POST', body: JSON.stringify({
      id, zone: $("#newRZone").value, type: $("#newRType").value,
      capacity: +$("#newRCap").value, price: +$("#newRPrice").value
    })});
    closeModal(); await loadAllData(); render(); toast("Đã thêm phòng mới");
  } catch(e) { toast(e.message); }
}

function accModal(user) {
  const a = user ? DB.accounts.find(x => x.user === user) : null;
  openModal(`
    <div class="modal-h"><h3>${a ? "Sửa tài khoản sinh viên" : "Cấp tài khoản sinh viên mới"}</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-b">
      <div class="field"><label>Tên đăng nhập</label><input id="acUser" value="${a ? a.user : ""}" ${a ? "disabled" : ""} placeholder="VD: sv21050"></div>
      <div class="field"><label>Họ và tên</label><input id="acName" value="${a ? a.name : ""}" placeholder="Nguyễn Văn A"></div>
      <div class="field"><label>Email</label><input id="acMail" value="${a ? a.email : ""}" placeholder="email@sv.edu.vn"></div>
      <div class="field"><label>Mã sinh viên (Để trống để tự tạo)</label><input id="acSvId" value="${a ? (a.svId || "") : ""}" placeholder="VD: SV21050"></div>
      ${!a ? `<div class="field"><label>Mật khẩu</label><input id="acPass" type="password" placeholder="Ít nhất 6 ký tự"></div>` : ""}
    </div>
    <div class="modal-f"><button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn k" onclick="saveAcc('${user || ""}')">${a ? "Lưu thay đổi" : "Cấp tài khoản"}</button></div>`);
}

async function saveAcc(user) {
  const name = $("#acName").value.trim();
  const mail = $("#acMail").value.trim();
  const svId = $("#acSvId").value.trim();
  
  if (!name) return toast("Vui lòng nhập họ tên");
  
  try {
    if (user) {
      await Api.accountUpdate(user, { name, email: mail });
      toast("Đã cập nhật thông tin tài khoản");
    } else {
      const u = $("#acUser").value.trim().toLowerCase();
      const pass = $("#acPass").value;
      if (!u) return toast("Nhập tên đăng nhập");
      if (pass.length < 6) return toast("Mật khẩu ít nhất 6 ký tự");
      
      const res = await Api.accountAdd({ 
        user: u, 
        pass, 
        name, 
        email: mail || (u + "@sv.edu.vn"), 
        svId: svId || null 
      });
      toast(`Đã cấp tài khoản. Mã SV: ${res.svId}. Mật khẩu: ${pass}`);
    }
    closeModal(); 
    await loadAllData(); 
    render();
  } catch (e) { 
    toast(e.message); 
  }
}