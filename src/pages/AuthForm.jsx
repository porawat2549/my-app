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
  const sc = strength(pw);

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (isReg && pw.length < 6) return setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (isReg && pw !== pw2) return setErr("รหัสผ่านไม่ตรงกัน");
    setBusy(true);
    try { await (isReg ? register : login)(email.trim(), pw); nav("/dashboard"); }
    catch (x) { setErr(x.message); setBusy(false); }
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
        {err && <div className="err">{err}</div>}
        <button className="btn block" disabled={busy}>{busy ? "กำลังดำเนินการ..." : isReg ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button>
      </form>
      <p className="mu sm" style={{ textAlign: "center" }}>
        {isReg ? <>มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link></> : <>ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link></>}
      </p>
    </div>
  );
}
