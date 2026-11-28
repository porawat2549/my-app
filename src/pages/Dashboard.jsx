import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../useAuth.js";
import { topup, inventory } from "../api.js";
import { Topbar, BottomNav, Skeleton, baht, dayLabel, PRIZE_CAT } from "../ui.jsx";
import { ok, fail, copy } from "../alert.js";
import IdleGuard from "../IdleGuard.jsx";

const CHIPS = [50, 100, 300, 500, 1000];

export default function Dashboard() {
  const user = useAuth();
  const [bal, setBal] = useState(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [inv, setInv] = useState(null);
  const [shown, setShown] = useState(null);

  useEffect(() => { if (user) inventory().then(setInv).catch(() => setInv([])); }, [user]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!user) return <Skeleton />;

  async function submit(e) {
    e.preventDefault(); setErr("");
    const n = parseFloat(amount);
    if (!n || n <= 0) return setErr("กรุณาระบุจำนวนเงิน");
    if (!file) return setErr("กรุณาเลือกรูปสลิป");
    setBusy(true);
    try {
      const r = await topup(n, file);
      setBal(r.balance); setAmount(""); setFile(null); setOpen(false);
      ok("เติมเงินสำเร็จ", `เพิ่ม ฿${baht(n)} · คงเหลือ ฿${baht(r.balance)}`);
    } catch (x) { setErr(x.message); fail("เติมเงินไม่สำเร็จ", x.message); }
    setBusy(false);
  }
  return (
    <>
      <Topbar user={user} />
      <div className="page">
        <div className="card hero">
          <div className="lbl">ยอดเงินคงเหลือ</div>
          <div className="amt">฿{baht(bal ?? user.balance)}</div>
          <button className="btn light block" style={{ marginTop: 0 }} onClick={() => { setOpen(!open); setErr(""); }}>
            {open ? "ปิด" : "＋ เติมเงิน"}
          </button>
        </div>

        {open && (
          <form className="card" onSubmit={submit}>
            <h2>เติมเงินด้วยสลิป</h2>
            <p className="hint">โอนเงินเข้าบัญชีร้านก่อน แล้วกรอกจำนวนที่โอนและแนบสลิป ระบบตรวจยอดและบัญชีผู้รับอัตโนมัติ</p>
            <label>จำนวนเงิน (บาท)</label>
            <input type="number" inputMode="decimal" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="chips" style={{ marginTop: 10 }}>
              {CHIPS.map((c) => <button type="button" key={c} className={"chip " + (+amount === c ? "on" : "")} onClick={() => setAmount(String(c))}>{c}</button>)}
            </div>
            <label>รูปสลิป</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
            {preview && <img className="preview" src={preview} alt="สลิป" />}
            {err && <div className="err">{err}</div>}
            <button className="btn block" disabled={busy}>{busy ? "กำลังตรวจสลิป… (5-10 วินาที)" : "ยืนยันเติมเงิน"}</button>
          </form>
        )}

        <Link to="/wheel" className="card cta">
          <div className="ic ac">🎡</div>
          <div className="grow"><div className="bold">วงล้อสุ่มไอเทม</div><div className="mu sm">บัตรเติมเงิน ไอดีเกม และของรางวัลอื่นๆ</div></div>
          <span className="mu">›</span>
        </Link>

        <div className="card">
          <h2>ของที่ได้รับ</h2>
          {inv == null && <div className="sk" style={{ height: 60, borderRadius: 12, marginTop: 10 }} />}
          {inv && !inv.length && <p className="mu">ยังไม่มีของ ลองหมุนวงล้อดูสิ</p>}
          {inv && inv.map((it) => (
            <div className="inv" key={it.id}>
              <div className="ic ac">{it.emoji}</div>
              <div className="grow">
                <div className="t bold">{it.name}</div>
                <div className="mu sm">{PRIZE_CAT[it.category]} · {dayLabel(it.claimed_at)}</div>
                <code className="secret">{shown === it.id ? it.secret : "••••••••••"}</code>
              </div>
              <div className="col">
                <button className="btn ghost sm" onClick={() => setShown(shown === it.id ? null : it.id)}>{shown === it.id ? "ซ่อน" : "แสดง"}</button>
                <button className="btn sm" onClick={() => copy(it.secret)}>คัดลอก</button>
              </div>
            </div>
          ))}
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน {Math.round((user.idle_secs || 900) / 60)} นาที
        </p>
      </div>
      <BottomNav role={user.role} />
      <IdleGuard seconds={user.idle_secs || 900} />
    </>
  );
}
