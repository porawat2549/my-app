import { useEffect, useRef, useState } from "react";
import useAuth from "../useAuth.js";
import {
  listUsers, adjustBalance, setRole, adminLogs, adminPrizes, addPrize, addStock, setWeight, deletePrize, setPrice,
  setPrizeImage, setOdds, upload, adminProducts, addProduct, editProduct, addProductStock, deleteProduct,
} from "../api.js";
import { Navbar, BottomNav, Skeleton, baht, ago, PRIZE_CAT } from "../ui.jsx";
import { ask, askNumber, askLines, toast, fail } from "../alert.js";
import IdleGuard from "../IdleGuard.jsx";
import LogList, { CATS } from "../LogList.jsx";
import { MediaPicker, Cover } from "../Media.jsx";

const CAT_TABS = [["all", "ทั้งหมด"], ["money", "การเงิน"], ["wheel", "วงล้อ/รางวัล"], ["shop", "ร้านค้า"], ["session", "เข้า-ออก/2FA"], ["fail", "ล้มเหลว"], ["admin", "สิทธิ์/สมัคร"]];
const EMPTY = { name: "", emoji: "🎁", category: "card", weight: 10, codes: "", media: [] };
const EMPTY_P = { name: "", description: "", price: "", media: [], active: true, codes: "" };

