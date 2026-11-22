function keytags(rooms, onclick) {
  return (
    `<div class="keyboard">` +
    rooms.map((r) => {
        const st = roomState(r), n = occ(r.id);
        const beds = Array.from({ length: r.cap }, (_, i) => `<span class="bed ${i < n ? "on" : ""}"></span>`).join("");
        return `<button class="keytag ${st.k}" onclick="${onclick}('${r.id}')">
      <div class="rno">${r.id}</div>
      <div class="rmeta">${r.type}</div>
      <div class="beds">${beds}</div>
      <div class="stt">${st.t} · ${n}/${r.cap}</div>
    </button>`;
      }).join("") + `</div>`
  );
}
const LEGEND = `<div class="legend">
  <span><i style="background:var(--key)"></i>Còn chỗ</span>
  <span><i style="background:var(--bad)"></i>Đã đầy</span>
  <span><i style="background:var(--ink-soft)"></i>Phòng trống</span>
  <span><i style="background:#8a93a3"></i>Đang sửa chữa</span>
  <span><i style="background:var(--ink);border-radius:2px"></i>Ô đặc = giường đã có người</span>
</div>`;

function billLines(i) {
  return `<div class="bline"><span class="nm">Tiền phòng</span><span class="dt">${(roomOf(i.room) || {}).type || ""} · ${money(i.room_fee)}/người/tháng</span><span class="vl">${money(i.room_fee)}</span></div>
<div class="bline"><span class="nm">Tiền điện</span><span class="dt">${i.elec.old} → ${i.elec.new} kWh · ${money(i.elec.rate)}/kWh · chia đều ${occ(i.room)} người</span><span class="vl">${money(elecAmt(i))}</span></div>
  <div class="bline"><span class="nm">Tiền nước</span><span class="dt">${i.water.old} → ${i.water.new} m³ · ${money(i.water.rate)}/m³ · chia đều ${occ(i.room)} người</span><span class="vl">${money(waterAmt(i))}</span></div>`;
}
function lvTag(l) {
  const c = l === "Kỷ luật" ? "bad" : l === "Cảnh cáo" ? "wait" : "mute";
  return `<span class="tag ${c}"><span class="dotm"></span>${l}</span>`;
}

const PAGES = {};