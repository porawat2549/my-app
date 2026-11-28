import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout } from "./api.js";
import { toast, base } from "./alert.js";

export const PRIZE_CAT = { card: "บัตรเติมเงิน", game_id: "ไอดีเกม", other: "อื่นๆ", none: "ไม่ได้รางวัล", product: "สินค้าจากร้าน" };
export const baht = (n) => Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// เดิมเป็น toast ในหน้า ตอนนี้ใช้ SweetAlert2 (คืนค่า [show, null] เพื่อให้โค้ดเดิมใช้ต่อได้)
export function useToast() {
  return [(msg, type = "ok") => toast(msg, type === "er" ? "error" : "success"), null];
}

export function Skeleton() {
  return (
    <div className="page">
      <div className="card sk" style={{ height: 150, marginTop: 70 }} />
      <div className="card sk" style={{ height: 220 }} />
    </div>
  );
}

const today = () => new Date().toLocaleDateString("sv-SE"); // yyyy-mm-dd ตามเวลาท้องถิ่น
const safe = (fn, d) => { try { return fn(); } catch { return d; } };

// แจ้งเตือนให้เปิด 2FA (ทั้ง user และ admin) กด "ไม่ต้องแสดงวันนี้" ได้
// ไม่รบกวนซ้ำ: ถ้ากดปิดวันนี้จะไม่ขึ้นอีกจนกว่าจะข้ามวัน / กด "ไว้ทีหลัง" = ไม่ขึ้นอีกในแท็บนี้
function useTwoFaReminder(user) {
  const nav = useNavigate();
  useEffect(() => {
    if (!user || user.totp_enabled !== false) return; // mock mode ไม่มีค่านี้ จึงไม่แจ้งเตือน
    if (safe(() => localStorage.getItem("2fa_hide") === today(), false)) return;
    if (safe(() => sessionStorage.getItem("2fa_later") === "1", false)) return;
    const t = setTimeout(async () => {
      const r = await base.fire({
        icon: "warning", title: "เพิ่มความปลอดภัยด้วย 2FA",
        html: "บัญชีของคุณยังไม่ได้เปิดการยืนยันตัวตนสองชั้น (2FA)<br/>ใช้แอป Google Authenticator / Authy สแกนครั้งเดียว ใช้เวลาไม่ถึง 1 นาที",
        showCancelButton: true, showDenyButton: true, reverseButtons: true,
        confirmButtonText: "ตั้งค่าเลย", cancelButtonText: "ไว้ทีหลัง", denyButtonText: "ไม่ต้องแสดงวันนี้",
      });
      if (r.isConfirmed) nav("/security");
      else if (r.isDenied) safe(() => localStorage.setItem("2fa_hide", today()));
      else safe(() => sessionStorage.setItem("2fa_later", "1"));
    }, 1400);
    return () => clearTimeout(t);
  }, [user && user.id, user && user.totp_enabled]);
}

export function Navbar({ user, balance }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { pathname } = useLocation();
  useTwoFaReminder(user);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, []);
  const links = [["/", "🛍️ ร้านค้า"], ["/wheel", "🎡 วงล้อ"]];
  if (user) links.push(["/dashboard", "👛 บัญชีของฉัน"]);
  if (user && user.role === "admin") links.push(["/admin", "⚙️ จัดการ"]);
  const out = async () => { await logout(); location.assign("/"); };
  return (
    <div className="top"><div className="in">
      <Link className="brand" to="/"><i>🛒</i><span>PorawatShopTH</span></Link>
      <nav className="nav">
        {links.map(([to, t]) => <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "on" : "")}>{t}</NavLink>)}
      </nav>
      <div className="sp" />
      {user ? (<>
        <Link className="bal" to="/dashboard" title="ยอดเงินคงเหลือ">฿{baht(balance ?? user.balance)}</Link>
        <div className="menu" ref={box}>
          <button onClick={() => setOpen(!open)} aria-label="เมนูบัญชี">
            <span className="pic">{user.email[0].toUpperCase()}</span>
            {user.role === "admin" && <span className="badge admin">admin</span>}
          </button>
          {open && (
            <div className="dd">
              <div className="who">{user.email}</div>
              <Link to="/dashboard">👛 บัญชีของฉัน</Link>
              <Link to="/security">🔐 ความปลอดภัย / 2FA {user.totp_enabled === false && <span className="dotwarn" />}</Link>
              {user.role === "admin" && <Link to="/admin">⚙️ จัดการระบบ</Link>}
              <hr />
              <button onClick={out}>🚪 ออกจากระบบ</button>
            </div>
          )}
        </div>
      </>) : (<>
        <Link className="btn ghost sm" style={{ display: "inline-grid", placeItems: "center" }} to={"/login?next=" + encodeURIComponent(pathname)}>เข้าสู่ระบบ</Link>
        <Link className="btn sm" style={{ display: "inline-grid", placeItems: "center" }} to="/register">สมัคร</Link>
      </>)}
    </div></div>
  );
}
// ชื่อเดิม (ให้โค้ดเก่าที่ import Topbar ยังใช้ได้)
export const Topbar = Navbar;

export function BottomNav({ role, guest }) {
  const { pathname } = useLocation();
  const items = [["/", "🛍️", "ร้านค้า"], ["/wheel", "🎡", "วงล้อ"]];
  if (guest) items.push(["/login", "🔑", "เข้าสู่ระบบ"]);
  else items.push(["/dashboard", "👛", "บัญชี"]);
  if (role === "admin") items.push(["/admin", "⚙️", "จัดการ"]);
  return (
    <div className="bnav"><div className="in">
      {items.map(([to, ic, t]) => (
        <Link key={to} to={to} className={pathname === to ? "on" : ""}><b>{ic}</b>{t}</Link>
      ))}
    </div></div>
  );
}
