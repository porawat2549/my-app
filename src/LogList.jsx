import { useState } from "react";
import { baht, dayLabel, fmtFull, fmtTime, uaLabel } from "./ui.jsx";

const MONEY = ["topup", "admin_adjust"];
export function meta(r) {
  switch (r.kind) {
    case "topup": return { icon: "💰", tone: "ok", title: "เติมเงินด้วยสลิป" };
    case "admin_adjust": return { icon: "⚖️", tone: "ac", title: r.amount >= 0 ? "แอดมินเพิ่มยอด" : "แอดมินหักยอด" };
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
  money: MONEY,
  session: ["login", "logout", "session_timeout"],
  fail: ["login_failed"],
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
              <Row k={r.kind === "topup" ? "รหัสอ้างอิงสลิป" : "หมายเหตุ"} v={r.kind === "role_change" ? "" : r.note} />
              <Row k="IP" v={r.ip} />
              <Row k="อุปกรณ์" v={uaLabel(r.ua)} />
            </dl>
          )}
        </div>
      );
    })}</div>
  );
}