// ---------- ปรับโอกาสของรางวัลเป็น % ----------
function OddsEditor({ prizes, onSave }) {
  const sig = prizes.map((p) => p.id + ":" + p.weight).join();
  const init = () => Object.fromEntries(prizes.map((p) => [p.id, p.share.toFixed(2)]));
  const [v, setV] = useState(init);
  useEffect(() => setV(init()), [sig]);
  const num = (id) => parseFloat(v[id]) || 0;
  const total = prizes.reduce((s, p) => s + num(p.id), 0);
  const good = Math.abs(total - 100) < 0.011;
  const set = (id, x) => setV({ ...v, [id]: x });
  function spread(weights) { // กระจายให้รวม 100.00 พอดี (ปัดเศษไปที่ตัวสุดท้าย)
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return;
    let acc = 0; const o = {};
    prizes.forEach((p, i) => {
      const n = i === prizes.length - 1 ? Math.max(0, +(100 - acc).toFixed(2)) : +((weights[i] / sum) * 100).toFixed(2);
      acc += n; o[p.id] = n.toFixed(2);
    });
    setV(o);
  }
  return (
    <div className="card odds">
      <h2>📊 ปรับเปอร์เซ็นต์โอกาส</h2>
      <p className="hint">ตั้งโอกาสออกของแต่ละรางวัล รวมต้อง 100% · ถ้ารางวัลไหนหมดสต็อก ระบบจะกระจายโอกาสให้รางวัลที่เหลืออัตโนมัติ · ใส่ 0 = ปิดชั่วคราว</p>
      {prizes.map((p) => (
        <div className="orow" key={p.id}>
          <div className="ic ac">{p.image ? <img src={p.image} alt="" /> : p.emoji}</div>
          <div style={{ minWidth: 0 }}>
            <div className="t bold sm">{p.name}{p.category !== "none" && p.stock === 0 ? " · หมดสต็อก" : ""}</div>
            <input type="range" min="0" max="100" step="0.5" value={num(p.id)} onChange={(e) => set(p.id, e.target.value)} aria-label={"เปอร์เซ็นต์ " + p.name} />
          </div>
          <div className="row" style={{ gap: 4 }}>
            <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={v[p.id] ?? ""} onChange={(e) => set(p.id, e.target.value)} />
            <span className="mu">%</span>
          </div>
        </div>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <div className="grow"><span className="mu sm">รวม</span> <span className={"total " + (good ? "good" : "bad")}>{total.toFixed(2)}%</span></div>
        <button className="btn ghost sm" onClick={() => spread(prizes.map(() => 1))}>แบ่งเท่าๆ กัน</button>
        <button className="btn ghost sm" onClick={() => spread(prizes.map((p) => num(p.id)))} disabled={total <= 0 || good}>ปรับให้รวม 100%</button>
      </div>
      <button className="btn block" disabled={!good} onClick={() => onSave(prizes.map((p) => ({ id: p.id, percent: +num(p.id).toFixed(2) })))}>
        {good ? "บันทึกเปอร์เซ็นต์" : "รวมต้องเท่ากับ 100% ก่อนบันทึก"}
      </button>
    </div>
  );
}

// ---------- ฟอร์มสินค้า (เพิ่ม/แก้ไข) ----------
function ProductForm({ init, isNew, onSubmit, onCancel }) {
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const up = (k, val) => setF({ ...f, [k]: val });
  async function go(e) {
    e.preventDefault(); setBusy(true);
    const codes = (f.codes || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const ok = await onSubmit({ name: f.name, description: f.description, price: parseFloat(f.price), media: f.media, active: f.active, ...(isNew ? { codes } : {}) });
    if (!ok) setBusy(false);
  }
  return (
    <form className="card" onSubmit={go}>
      <h2>{isNew ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}</h2>
      <label>ชื่อสินค้า</label>
      <input required maxLength={100} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="เช่น บัตรเติมเงิน True Money 100 บาท" />
      <label>ราคา (บาท)</label>
      <input required type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={(e) => up("price", e.target.value)} />
      <label>รูปภาพ / วิดีโอ</label>
      <MediaPicker value={f.media} onChange={(m) => up("media", m)} max={12} />
      <label>รายละเอียดสินค้า</label>
      <textarea maxLength={5000} style={{ minHeight: 150 }} value={f.description} onChange={(e) => up("description", e.target.value)}
        placeholder={"อธิบายสินค้า เงื่อนไขการใช้งาน วิธีรับของ ฯลฯ\n(ขึ้นบรรทัดใหม่ได้)"} />
      {isNew && (<>
        <label>สต็อก: โค้ด / ไอดี (1 บรรทัด = 1 ชิ้น = ลูกค้า 1 คน)</label>
        <textarea value={f.codes} onChange={(e) => up("codes", e.target.value)} placeholder={"ABCD-1234-EFGH\nหรือ  ไอดี:รหัสผ่าน"} />
        <p className="hint">เว้นว่างไว้ก่อนได้ แล้วค่อยกด "＋ สต็อก" ทีหลัง</p>
      </>)}
      <label className="row" style={{ gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={f.active} onChange={(e) => up("active", e.target.checked)} /> เปิดขายในหน้าร้าน
      </label>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <button className="btn grow" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>ยกเลิก</button>
      </div>
    </form>
  );
}

export default function Admin() {
  const me = useAuth(["admin"]);
  const [users, setUsers] = useState(null);
  const [logs, setLogs] = useState(null);
  const [pz, setPz] = useState(null);
  const [prods, setProds] = useState(null);
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
  const [pForm, setPForm] = useState(null); // null | "new" | product
  const imgRef = useRef(null);
  const [imgFor, setImgFor] = useState(null);

  const loadUsers = () => listUsers().then(setUsers).catch((e) => fail("โหลดผู้ใช้ไม่สำเร็จ", e.message));
  const loadLogs = () => adminLogs(uid, limit).then(setLogs).catch((e) => fail("โหลดประวัติไม่สำเร็จ", e.message));
  const loadPz = () => adminPrizes().then(setPz).catch((e) => fail("โหลดรางวัลไม่สำเร็จ", e.message));
  const loadProds = () => adminProducts().then(setProds).catch((e) => fail("โหลดสินค้าไม่สำเร็จ", e.message));
  useEffect(() => { if (me) { loadUsers(); loadPz(); loadProds(); } }, [me]);
  useEffect(() => { if (me) loadLogs(); }, [me, uid, limit]);
  if (!me) return <Skeleton />;

  async function run(fn, msg) {
    try { await fn(); toast(msg); loadUsers(); loadPz(); loadProds(); loadLogs(); return true; }
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
    const image = (np.media[0] && np.media[0].url) || "";
    if (await run(() => addPrize({ name: np.name, emoji: np.emoji, category: np.category, weight: +np.weight, codes, image }), "เพิ่มรางวัลแล้ว")) {
      setNp(EMPTY); setAddOpen(false);
    }
  }
  async function stock(p) {
    const codes = await askLines(`เพิ่มสต็อก ${p.emoji} ${p.name}`, "1 บรรทัด = 1 รายการ (โค้ดบัตร หรือ ไอดี:รหัสผ่าน)");
    if (codes) run(() => addStock(p.id, codes), `เพิ่ม ${codes.length} รายการแล้ว`);
  }
  async function weight(p) {
    const w = await askNumber(`น้ำหนัก ${p.name}`, "ยิ่งมากยิ่งออกบ่อย (0 = ปิดชั่วคราว) — แนะนำใช้ตัวปรับ % ด้านบนแทน", p.weight);
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
  async function pickImg(e) {
    const f = e.target.files[0]; e.target.value = "";
    if (!f || !imgFor) return;
    await run(async () => { const r = await upload(f); if (r.type !== "image") throw new Error("ต้องเป็นไฟล์รูปภาพ"); await setPrizeImage(imgFor.id, r.url); }, "เปลี่ยนรูปแล้ว");
  }
  async function saveProduct(body) {
    const isNew = pForm === "new";
    const ok = await run(() => (isNew ? addProduct(body) : editProduct(pForm.id, body)), isNew ? "เพิ่มสินค้าแล้ว" : "บันทึกสินค้าแล้ว");
    if (ok) setPForm(null);
    return ok;
  }
  async function pStock(p) {
    const codes = await askLines(`เพิ่มสต็อก ${p.name}`, "1 บรรทัด = 1 ชิ้น (โค้ดบัตร หรือ ไอดี:รหัสผ่าน)");
    if (codes) run(() => addProductStock(p.id, codes), `เพิ่ม ${codes.length} ชิ้นแล้ว`);
  }
  async function pToggle(p) {
    run(() => editProduct(p.id, { name: p.name, description: p.description, price: p.price, media: p.media, active: !p.active }), p.active ? "ซ่อนสินค้าแล้ว" : "เปิดขายแล้ว");
  }
  async function pDel(p) {
    if (await ask(`ลบ ${p.name}?`, `จะลบสต็อกที่ยังไม่ขาย ${p.stock} ชิ้น ส่วนที่ลูกค้าซื้อไปแล้วยังอยู่ในคลังของเขา`, "ลบเลย", true))
      run(() => deleteProduct(p.id), "ลบสินค้าแล้ว");
  }

  const shownUsers = (users || []).filter((u) => u.email.includes(q.trim().toLowerCase()));
  const target = users && users.find((u) => u.id === uid);
  const rows = logs && logs.filter((r) =>
    (!CATS[cat] || CATS[cat].includes(r.kind)) &&
    (!lq.trim() || (r.user_email + " " + r.ip + " " + r.note).toLowerCase().includes(lq.trim().toLowerCase())));

  return (
    <>
      <Navbar user={me} />
      <div className="page wide">
        <h1 className="title">จัดการระบบ</h1>
        <div className="stats">
          <div className="stat"><b>{users ? users.length : "–"}</b><span>ผู้ใช้ทั้งหมด</span></div>
          <div className="stat"><b>{users ? users.filter((u) => u.online).length : "–"}</b><span>ออนไลน์ตอนนี้</span></div>
          <div className="stat"><b>฿{users ? baht(users.reduce((s, u) => s + u.balance, 0)) : "–"}</b><span>ยอดรวมทั้งระบบ</span></div>
        </div>
        <div className="seg">
          {[["users", "ผู้ใช้"], ["shop", "สินค้า"], ["wheel", "วงล้อ"], ["logs", "ประวัติ"]].map(([k, t]) => (
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
                <div className="r"><div className="bold">฿{baht(u.balance)}</div>
                  <span className={"badge " + u.role}>{u.role}</span> {u.totp_enabled && <span className="badge ok" title="เปิด 2FA">🔐</span>}</div>
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

        {tab === "shop" && (<>
          {!pForm && <button className="btn block" onClick={() => setPForm("new")}>＋ เพิ่มสินค้าใหม่</button>}
          {pForm && (
            <ProductForm key={pForm === "new" ? "new" : pForm.id} isNew={pForm === "new"} onCancel={() => setPForm(null)} onSubmit={saveProduct}
              init={pForm === "new" ? EMPTY_P : { name: pForm.name, description: pForm.description, price: String(pForm.price), media: pForm.media || [], active: pForm.active, codes: "" }} />
          )}
          {!prods && <div className="card sk" style={{ height: 90 }} />}
          {prods && !prods.length && <div className="empty">ยังไม่มีสินค้า กด "เพิ่มสินค้าใหม่" ด้านบน</div>}
          {prods && prods.map((p) => (
            <div className="card" key={p.id} style={p.active ? undefined : { opacity: .65 }}>
              <div className="row">
                <div className="ic" style={{ width: 64, height: 64, borderRadius: 14, position: "relative" }}><Cover media={p.media} /></div>
                <div className="grow">
                  <div className="t bold">{p.name}</div>
                  <div className="mu sm">฿{baht(p.price)} · ขายแล้ว {p.sold}</div>
                  <div className="sm" style={{ color: p.stock === 0 ? "var(--er)" : "var(--mu)" }}>
                    {p.stock === 0 ? "สินค้าหมด" : `เหลือ ${p.stock} ชิ้น`}{!p.active && " · ซ่อนอยู่"}
                  </div>
                </div>
              </div>
              <div className="row wrapr" style={{ marginTop: 10, gap: 8 }}>
                <button className="btn sm" onClick={() => pStock(p)}>＋ สต็อก</button>
                <button className="btn ghost sm" onClick={() => { setPForm(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}>แก้ไข</button>
                <button className="btn ghost sm" onClick={() => pToggle(p)}>{p.active ? "ซ่อน" : "เปิดขาย"}</button>
                <button className="btn danger sm" onClick={() => pDel(p)}>ลบ</button>
              </div>
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
              <label>รูปรางวัล (ไม่ใส่ = ใช้อีโมจิ)</label>
              <MediaPicker value={np.media} onChange={(m) => setNp({ ...np, media: m })} max={1} video={false} youtube={false} />
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div style={{ width: 90 }}><label>อีโมจิ</label><input value={np.emoji} onChange={(e) => setNp({ ...np, emoji: e.target.value })} /></div>
                <div className="grow"><label>ประเภท</label>
                  <select value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value })}>
                    {Object.entries(PRIZE_CAT).filter(([k]) => k !== "product").map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select></div>
              </div>
              <label>น้ำหนักเริ่มต้น (ยิ่งมากยิ่งออกบ่อย — หลังเพิ่มแล้วปรับเป็น % ได้)</label>
              <input type="number" inputMode="numeric" min="1" required value={np.weight} onChange={(e) => setNp({ ...np, weight: e.target.value })} />
              {np.category !== "none" && (<>
                <label>โค้ด / ไอดี (1 บรรทัด = 1 ชิ้น = 1 สต็อก)</label>
                <textarea required value={np.codes} onChange={(e) => setNp({ ...np, codes: e.target.value })} placeholder={"ABCD-1234-EFGH\nหรือ  ไอดี:รหัสผ่าน"} />
              </>)}
              {np.category === "none" && <p className="hint">ประเภท "ไม่ได้รางวัล" ไม่มีสต็อก ใช้ปรับอัตราที่ผู้เล่นไม่ได้อะไร</p>}
              <button className="btn block">บันทึกรางวัล</button>
            </form>
          )}

          {pz && pz.prizes.length > 0 && (
            <OddsEditor prizes={pz.prizes} onSave={(list) => run(() => setOdds(list), "บันทึกเปอร์เซ็นต์แล้ว")} />
          )}

          <input ref={imgRef} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp" onChange={pickImg} />
          {!pz && <div className="card sk" style={{ height: 90 }} />}
          {pz && !pz.prizes.length && <div className="empty">ยังไม่มีรางวัล กด "เพิ่มรางวัลใหม่" ด้านบน</div>}
          {pz && pz.prizes.map((p) => (
            <div className="card" key={p.id}>
              <div className="row">
                <div className="ic ac" style={{ width: 52, height: 52, fontSize: 26 }}>{p.image ? <img src={p.image} alt="" /> : p.emoji}</div>
                <div className="grow">
                  <div className="t bold">{p.name}</div>
                  <div className="mu sm">{PRIZE_CAT[p.category]} · ตั้งไว้ {p.share.toFixed(2)}% · โอกาสจริงตอนนี้ {p.odds.toFixed(1)}%</div>
                  <div className="sm" style={{ color: p.category !== "none" && p.stock === 0 ? "var(--er)" : "var(--mu)" }}>
                    {p.category === "none" ? "ไม่จำกัดจำนวน" : p.stock === 0 ? `หมดสต็อก (ไม่อยู่ในวงล้อ) · แจกแล้ว ${p.sold}` : `เหลือ ${p.stock} · แจกแล้ว ${p.sold}`}
                  </div>
                </div>
              </div>
              <div className="row wrapr" style={{ marginTop: 10, gap: 8 }}>
                {p.category !== "none" && <button className="btn sm" onClick={() => stock(p)}>＋ สต็อก</button>}
                <button className="btn ghost sm" onClick={() => { setImgFor(p); imgRef.current.click(); }}>🖼️ {p.image ? "เปลี่ยนรูป" : "ใส่รูป"}</button>
                {p.image && <button className="btn ghost sm" onClick={() => run(() => setPrizeImage(p.id, ""), "ลบรูปแล้ว")}>ลบรูป</button>}
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
              เห็นเฉพาะแอดมิน · เข้า/ออกระบบ 2FA ล้มเหลว หมดเวลา {Math.round((me.idle_secs || 900) / 60)} นาที เติมเงิน ซื้อสินค้า หมุนวงล้อ จัดการสินค้า/รางวัล และเปลี่ยนสิทธิ์ · แตะรายการเพื่อดู IP/อุปกรณ์
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
