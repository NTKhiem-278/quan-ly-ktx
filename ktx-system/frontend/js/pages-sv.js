PAGES["sv-home"] = () => {
  if (!ME)
    return `<div class="card"><div class="empty"><b>Tài khoản Lễ tân</b>Bạn không có dữ liệu nội trú.</div></div>`;
  const me = stuOf(ME);
  if (!me.room)
    return `<div class="card"><div class="empty"><b>Chưa có dữ liệu nội trú</b>Tài khoản của bạn chưa được gán phòng. Vui lòng liên hệ Lễ tân để được xếp phòng.</div></div>`;

  const bill = DB.invoices.find((i) => i.room === me.room && !i.paid);
  const r = roomOf(me.room);
  const vps = DB.violations.filter((v) => v.sv === ME);
  return `
  <div class="grid g3 section">
    <div class="stat accent">
      <div class="lbl">Cần thanh toán</div>
      <div class="val">${bill ? money(total(bill)) : "0đ"}</div>
      <div class="foot">${bill ? `Hóa đơn tháng ${bill.month} · hạn ${bill.due ? String(bill.due).slice(0, 10) : ""}` : "Bạn không còn khoản nợ nào"}</div>
    </div>
    <div class="stat">
      <div class="lbl">Phòng đang ở</div>
      <div class="val">${me.room || "—"} <small>${r.zone}</small></div>
      <div class="foot">${occ(me.room)}/${r.cap} giường · nhận phòng ${me.start ? String(me.start).slice(0, 10) : "—"}</div>
    </div>
    <div class="stat">
      <div class="lbl">Vi phạm đã ghi nhận</div>
      <div class="val">${vps.length} <small>lượt</small></div>
      <div class="foot">Gần nhất: ${vps[0] && vps[0].date ? String(vps[0].date).slice(0, 10) : "—"}</div>
    </div>
  </div>
  ${
    bill
      ? `
  <div class="section">
    <div class="section-h"><h2>Hóa đơn tháng ${bill.month}</h2><p>Mã ${bill.id}</p></div>
    <div class="card"><div class="bill" style="border:0">
      <div class="bill-top">
        <div><div class="muted">Tổng cộng</div><div class="amt">${money(total(bill))}</div></div>
        <span class="tag bad"><span class="dotm"></span>Chưa thanh toán</span>
        <span class="muted right">Hạn cuối ${bill.due ? String(bill.due).slice(0, 10) : ""}</span>
      </div>
      <div class="bill-lines">${billLines(bill)}</div>
      <div class="paybar">
        <button class="btn k" onclick="payModal('${bill.id}')">Thanh toán ngay</button>
        <button class="btn" onclick="page='sv-bill';render()">Xem các tháng trước</button>
      </div>
    </div></div>
  </div>`
      : ""
  }
  <div class="grid g2">
    <div class="card">
      <div class="card-h"><h3>Thông báo từ ban quản lý</h3></div>
      <div class="card-b"><div class="timeline">
        ${DB.notices.map((n) => `<div class="tl ok"><span class="dt">${n.date ? String(n.date).slice(0, 10) : ""}</span><b>${n.title}</b><p>${n.body || ""}</p></div>`).join("")}
      </div></div>
    </div>
    <div class="card">
      <div class="card-h"><h3>Vi phạm của bạn</h3><span class="note right">${vps.length} biên bản</span></div>
      <div class="card-b"><div class="timeline">
        ${vps.length ? vps.map((v) => `<div class="tl"><span class="dt">${v.date ? String(v.date).slice(0, 10) : ""} · ${v.by || ""}</span><b>${v.type}</b><p>${v.note || ""}</p><div style="margin-top:6px">${lvTag(v.level)}</div></div>`).join("") : `<div class="muted">Bạn chưa có vi phạm nào.</div>`}
      </div></div>
    </div>
  </div>`;
};

