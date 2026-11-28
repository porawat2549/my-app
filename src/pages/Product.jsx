import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useOptionalUser } from "../useAuth.js";
import { product, buyProduct } from "../api.js";
import { Navbar, BottomNav, baht } from "../ui.jsx";
import { Gallery } from "../Media.jsx";
import { ask, base, copy, esc, fail } from "../alert.js";
import { confetti } from "../fx.js";

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, loaded } = useOptionalUser();
  const [p, setP] = useState(undefined); // undefined = กำลังโหลด, null = ไม่พบ
  const [bal, setBal] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => product(id).then(setP).catch(() => setP(null));
  useEffect(() => { setP(undefined); load(); }, [id]);

  async function buy() {
    if (!user) { // บังคับล็อกอินเฉพาะตอนกดซื้อ แล้วพากลับมาที่สินค้านี้
      nav("/login?next=" + encodeURIComponent("/product/" + id));
      return;
    }
    const balance = bal ?? user.balance;
    if (balance < p.price) {
      if (await ask("ยอดเงินไม่พอ", `ต้องใช้ ฿${baht(p.price)} แต่คงเหลือ ฿${baht(balance)}`, "ไปเติมเงิน")) nav("/dashboard");
      return;
    }
    if (!(await ask(`ซื้อ ${p.name}?`, `ราคา ฿${baht(p.price)} · คงเหลือหลังซื้อ ฿${baht(balance - p.price)}`, "ยืนยันซื้อ"))) return;
    setBusy(true);
    try {
      const r = await buyProduct(p.id);
      setBal(r.balance);
      confetti();
      const res = await base.fire({
        icon: "success", title: "ซื้อสำเร็จ 🎉",
        html: `<div>${esc(r.name)}</div><pre class="swsecret">${esc(r.secret)}</pre><div style="font-size:13px;opacity:.7">ดูย้อนหลังได้ที่ บัญชีของฉัน → ของที่ได้รับ</div>`,
        showDenyButton: true, denyButtonText: "คัดลอก", confirmButtonText: "ตกลง",
      });
      if (res.isDenied) copy(r.secret);
      load();
    } catch (e) { fail("ซื้อไม่สำเร็จ", e.message); load(); }
    setBusy(false);
  }

  return (
    <>
      <Navbar user={user && bal != null ? { ...user, balance: bal } : user} />
      <div className="page wide">
        <p style={{ marginTop: 16 }}><Link to="/">‹ กลับไปร้านค้า</Link></p>
        {p === undefined && <div className="card sk" style={{ height: 380 }} />}
        {p === null && <div className="empty">ไม่พบสินค้านี้ หรือถูกปิดขายแล้ว</div>}
        {p && (
          <div className="pgrid">
            <Gallery media={p.media} />
            <div>
              <h1 style={{ fontSize: 24, marginTop: 14, lineHeight: 1.3 }}>{p.name}</h1>
              <div className="row" style={{ margin: "8px 0", gap: 10 }}>
                <span className="price">฿{baht(p.price)}</span>
                <span className={"badge " + (p.stock ? "ok" : "er")}>{p.stock ? `เหลือ ${p.stock} ชิ้น` : "สินค้าหมด"}</span>
              </div>
              <div className="card">
                <h2>รายละเอียดสินค้า</h2>
                {p.description ? <p className="desc">{p.description}</p> : <p className="mu">ไม่มีรายละเอียดเพิ่มเติม</p>}
              </div>
              <div className="buybar">
                <button className="btn lg block" style={{ marginTop: 0 }} disabled={busy || !p.stock || !loaded} onClick={buy}>
                  {!p.stock ? "สินค้าหมด" : busy ? "กำลังดำเนินการ…" : user ? `🛒 ซื้อเลย ฿${baht(p.price)}` : "🔑 เข้าสู่ระบบเพื่อซื้อ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav role={user?.role} guest={loaded && !user} />
    </>
  );
}
