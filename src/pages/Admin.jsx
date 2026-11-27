import { useEffect, useState } from "react";
import useAuth from "../useAuth.js";
import { listUsers, adjustBalance, setRole, adminLogs } from "../api.js";
import { Topbar, Skeleton, baht, ago, useToast } from "../ui.jsx";
import IdleGuard from "../IdleGuard.jsx";
import LogList, { CATS } from "../LogList.jsx";

const CAT_TABS = [["all", "ทั้งหมด"], ["money", "การเงิน"], ["session", "เข้า-ออก/หมดเวลา"], ["fail", "ล้มเหลว"], ["admin", "สิทธิ์/สมัคร"]];

export default function Admin() {
  const me = useAuth(["admin"]);
  const [toast, toastNode] = useToast();
  const [users, setUsers] = useState(null);
  const [logs, setLogs] = useState(null);
  const [tab, setTab] = useState("users");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [amt, setAmt] = useState({});
  const [uid, setUid] = useState(null);
  const [limit, setLimit] = useState(300);
  const [cat, setCat] = useState("all");
  const [lq, setLq] = useState("");

  const loadUsers = () => listUsers().then(setUsers).catch((e) => toast(e.message, "er"));
  const loadLogs = () => adminLogs(uid, limit).then(setLogs).catch((e) => toast(e.message, "er"));
  useEffect(() => { if (me) loadUsers(); }, [me]);
  useEffect(() => { if (me) loadLogs(); }, [me, uid, limit]);
  if (!me) return <Skeleton />;

  async function adj(u, sign) {
    const n = parseFloat(amt[u.id]);
    if (!n || n <= 0) return toast("กรอกจำนวนเงินให้ถูกต้อง", "er");
    if (!window.confirm(`${sign > 0 ? "เพิ่ม" : "หัก"} ฿${baht(n)} ให้ ${u.email}?`)) return;
    try { await adjustBalance(u.id, sign * n); setAmt({ ...amt, [u.id]: "" }); toast("ปรับยอดแล้ว"); loadUsers(); loadLogs(); }
    catch (e) { toast(e.message, "er"); }
  }
  async function role(u) {
    const to = u.role === "admin" ? "user" : "admin";
    if (!window.confirm(`เปลี่ยน ${u.email} เป็น ${to}?`)) return;
    try { await setRole(u.id, to); toast("เปลี่ยนสิทธิ์แล้ว"); loadUsers(); loadLogs(); }
    catch (e) { toast(e.message, "er"); }
  }
  const shownUsers = (users || []).filter((u) => u.email.includes(q.trim().toLowerCase()));
  const target = users && users.find((u) => u.id === uid);
  const rows = logs && logs.filter((r) =>
    (!CATS[cat] || CATS[cat].includes(r.kind)) &&
    (!lq.trim() || (r.user_email + " " + r.ip + " " + r.note).toLowerCase().includes(lq.trim().toLowerCase())));

  return (
    <>
      <Topbar user={me} />
      <div className="page wide">
        <div className="stats">
          <div className="stat"><b>{users ? users.length : "–"}</b><span>ผู้ใช้ทั้งหมด</span></div>
          <div className="stat"><b>{users ? users.filter((u) => u.online).length : "–"}</b><span>ออนไลน์ตอนนี้</span></div>
          <div className="stat"><b>฿{users ? baht(users.reduce((s, u) => s + u.balance, 0)) : "–"}</b><span>ยอดรวมทั้งระบบ</span></div>
        </div>
        <div className="seg">
          <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>ผู้ใช้</button>
          <button className={tab === "logs" ? "on" : ""} onClick={() => setTab("logs")}>ประวัติ</button>
        </div>

        {tab === "users" && (<>
          <input style={{ marginTop: 14 }} placeholder="ค้นหาอีเมล…" value={q} onChange={(e) => setQ(e.target.value)} />
          {!users && <div className="card sk" style={{ height: 90 }} />}
          {shownUsers.map((u) => (
            <div className="card item" key={u.id}>
              <div className="row head" onClick={() => setOpen(open === u.id ? null : u.id)}>
                <div className="av">{u.email[0].toUpperCase()}<i className={"dot " + (u.online ? "on" : "")} /></div>
                <div className="grow">
                  <div className="t bold">{u.email}</div>
                  <div className="t mu sm">{u.online ? "ออนไลน์ · " : ""}เข้าสู่ระบบล่าสุด {ago(u.last_login)}</div>
                </div>
                <div className="r"><div className="bold">฿{baht(u.balance)}</div><span className={"badge " + u.role}>{u.role}</span></div>
              </div>
              {open === u.id && (
                <div className="panel">
                  <label style={{ marginTop: 0 }}>ปรับยอด (บาท)</label>
                  <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="จำนวนเงิน" value={amt[u.id] || ""}
                    onChange={(e) => setAmt({ ...amt, [u.id]: e.target.value })} />
                  <div className="row wrapr" style={{ marginTop: 10, gap: 8 }}>
                    <button className="btn sm" onClick={() => adj(u, 1)}>＋ เพิ่มยอด</button>
                    <button className="btn ghost sm" onClick={() => adj(u, -1)}>− หักยอด</button>
                    <button className="btn ghost sm" disabled={u.id === me.id} onClick={() => role(u)}>
                      {u.role === "admin" ? "ลดเป็น user" : "ตั้งเป็น admin"}
                    </button>
                    <button className="btn ghost sm" onClick={() => { setUid(u.id); setTab("logs"); }}>ดูประวัติ</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>)}

        {tab === "logs" && (
          <div className="card">
            <div className="row">
              <h2 className="grow">ประวัติทั้งหมด</h2>
              <button className="btn ghost sm" onClick={() => { loadLogs(); loadUsers(); }}>↻ รีเฟรช</button>
            </div>
            <p className="hint" style={{ marginBottom: 10 }}>
              บันทึกเข้า/ออกระบบ เข้าไม่สำเร็จ หมดเวลา {Math.round((me.idle_secs || 900) / 60)} นาที การเงิน และการเปลี่ยนสิทธิ์ · แตะรายการเพื่อดู IP/อุปกรณ์
            </p>
            {uid && (
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="chip on">เฉพาะ {target ? target.email : "ผู้ใช้ที่เลือก"}</span>
                <button className="btn ghost sm" onClick={() => setUid(null)}>✕ ดูทั้งหมด</button>
              </div>
            )}
            <div className="chips">
              {CAT_TABS.map(([k, t]) => <button key={k} className={"chip " + (cat === k ? "on" : "")} onClick={() => setCat(k)}>{t}</button>)}
            </div>
            <input style={{ marginTop: 10 }} placeholder="ค้นหาอีเมล / IP / หมายเหตุ…" value={lq} onChange={(e) => setLq(e.target.value)} />
            <LogList rows={rows} admin />
            {logs && logs.length >= limit && limit < 1000 && (
              <button className="btn ghost block" onClick={() => setLimit(limit + 300)}>โหลดเพิ่ม</button>
            )}
          </div>
        )}
      </div>
      <IdleGuard seconds={me.idle_secs || 900} />
      {toastNode}
    </>
  );
}
