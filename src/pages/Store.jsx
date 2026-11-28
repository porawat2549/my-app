import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOptionalUser } from "../useAuth.js";
import { products } from "../api.js";
import { Navbar, BottomNav, baht } from "../ui.jsx";
import { Cover } from "../Media.jsx";
import { fail } from "../alert.js";

// หน้าแรก = หน้าร้านค้า ทุกคนดูได้ ต้องล็อกอินตอนกดซื้อเท่านั้น
export default function Store() {
  const { user, loaded } = useOptionalUser();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { products().then(setList).catch((e) => { setList([]); fail("โหลดสินค้าไม่สำเร็จ", e.message); }); }, []);
  const shown = useMemo(() => (list || []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [list, q]);
  return (
    <>
      <Navbar user={user} />
      <div className="page wide">
        <section className="sbanner">
          <span className="orb a" /><span className="orb b" />
          <h1>ไอเทม ไอดีเกม บัตรเติมเงิน<br />ส่งทันทีหลังชำระ</h1>
          <p>เลือกซื้อสินค้าในร้าน หรือลุ้นรางวัลจากวงล้อสุ่มไอเทม</p>
          <div className="btns">
            <Link className="btn light" style={{ display: "inline-grid", placeItems: "center" }} to="/wheel">🎡 หมุนวงล้อ</Link>
            {loaded && !user && <Link className="btn ghost" style={{ display: "inline-grid", placeItems: "center", background: "rgba(255,255,255,.18)", border: 0, color: "#fff" }} to="/register">สมัครสมาชิกฟรี</Link>}
          </div>
        </section>

        <div className="search"><input placeholder="ค้นหาสินค้า…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาสินค้า" /></div>
        <h2 className="title">สินค้าทั้งหมด</h2>

        {!list && <div className="grid">{[0, 1, 2, 3].map((i) => <div key={i} className="pcard sk" style={{ height: 230 }} />)}</div>}
        {list && !list.length && <div className="empty">ร้านยังไม่มีสินค้า<br /><span className="sm">แอดมินเพิ่มสินค้าได้ที่ จัดการ → สินค้า</span></div>}
        {list && !!list.length && !shown.length && <div className="empty">ไม่พบสินค้าที่ค้นหา</div>}
        <div className="grid g4">
          {shown.map((p) => {
            const hasVid = (p.media || []).some((m) => m.type !== "image");
            return (
              <Link key={p.id} className="pcard" to={"/product/" + p.id}>
                <div className="cov">
                  <Cover media={p.media} />
                  <span className={"tag" + (p.stock ? "" : " out")}>{p.stock ? `เหลือ ${p.stock}` : "สินค้าหมด"}</span>
                  {hasVid && <span className="play">▶</span>}
                </div>
                <div className="bd">
                  <div className="nm">{p.name}</div>
                  <div className="pr">฿{baht(p.price)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <BottomNav role={user?.role} guest={loaded && !user} />
    </>
  );
}