PAGES["sv-room"] = () => {
  if (!ME) return "";
  const me = stuOf(ME);
  if (!me.room)
    return `<div class="card"><div class="empty"><b>Bạn chưa được xếp phòng</b>Vui lòng liên hệ Lễ tân để được bố trí chỗ ở.</div></div>`;
  const r = roomOf(me.room),
    mates = DB.students.filter((s) => s.room === me.room);
  return `
  <div class="grid g2 section">
    <div class="card">
      <div class="card-h"><h3>Phòng ${r.id}</h3><span class="tag ok right"><span class="dotm"></span>Đang ở</span></div>
      <div class="card-b">
        <div class="bline"><span class="nm">Khu</span><span class="dt">${r.zone}</span></div>
        <div class="bline"><span class="nm">Loại phòng</span><span class="dt">${r.type}</span></div>
        <div class="bline"><span class="nm">Sức chứa</span><span class="dt">${occ(r.id)}/${r.cap} giường đang sử dụng</span></div>
        <div class="bline"><span class="nm">Giá phòng</span><span class="dt">${money(r.price)} / người / tháng</span></div>
        <div class="bline"><span class="nm">Ngày nhận phòng</span><span class="dt">${me.start ? String(me.start).slice(0, 10) : "—"}</span></div>
        <div style="margin-top:14px" class="beds">${Array.from({ length: r.cap }, (_, i) => `<span class="bed ${i < occ(r.id) ? "on" : ""}"></span>`).join("")}</div>
        <p class="muted" style="margin:8px 0 0">Ô đặc là giường đã có người ở.</p>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>Bạn cùng phòng</h3><span class="note right">${mates.length} người</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Sinh viên</th><th>Khoa</th><th>Liên hệ</th></tr></thead>
        <tbody>${mates
          .map(
            (s) => `<tr>
          <td><div class="stu"><div class="avt">${initials(s.name)}</div><div><b>${s.name}${s.id === ME ? " (bạn)" : ""}</b><span class="muted">${s.id}</span></div></div></td>
          <td>${s.faculty}</td><td class="muted">${s.phone}</td></tr>`,
          )
          .join("")}</tbody>
      </table></div>
    </div>
  </div>
  <div class="card">
    <div class="card-h"><h3>Nội quy phòng ở</h3></div>
    <div class="card-b grid g2" style="gap:10px 26px">
      <div class="bline"><span class="nm">Giờ đóng cửa</span><span class="dt">23:00 hằng ngày</span></div>
      <div class="bline"><span class="nm">Thiết bị cấm</span><span class="dt">Bếp điện, bếp gas, ấm siêu tốc công suất lớn</span></div>
      <div class="bline"><span class="nm">Khách đến chơi</span><span class="dt">Đăng ký tại lễ tân, rời khu trước 21:30</span></div>
      <div class="bline"><span class="nm">Trực nhật</span><span class="dt">Theo lịch dán tại cửa phòng</span></div>
    </div>
  </div>`;
};

