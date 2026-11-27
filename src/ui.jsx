import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "./api.js";

export const baht = (n) =>
  Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtFull = (t) => new Date(t * 1000).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "medium" });
export const fmtTime = (t) => new Date(t * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export function dayLabel(t) {
  const d = new Date(t * 1000), n = new Date(), y = new Date();
  y.setDate(n.getDate() - 1);
  if (d.toDateString() === n.toDateString()) return "วันนี้";
  if (d.toDateString() === y.toDateString()) return "เมื่อวาน";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}
export function ago(t) {
  if (!t) return "ยังไม่เคย";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - t));
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return Math.floor(s / 60) + " นาทีที่แล้ว";
  if (s < 86400) return Math.floor(s / 3600) + " ชม.ที่แล้ว";
  return Math.floor(s / 86400) + " วันที่แล้ว";
}
export function uaLabel(ua) {
  if (!ua) return "-";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows"
    : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "อุปกรณ์อื่น";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "เบราว์เซอร์";
  return `${os} · ${br}`;
}

export function useToast() {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = (msg, type = "ok") => {
    setT({ msg, type }); clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 3200);
  };
  return [show, t && <div className={"toast " + (t.type === "er" ? "er" : "")}>{t.msg}</div>];
}

export function Skeleton() {
  return (
    <div className="page">
      <div className="card sk" style={{ height: 150, marginTop: 70 }} />
      <div className="card sk" style={{ height: 220 }} />
    </div>
  );
}

export function Topbar({ user }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="top"><div className="in">
      <Link className="brand" to="/dashboard">💳 My App</Link>
      {user.role === "admin" && (
        <div className="nav">
          <Link to="/dashboard" className={pathname === "/dashboard" ? "on" : ""}>หน้าหลัก</Link>
          <Link to="/admin" className={pathname === "/admin" ? "on" : ""}>จัดการ</Link>
        </div>
      )}
      <button className="btn ghost sm" onClick={async () => { await logout(); nav("/login"); }}>ออก</button>
    </div></div>
  );
}
