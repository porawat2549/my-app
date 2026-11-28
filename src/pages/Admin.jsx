import { useEffect, useState } from "react";
import useAuth from "../useAuth.js";
import { listUsers, adjustBalance, setRole, adminLogs, adminPrizes, addPrize, addStock, setWeight, deletePrize, setPrice } from "../api.js";
import { Topbar, BottomNav, Skeleton, baht, ago, PRIZE_CAT } from "../ui.jsx";
import { ask, askNumber, askLines, toast, fail } from "../alert.js";
import IdleGuard from "../IdleGuard.jsx";
import LogList, { CATS } from "../LogList.jsx";

const CAT_TABS = [["all", "ทั้งหมด"], ["money", "การเงิน"], ["wheel", "วงล้อ/รางวัล"], ["session", "เข้า-ออก/หมดเวลา"], ["fail", "ล้มเหลว"], ["admin", "สิทธิ์/สมัคร"]];
const EMPTY = { name: "", emoji: "🎁", category: "card", weight: 10, codes: "" };

export default function Admin() {
  const me = useAuth(["admin"]);
  const [users, setUsers] = useState(null);
  const [logs, setLogs] = useState(null);
  const [pz, setPz] = useState(null);
  const [tab, setTab] = useState("users");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [amt, setAmt] = useState({});
  const [uid, setUid] = useState(null);
  const [limit, setLimit] = useState(300);
  const [cat, setCat] = useState("all");
  const [lq, setLq] = useState("");
  const [np, setNp] = useState(EMPTY);
  const [addOpen, setAddOpen] = useState(false);

  const loadUsers = () => listUsers().then(setUsers).catch((e) => fail("โหลดผู้ใช้ไม่สำเร็จ", e.message));
  const loadLogs = () => adminLogs(uid, limit).then(setLogs).catch((e) => fail("โหลดประวัติไม่สำเร็จ", e.message));
  const loadPz = () => adminPrizes().then(setPz).catch((e) => fail("โหลดรางวัลไม่สำเร็จ", e.message));
  useEffect(() => { if (me) { loadUsers(); loadPz(); } }, [me]);
  useEffect(() => { if (me) loadLogs(); }, [me, uid, limit]);
  if (!me) return <Skeleton />;

  async function run(fn, msg) {
    try { await fn(); toast(msg); loadUsers(); loadPz(); loadLogs(); return true; }
    catch (e) { fail("ไม่สำเร็จ", e.message); return false; }
  }
  async function adj(u, sign) {
    const n = parseFloat(amt[u.id]);
    if (!n || n <= 0) return fail("กรอกจำนวนเงินให้ถูกต้อง");
    if (!(await ask(`${sign > 0 ? "เพิ่ม" : "หัก"} ฿${baht(n)}?`, `ให้ ${u.email}`, sign > 0 ? "เพิ่มยอด" : "หักยอด", sign < 0))) return;
    if (await run(() => adjustBalance(u.id, sign * n), "ปรับยอดแล้ว")) setAmt({ ...amt, [u.id]: "" });
  }
  async function role(u) {
    const to = u.role === "admin" ? "user" : "admin";
    if (await ask(`เปลี่ยนเป็น ${to}?`, u.email, "เปลี่ยนสิทธิ์", to === "admin")) run(() => setRole(u.id, to), "เปลี่ยนสิทธิ์แล้ว");
  }
  async function newPrize(e) {
    e.preventDefault();
    const codes = np.codes.split("\n").map((s) => s.trim()).filter(Boolean);
    if (await run(() => addPrize({ name: np.name, emoji: np.emoji, category: np.category, weight: +np.weight, codes }), "เพิ่มรางวัลแล้ว")) {
      setNp(EMPTY); setAddOpen(false);
    }
  }
  async function stock(p) {
    const codes = await askLines(`เพิ่มสต็อก ${p.emoji} ${p.name}`, "1 บรรทัด = 1 รายการ (โค้ดบัตร หรือ ไอดี:รหัสผ่าน)");
    if (codes) run(() => addStock(p.id, codes), `เพิ่ม ${codes.length} รายการแล้ว`);
  }
  async function weight(p) {
    const w = await askNumber(`น้ำหนัก ${p.name}`, "ยิ่งมากยิ่งออกบ่อย (0 = ปิดชั่วคราว)", p.weight);
    if (w != null) run(() => setWeight(p.id, Math.round(w)), "ปรับน้ำหนักแล้ว");
  }
  async function del(p) {
    if (await ask(`ลบ ${p.emoji} ${p.name}?`, `จะลบของที่ยังไม่ถูกสุ่ม ${p.stock} รายการ ส่วนที่ผู้ใช้ได้ไปแล้วยังอยู่ในคลังของเขา`, "ลบเลย", true))
      run(() => deletePrize(p.id), "ลบรางวัลแล้ว");
  }
  async function price() {
    const v = await askNumber("ราคาต่อการหมุน (บาท)", "", pz ? pz.price : 10);
    if (v != null) run(() => setPrice(v), "ปรับราคาแล้ว");
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
          {[["users", "ผู้ใช้"], ["wheel", "วงล้อ"], ["logs", "ประวัติ"]].map(([k, t]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t}</button>
          ))}
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

        {tab === "wheel" && (<>
          <div className="card">
            <div className="row">
              <div className="grow"><div className="mu sm">ราคาต่อการหมุน</div><div className="bold" style={{ fontSize: 22 }}>฿{pz ? baht(pz.price) : "–"}</div></div>
              <button className="btn ghost sm" onClick={price}>เปลี่ยนราคา</button>
            </div>
            <button className="btn block" onClick={() => setAddOpen(!addOpen)}>{addOpen ? "ปิดฟอร์ม" : "＋ เพิ่มรางวัลใหม่"}</button>
          </div>

          {addOpen && (
            <form className="card" onSubmit={newPrize}>
              <h2>เพิ่มรางวัล</h2>
              <label>ชื่อรางวัล</label>
              <input required maxLength={60} value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="เช่น บัตรเติมเงิน 50 บาท" />
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div style={{ width: 90 }}><label>อีโมจิ</label><input value={np.emoji} onChange={(e) => setNp({ ...np, emoji: e.target.value })} /></div>
                <div className="grow"><label>ประเภท</label>
                  <select value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value })}>
                    {Object.entries(PRIZE_CAT).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select></div>
              </div>
              <label>น้ำหนัก (ยิ่งมากยิ่งออกบ่อย)</label>
              <input type="number" inputMode="numeric" min="1" required value={np.weight} onChange={(e) => setNp({ ...np, weight: e.target.value })} />
              {np.category !== "none" && (<>
                <label>โค้ด / ไอดี (1 บรรทัด = 1 ชิ้น = 1 สต็อก)</label>
                <textarea required value={np.codes} onChange={(e) => setNp({ ...np, codes: e.target.value })} placeholder={"ABCD-1234-EFGH\nหรือ  ไอดี:รหัสผ่าน"} />
              </>)}
              {np.category === "none" && <p className="hint">ประเภท "ไม่ได้รางวัล" ไม่มีสต็อก ใช้ปรับอัตราที่ผู้เล่นไม่ได้อะไร</p>}
              <button className="btn block">บันทึกรางวัล</button>
            </form>
          )}

          {!pz && <div className="card sk" style={{ height: 90 }} />}
          {pz && !pz.prizes.length && <div className="empty">ยังไม่มีรางวัล กด "เพิ่มรางวัลใหม่" ด้านบน</div>}
          {pz && pz.prizes.map((p) => (
            <div className="card" key={p.id}>
              <div className="row">
                <div className="ic ac">{p.emoji}</div>
                <div className="grow">
                  <div className="t bold">{p.name}</div>
                  <div className="mu sm">{PRIZE_CAT[p.category]} · น้ำหนัก {p.weight} · โอกาส {p.odds.toFixed(1)}%</div>
                  <div className="sm" style={{ color: p.category !== "none" && p.stock === 0 ? "var(--er)" : "var(--mu)" }}>
                    {p.category === "none" ? "ไม่จำกัดจำนวน" : p.stock === 0 ? `หมดสต็อก (ไม่อยู่ในวงล้อ) · แจกแล้ว ${p.sold}` : `เหลือ ${p.stock} · แจกแล้ว ${p.sold}`}
                  </div>
                </div>
              </div>
              <div className="row wrapr" style={{ marginTop: 10, gap: 8 }}>
                {p.category !== "none" && <button className="btn sm" onClick={() => stock(p)}>＋ สต็อก</button>}
                <button className="btn ghost sm" onClick={() => weight(p)}>น้ำหนัก</button>
                <button className="btn danger sm" onClick={() => del(p)}>ลบ</button>
              </div>
            </div>
          ))}
        </>)}

        {tab === "logs" && (
          <div className="card">
            <div className="row">
              <h2 className="grow">ประวัติทุกการกระทำ</h2>
              <button className="btn ghost sm" onClick={() => { loadLogs(); loadUsers(); }}>↻ รีเฟรช</button>
            </div>
            <p className="hint" style={{ marginBottom: 10 }}>
              เห็นเฉพาะแอดมิน · เข้า/ออกระบบ ล้มเหลว หมดเวลา {Math.round((me.idle_secs || 900) / 60)} นาที เติมเงิน (รวมสลิปที่ถูกปฏิเสธ) หมุนวงล้อ จัดการรางวัล และเปลี่ยนสิทธิ์ · แตะรายการเพื่อดู IP/อุปกรณ์
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
            <input style={{ marginTop: 10 }} placeholder="ค้นหาอีเมล / IP / รายละเอียด…" value={lq} onChange={(e) => setLq(e.target.value)} />
            <LogList rows={rows} admin />
            {logs && logs.length >= limit && limit < 1000 && (
              <button className="btn ghost block" onClick={() => setLimit(limit + 300)}>โหลดเพิ่ม</button>
            )}
          </div>
        )}
      </div>
      <BottomNav role="admin" />
      <IdleGuard seconds={me.idle_secs || 900} />
    </>
  );
}
