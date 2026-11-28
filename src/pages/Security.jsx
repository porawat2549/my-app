import { useState } from "react";
import useAuth from "../useAuth.js";
import { twofaSetup, twofaEnable, twofaDisable } from "../api.js";
import { Navbar, BottomNav, Skeleton } from "../ui.jsx";
import { ask, ok, fail, copy } from "../alert.js";
import IdleGuard from "../IdleGuard.jsx";

// ตั้งค่า 2FA (TOTP) ใช้ได้ทั้ง user และ admin
export default function Security() {
  const user = useAuth();
  const [on, setOn] = useState(null);       // null = ใช้ค่าจาก user
  const [setup, setSetup] = useState(null); // { secret, otpauth, qr }
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <Skeleton />;
  const enabled = on ?? user.totp_enabled;

  async function start() {
    setBusy(true);
    try {
      const s = await twofaSetup();
      let qr = "";
      try { const QR = (await import("qrcode")).default; qr = await QR.toDataURL(s.otpauth, { margin: 1, width: 420 }); } catch {}
      setSetup({ ...s, qr }); setCode("");
    } catch (e) { fail("เริ่มตั้งค่าไม่สำเร็จ", e.message); }
    setBusy(false);
  }
  async function enable(e) {
    e.preventDefault(); setBusy(true);
    try {
      await twofaEnable(code);
      setOn(true); setSetup(null); setCode("");
      sessionStorage.removeItem("2fa_later");
      ok("เปิดใช้งาน 2FA แล้ว", "ครั้งต่อไปที่เข้าสู่ระบบ ต้องกรอกรหัส 6 หลักจากแอปด้วย");
    } catch (x) { fail("ยืนยันไม่สำเร็จ", x.message); }
    setBusy(false);
  }
  async function disable(e) {
    e.preventDefault();
    if (!(await ask("ปิด 2FA?", "บัญชีจะปลอดภัยน้อยลง", "ปิด 2FA", true))) return;
    setBusy(true);
    try { await twofaDisable(pw, code); setOn(false); setPw(""); setCode(""); ok("ปิด 2FA แล้ว"); }
    catch (x) { fail("ปิดไม่สำเร็จ", x.message); }
    setBusy(false);
  }
  const codeInput = (
    <input className="codebox" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" required
      value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
  );
  return (
    <>
      <Navbar user={user} />
      <div className="page">
        <h1 className="title">ความปลอดภัย</h1>
        <div className="card">
          <div className="row">
            <div className={"shield " + (enabled ? "" : "off")}>{enabled ? "🔐" : "🔓"}</div>
            <div className="grow">
              <div className="bold">การยืนยันตัวตนสองชั้น (2FA)</div>
              <div className="mu sm">{enabled ? "เปิดใช้งานอยู่ — เข้าสู่ระบบต้องใช้รหัสจากแอป" : "ยังไม่เปิดใช้งาน — แนะนำให้เปิดเพื่อกันคนแอบเข้าบัญชี"}</div>
            </div>
            <span className={"badge " + (enabled ? "ok" : "er")}>{enabled ? "เปิด" : "ปิด"}</span>
          </div>
        </div>

        {!enabled && !setup && (
          <div className="card">
            <h2>ตั้งค่า 2FA</h2>
            <p className="hint">ใช้แอป Google Authenticator, Microsoft Authenticator หรือ Authy สแกน QR แล้วกรอกรหัส 6 หลักเพื่อยืนยัน</p>
            <button className="btn block" disabled={busy} onClick={start}>{busy ? "กำลังสร้าง…" : "เริ่มตั้งค่า"}</button>
          </div>
        )}

        {!enabled && setup && (
          <form className="card" onSubmit={enable}>
            <h2>1) สแกน QR ด้วยแอป</h2>
            {setup.qr ? <img className="qr" src={setup.qr} alt="QR สำหรับ 2FA" /> : <p className="hint">สร้าง QR ไม่ได้ ใช้กุญแจด้านล่างแทน</p>}
            <p className="hint">สแกนไม่ได้? เลือก "ป้อนรหัสเอง" ในแอป แล้วกรอกกุญแจนี้ (ชนิด: ตามเวลา)</p>
            <div className="keybox" onClick={() => copy(setup.secret)} style={{ cursor: "pointer" }}>{setup.secret}</div>
            <p className="hint" style={{ textAlign: "center" }}>แตะเพื่อคัดลอก · เก็บกุญแจนี้ไว้ที่ปลอดภัย เผื่อเปลี่ยนเครื่อง</p>
            <h2 style={{ marginTop: 18 }}>2) กรอกรหัส 6 หลัก</h2>
            {codeInput}
            <button className="btn block" disabled={busy || code.length !== 6}>{busy ? "กำลังตรวจสอบ…" : "ยืนยันและเปิดใช้งาน"}</button>
            <button type="button" className="btn ghost block" style={{ marginTop: 10 }} onClick={() => setSetup(null)}>ยกเลิก</button>
          </form>
        )}

        {enabled && (
          <form className="card" onSubmit={disable}>
            <h2>ปิดการใช้งาน 2FA</h2>
            <p className="hint">ต้องใส่รหัสผ่านและรหัส 6 หลักปัจจุบันเพื่อยืนยัน</p>
            <label>รหัสผ่าน</label>
            <input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
            <label>รหัส 2FA</label>
            {codeInput}
            <button className="btn danger block" disabled={busy || code.length !== 6 || !pw}>ปิด 2FA</button>
          </form>
        )}
      </div>
      <BottomNav role={user.role} />
      <IdleGuard seconds={user.idle_secs || 900} />
    </>
  );
}
