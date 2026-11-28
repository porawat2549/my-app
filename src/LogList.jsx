import { useState } from "react";
import { baht, dayLabel, fmtFull, fmtTime, uaLabel } from "./ui.jsx";

const MONEY = ["topup", "admin_adjust", "spin", "purchase"];
export function meta(r) {
  switch (r.kind) {
    case "topup": return { icon: "💰", tone: "ok", title: "เติมเงินด้วยสลิป" };
    case "topup_rejected": return { icon: "🚫", tone: "er", title: "เติมเงินไม่ผ่าน: " + r.note };
    case "admin_adjust": return { icon: "⚖️", tone: "ac", title: r.amount >= 0 ? "แอดมินเพิ่มยอด" : "แอดมินหักยอด" };
    case "spin": return { icon: "🎡", tone: "ac", title: "หมุนวงล้อ → " + r.note };
    case "purchase": return { icon: "🛍️", tone: "ac", title: "ซื้อสินค้า → " + r.note };
    case "product_add": return { icon: "🆕", tone: "ok", title: "เพิ่มสินค้า: " + r.note };
    case "product_edit": return { icon: "✏️", tone: "wn", title: "แก้ไขสินค้า: " + r.note };
    case "product_stock": return { icon: "📦", tone: "ok", title: "เพิ่มสต็อกสินค้า: " + r.note };
    case "product_delete": return { icon: "🗑️", tone: "er", title: "ลบสินค้า: " + r.note };
    case "prize_odds": return { icon: "📊", tone: "wn", title: "ปรับเปอร์เซ็นต์วงล้อ: " + r.note };
    case "prize_image": return { icon: "🖼️", tone: "wn", title: "รูปรางวัล: " + r.note };
    case "2fa_enable": return { icon: "🔐", tone: "ok", title: "เปิดใช้งาน 2FA" };
    case "2fa_disable": return { icon: "🔓", tone: "er", title: "ปิด 2FA" };
    case "prize_add": return { icon: "🎁", tone: "ok", title: "เพิ่มรางวัล: " + r.note };
    case "prize_stock": return { icon: "📦", tone: "ok", title: "เพิ่มสต็อก: " + r.note };
    case "prize_weight": return { icon: "🎚️", tone: "wn", title: "ปรับน้ำหนัก: " + r.note };
    case "prize_delete": return { icon: "🗑️", tone: "er", title: "ลบรางวัล: " + r.note };
    case "price_change": return { icon: "🏷️", tone: "wn", title: "ปรับราคาหมุน " + r.note };
    case "role_change": return { icon: "🛡️", tone: "wn", title: `เปลี่ยนสิทธิ์เป็น ${r.note}` };
    case "register": return { icon: "🆕", tone: "ac", title: "สมัครสมาชิก" };
    case "login": return { icon: "🔓", tone: "ok", title: "เข้าสู่ระบบ" };
    case "logout": return { icon: "🚪", tone: "", title: "ออกจากระบบ" };
    case "login_failed": return { icon: "⚠️", tone: "er", title: "เข้าสู่ระบบไม่สำเร็จ" };
    case "session_timeout": return { icon: "⏱️", tone: "wn", title: "หมดเวลาใช้งาน" };
    default: return { icon: "•", tone: "", title: r.kind };
  }
}
export const CATS = {
  all: null,
  money: ["topup", "admin_adjust", "purchase"],
  wheel: ["spin", "prize_add", "prize_stock", "prize_weight", "prize_delete", "price_change", "prize_odds", "prize_image"],
  shop: ["purchase", "product_add", "product_edit", "product_stock", "product_delete"],
  session: ["login", "logout", "session_timeout", "2fa_enable", "2fa_disable"],
  fail: ["login_failed", "topup_rejected"],
  admin: ["role_change", "register"],
};

function Row({ k, v }) { return v ? <div><dt>{k}</dt><dd>{v}</dd></div> : null; }

export default function LogList({ rows, admin }) {
  const [open, setOpen] = useState(null);
  if (rows == null) return <div className="card sk" style={{ height: 120 }} />;
  if (!rows.length) return <div className="empty">ยังไม่มีรายการ</div>;
  let lastDay = "";
  return (
    <div>{rows.map((r, i) => {
      const day = dayLabel(r.created_at), head = day !== lastDay; lastDay = day;
      const m = meta(r), key = `${r.kind}-${r.created_at}-${i}`, money = MONEY.includes(r.kind);
      return (
        <div key={key}>
          {head && <div className="day">{day}</div>}
          <div className="li" onClick={() => setOpen(open === key ? null : key)}>
            <div className={"ic " + m.tone}>{m.icon}</div>
            <div className="grow">
              <div className="t bold">{m.title}</div>
              <div className="t mu sm">{admin ? r.user_email + " · " : ""}{fmtTime(r.created_at)}{r.ip ? " · " + r.ip : ""}</div>
            </div>
            {money && <div className={"am " + (r.amount >= 0 ? "pos" : "neg")}>{r.amount >= 0 ? "+" : ""}{baht(r.amount)}</div>}
          </div>
          {open === key && (
            <dl className="dt">
              <Row k="เวลา" v={fmtFull(r.created_at)} />
              {admin && <Row k="ผู้ใช้" v={r.user_email} />}
              {r.actor_email !== r.user_email && <Row k="ทำรายการโดย" v={r.actor_email} />}
              {r.balance_after != null && <Row k="ยอดคงเหลือหลังรายการ" v={"฿" + baht(r.balance_after)} />}
              <Row k={r.kind === "topup" ? "รหัสอ้างอิงสลิป" : "รายละเอียด"} v={r.note} />
              <Row k="IP" v={r.ip} />
              <Row k="อุปกรณ์" v={uaLabel(r.ua)} />
            </dl>
          )}
        </div>
      );
    })}</div>
  );
}
