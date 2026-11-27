import { useEffect, useState } from "react";
import useAuth from "../useAuth.js";
import { topup, myLogs } from "../api.js";
import { Topbar, Skeleton, baht, useToast } from "../ui.jsx";
import IdleGuard from "../IdleGuard.jsx";
import LogList, { CATS } from "../LogList.jsx";

const CHIPS = [50, 100, 300, 500, 1000];
const TABS = [["all", "ทั้งหมด"], ["money", "การเงิน"], ["session", "เข้า-ออกระบบ"], ["fail", "ล้มเหลว"]];

export default function Dashboard() {
  const user = useAuth();
  const [bal, setBal] = useState(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [logs, setLogs] = useState(null);
  const [cat, setCat] = useState("all");
  const [tick, setTick] = useState(0);
  const [toast, toastNode] = useToast();

  useEffect(() => { if (user) myLogs().then(setLogs).catch(() => setLogs([])); }, [user, tick]);
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
      setBal(r.balance); setTick((t) => t + 1);
      toast(`เติมเงินสำเร็จ +฿${baht(n)}`);
      setAmount(""); setFile(null); setOpen(false);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const rows = logs && (CATS[cat] ? logs.filter((r) => CATS[cat].includes(r.kind)) : logs);
  return (
    <>
      <Topbar user={user} />
      <div className="page">
        <div className="card hero">
          <div className="row"><span className="lbl grow">ยอดเงินคงเหลือ</span><span className="badge">{user.role}</span></div>
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

        <div className="card">
          <h2>ประวัติรายการ</h2>
          <p className="hint" style={{ marginBottom: 10 }}>แตะรายการเพื่อดูรายละเอียด · ใช้ดูว่ามีใครเข้าบัญชีคุณหรือไม่ได้ด้วย</p>
          <div className="chips">
            {TABS.map(([k, t]) => <button key={k} className={"chip " + (cat === k ? "on" : "")} onClick={() => setCat(k)}>{t}</button>)}
          </div>
          <LogList rows={rows} />
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน {Math.round((user.idle_secs || 900) / 60)} นาที
        </p>
      </div>
      <IdleGuard seconds={user.idle_secs || 900} />
      {toastNode}
    </>
  );
}
