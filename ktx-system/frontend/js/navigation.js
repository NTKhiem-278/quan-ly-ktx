const MENUS = {
  sv: [
    { cap: "Của tôi" },
    { k: "sv-home", ic: "▤", t: "Tổng quan" },
    { k: "sv-room", ic: "▢", t: "Phòng của tôi" },
    { k: "sv-bill", ic: "₫", t: "Hóa đơn & thanh toán" },
    { k: "sv-vp",   ic: "!", t: "Thông báo vi phạm", n: () => DB.violations.filter(v => v.sv === ME).length },
  ],
  lt: [
    { cap: "Vận hành hằng ngày" },
    { k: "lt-home",  ic: "▤", t: "Tổng quan ca trực" },
    { k: "lt-rooms", ic: "▦", t: "Sơ đồ phòng" },
    { k: "lt-stu",   ic: "☰", t: "Sinh viên nội trú" },
    { k: "lt-money", ic: "₫", t: "Tiền phòng & chỉ số" },
    { k: "lt-vp",    ic: "!", t: "Ghi nhận vi phạm" },
    { k: "lt-acc",   ic: "⚿", t: "Tài khoản sinh viên" },
  ],
};

const TITLES = {
  "sv-home": ["Xin chào", "Thông tin nội trú của bạn"],
  "sv-room": ["Phòng của tôi", "Thông tin phòng ở và bạn cùng phòng"],
  "sv-bill": ["Hóa đơn & thanh toán", "Tiền phòng, tiền điện, tiền nước theo từng tháng"],
  "sv-vp":   ["Thông báo vi phạm", "Các lỗi đã bị ghi nhận và hướng xử lý"],
  "lt-home": ["Tổng quan ca trực", "Quản lý phòng và sinh viên"],
  "lt-rooms":["Sơ đồ phòng", "Số chỗ còn trống của từng phòng"],
  "lt-stu":  ["Sinh viên nội trú", "Danh sách sinh viên đang ở và phòng tương ứng"],
  "lt-money":["Tiền phòng & chỉ số", "Tính tiền theo phòng và theo dõi trạng thái thu"],
  "lt-vp":   ["Ghi nhận vi phạm", "Lập biên bản lỗi vi phạm nội quy KTX"],
  "lt-acc":  ["Tài khoản sinh viên", "Cấp, sửa, khóa, xóa tài khoản sinh viên"],
};

function drawNav() {
  const nav = $("#nav"); nav.innerHTML = "";
  MENUS[role].forEach((m) => {
    if (m.cap) {
      const d = document.createElement("div"); d.className = "cap"; d.textContent = m.cap; nav.appendChild(d); return;
    }
    const b = document.createElement("button");
    b.className = m.k === page ? "on" : "";
    b.innerHTML = `<span class="ic">${m.ic}</span><span>${m.t}</span>` + (m.n && m.n() ? `<span class="badge-n">${m.n()}</span>` : "");
    b.onclick = () => { page = m.k; $("#side").classList.remove("open"); render(); };
    nav.appendChild(b);
  });
}

function applyRole(r, silent) {
  role = r; page = MENUS[r].find((m) => m.k).k;
  const box = $("#roleSwitch");
  box.innerHTML = "";
  const labels = { sv: "Sinh viên", lt: "Lễ tân" };
  ["sv", "lt"].forEach(k => {
    const b = document.createElement("button");
    b.dataset.role = k; b.textContent = labels[k];
    const allowed = ROLE_CODE[CURRENT.role] === k;
    b.disabled = !allowed;
    b.title = allowed ? "" : "Bạn không có quyền truy cập vai trò này";
    b.className = k === r ? "on" : "";
    b.onclick = () => allowed && applyRole(k);
    box.appendChild(b);
  });

  const displayName = CURRENT.name;
  const displayRole = CURRENT.role + (CURRENT.svId ? " · " + CURRENT.svId : "");
  $("#whoName").textContent = displayName;
  $("#whoRole").textContent = displayRole;
  $("#whoAvt").textContent = initials(displayName);

  render();
  if (!silent) toast("Đã chuyển sang vai trò: " + (r === "sv" ? "Sinh viên" : "Lễ tân"));
}

function render() {
  drawNav();
  let t = TITLES[page] || ["", ""];
  if (page === "sv-home" || page === "lt-home") t = [`Xin chào, ${CURRENT.name.split(" ").pop()}`, t[1]];
  $("#pgTitle").textContent = t[0];
  $("#pgSub").textContent = t[1];
  $("#view").innerHTML = PAGES[page] ? PAGES[page]() : "";
  window.scrollTo(0, 0);
}