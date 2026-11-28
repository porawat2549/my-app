import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login, register } from "../api.js";

const strength = (p) =>
  (p.length >= 6) + (p.length >= 10) + /[0-9]/.test(p) + /[A-Z\W]/.test(p);

export default function AuthForm({ mode }) {
  const isReg = mode === "register";
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [need2fa, setNeed2fa] = useState(false); // รหัสผ่านถูกแล้ว รอกรอกรหัส 2FA
  const [code, setCode] = useState("");
  const sc = strength(pw);
  // เด้งกลับหน้าที่ตั้งใจไว้หลังล็อกอิน (รับเฉพาะ path ภายในเว็บ กัน open redirect)
  const next = (() => { const n = sp.get("next"); return n && /^\/(?!\/)/.test(n) ? n : "/"; })();

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (isReg && pw.length < 6) return setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (isReg && pw !== pw2) return setErr("รหัสผ่านไม่ตรงกัน");
    setBusy(true);
    try {
      if (isReg) { await register(email.trim(), pw); nav(next); return; }
      const r = await login(email.trim(), pw, need2fa ? code : undefined);
      if (r && r.need_2fa) { setNeed2fa(true); setBusy(false); return; }
      nav(next);
    } catch (x) { setErr(x.message); setBusy(false); if (need2fa) setCode(""); }
  }
  return (
    <div className="auth">
      <div className="logo">🛒</div>
      <h1>PorawatShopTH</h1>
      <p className="sub">{isReg ? "สร้างบัญชีเพื่อเริ่มใช้งาน" : "เข้าสู่ระบบเพื่อดูยอดเงินและหมุนวงล้อ"}</p>
      {!isReg && sp.get("timeout") && (
        <div className="banner">⏱️ หมดเวลาใช้งานหรือเซสชันสิ้นสุดแล้ว กรุณาเข้าสู่ระบบอีกครั้ง</div>
      )}
      <form className="card" onSubmit={submit}>
        {need2fa ? (<>
          <div className="bold" style={{ textAlign: "center", fontSize: 18 }}>🔐 ยืนยันตัวตน 2 ชั้น</div>
          <p className="hint" style={{ textAlign: "center" }}>เปิดแอป Authenticator แล้วกรอกรหัส 6 หลักของ<br /><b>{email}</b></p>
          <input className="codebox" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        </>) : (<>
        <label style={{ marginTop: 0 }}>อีเมล</label>
        <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>รหัสผ่าน</label>
        <div className="pw">
          <input type={show ? "text" : "password"} autoComplete={isReg ? "new-password" : "current-password"} required
            value={pw} onChange={(e) => setPw(e.target.value)} style={{ paddingRight: 70 }} />
          <button type="button" onClick={() => setShow(!show)}>{show ? "ซ่อน" : "แสดง"}</button>
        </div>
        {isReg && pw && (
          <div className="meter"><i style={{ width: sc * 25 + "%", background: ["", "#f87171", "#fbbf24", "#34d399", "#34d399"][sc] }} /></div>
        )}
        {isReg && (<>
          <label>ยืนยันรหัสผ่าน</label>
          <input type={show ? "text" : "password"} autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </>)}
        </>)}
        {err && <div className="err">{err}</div>}
        <button className="btn block" disabled={busy || (need2fa && code.length !== 6)}>{busy ? "กำลังดำเนินการ..." : isReg ? "สมัครสมาชิก" : need2fa ? "ยืนยัน" : "เข้าสู่ระบบ"}</button>
        {need2fa && <button type="button" className="btn ghost block" style={{ marginTop: 10 }} onClick={() => { setNeed2fa(false); setCode(""); setErr(""); }}>ย้อนกลับ</button>}
      </form>
      <p className="mu sm" style={{ textAlign: "center" }}><Link to="/">‹ กลับไปร้านค้า</Link><br />
        {isReg ? <>มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link></> : <>ยังไม่มีบัญชี? <Link to={"/register"}>สมัครสมาชิก</Link></>}
      </p>
    </div>
  );
}