PAGES["sv-bill"] = () => {
  if (!ME) return "";
  const me = stuOf(ME);
  if (!me.room)
    return `<div class="card"><div class="empty"><b>Chưa có phòng</b>Bạn chưa được xếp phòng nên chưa có hóa đơn.</div></div>`;
  const list = DB.invoices.filter((i) => i.room === me.room);
  const last = list[list.length - 1];
  return `
  <div class="grid g3 section">
    <div class="stat accent"><div class="lbl">Tiền phòng tháng gần nhất</div><div class="val">${last ? money(total(last)) : "0đ"}</div><div class="foot">Phòng ${me.room} · ${list.length} hóa đơn</div></div>
    <div class="stat"><div class="lbl">Đã thanh toán năm nay</div><div class="val">${money(list.filter((i) => i.paid).reduce((s, i) => s + total(i), 0))}</div><div class="foot">${list.filter((i) => i.paid).length} hóa đơn</div></div>
    <div class="stat"><div class="lbl">Thành tiền / người (tháng gần nhất)</div><div class="val">${last ? money(Math.round(total(last) / occ(me.room))) : "0đ"}</div><div class="foot">Chia đều cho ${occ(me.room)} người trong phòng</div></div>
  </div>
  ${list
    .slice()
    .reverse()
    .map(
      (i) => `
  <div class="card section">
    <div class="bill" style="border:0">
      <div class="bill-top">
        <div><div class="muted">Tháng ${i.month} · ${i.id}</div><div class="amt">${money(total(i))}</div></div>
        ${i.paid ? `<span class="tag ok"><span class="dotm"></span>Đã thanh toán</span><span class="muted right">${i.paidAt ? String(i.paidAt).slice(0, 10) : ""} qua ${i.method || ""}</span>` : `<span class="tag bad"><span class="dotm"></span>Chưa thanh toán</span><span class="muted right">Hạn ${i.due ? String(i.due).slice(0, 10) : ""}</span>`}
      </div>
      <div class="bill-lines">${billLines(i)}</div>
      ${
        i.paid
          ? ""
          : `<div class="paybar">
        <button class="btn k" onclick="payModal('${i.id}')">Thanh toán ${money(total(i))}</button>
        <span class="muted">Thành tiền / người: ${money(Math.round(total(i) / occ(i.room)))}</span></div>`
      }
    </div>
  </div>`,
    )
    .join("")}`;
};

PAGES["sv-vp"] = () => {
  if (!ME) return "";
  const vps = DB.violations.filter((v) => v.sv === ME);
  if (!vps.length)
    return `<div class="card"><div class="empty"><b>Bạn chưa có vi phạm nào</b>Cứ giữ như vậy nhé.</div></div>`;
  return `
  <div class="card section">
    <div class="card-h"><h3>Biên bản đã lập với bạn</h3><span class="note right">Mỗi biên bản trừ điểm rèn luyện nội trú</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Ngày</th><th>Nội dung vi phạm</th><th>Mức độ</th><th>Người lập</th><th>Trạng thái</th></tr></thead>
      <tbody>${vps
        .map(
          (v) => `<tr>
        <td>${v.date ? String(v.date).slice(0, 10) : ""}</td>
        <td><b style="font-weight:600">${v.type}</b><div class="muted">${v.note || ""}</div></td>
        <td>${lvTag(v.level)}</td><td class="muted">${v.by || ""}</td>
        <td><span class="tag ${v.status === "Đang xử lý" ? "wait" : "mute"}">${v.status}</span></td></tr>`,
        )
        .join("")}</tbody>
    </table></div>
  </div>
  <div class="card"><div class="card-b">
    <h3 style="margin-bottom:6px">Bạn thấy biên bản chưa đúng?</h3>
    <p class="muted" style="margin:0 0 12px">Gửi phản hồi trong vòng 7 ngày kể từ ngày lập biên bản.</p>
    ${
      vps[0].reply
        ? `<div style="background:#f8fafc; padding:12px; border-radius:8px; border-left:3px solid var(--ink);"><b style="display:block; margin-bottom:4px;">Phản hồi của bạn:</b>${vps[0].reply}</div>`
        : `<textarea id="vpReply" rows="2" placeholder="Nhập lý do hoặc ý kiến của bạn..." style="margin-bottom:10px"></textarea>
         <button class="btn p" onclick="sendReply('${vps[0].id}')">Gửi phản hồi</button>`
    }
  </div></div>`;
};

async function sendReply(id) {
  const text = $("#vpReply").value.trim();
  if (!text) return toast("Vui lòng nhập nội dung phản hồi");
  try {
    await Api.violationReply(id, text);
    await loadAllData();
    render();
    toast("Đã gửi phản hồi tới ban quản lý");
  } catch (e) {
    toast(e.message);
  }
}
