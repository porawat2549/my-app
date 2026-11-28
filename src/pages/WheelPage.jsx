import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalUser } from "../useAuth.js";
import { getPrizes, spin } from "../api.js";
import { Navbar, BottomNav, baht, PRIZE_CAT } from "../ui.jsx";
import { ask, fail, base, copy, esc } from "../alert.js";
import IdleGuard from "../IdleGuard.jsx";
import Wheel from "../Wheel.jsx";
import { confetti } from "../fx.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function WheelPage() {
  const nav = useNavigate();
  const { user, loaded } = useOptionalUser();
  const [data, setData] = useState(null);
  const [bal, setBal] = useState(null);
  const [deg, setDeg] = useState(0);
  const [anim, setAnim] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = () => getPrizes().then(setData).catch((e) => fail("โหลดวงล้อไม่สำเร็จ", e.message));
  useEffect(() => { load(); }, []);

  const prizes = data ? data.prizes : [];
  const price = data ? data.price : 0;
  const balance = bal ?? (user ? user.balance : 0);

  async function doSpin() {
    if (busy || !prizes.length) return;
    if (!user) { nav("/login?next=" + encodeURIComponent("/wheel")); return; } // ต้องล็อกอินตอนหมุนเท่านั้น
    if (!(await ask(`หมุนวงล้อ ฿${baht(price)}?`, `ยอดคงเหลือ ฿${baht(balance)}`, "หมุนเลย"))) return;
    setBusy(true);
    try {
      const r = await spin(); // server สุ่มและหักเงินแล้ว ตรงนี้แค่ทำอนิเมชันให้ตรงผล
      setBal(r.balance);
      let list = prizes, idx = list.findIndex((p) => p.id === r.prize.id);
      if (idx < 0) { list = [...prizes, { ...r.prize, odds: 0 }]; setData({ ...data, prizes: list }); idx = list.length - 1; await sleep(60); }
      const seg = 360 / list.length, jitter = (Math.random() - 0.5) * seg * 0.6;
      const want = (((360 - (idx + 0.5) * seg + jitter) % 360) + 360) % 360;
      const cur = ((deg % 360) + 360) % 360;
      setAnim(true);
      setDeg(deg + 360 * 6 + ((want - cur + 360) % 360));
      await sleep(5300);
      if (r.prize.category === "none") {
        await base.fire({ icon: "info", title: "เสียใจด้วย 😢", text: "รอบนี้ไม่ได้รางวัล ลองใหม่อีกครั้งนะ", confirmButtonText: "ตกลง" });
      } else {
        confetti(90);
        const res = await base.fire({
          icon: r.prize.image ? undefined : "success", imageUrl: r.prize.image || undefined, imageHeight: 120, imageAlt: r.prize.name,
          title: `ได้รับ ${r.prize.emoji} ${r.prize.name}`,
          html: `<div>โค้ด / ไอดีของคุณ</div><pre class="swsecret">${esc(r.secret)}</pre><div style="font-size:13px;opacity:.7">ดูย้อนหลังได้ที่หน้าหลัก → ของที่ได้รับ</div>`,
          showDenyButton: true, denyButtonText: "คัดลอก", confirmButtonText: "ตกลง",
        });
        if (res.isDenied) copy(r.secret);
      }
      load();
    } catch (e) { fail("หมุนไม่สำเร็จ", e.message); }
    setBusy(false);
  }
  return (
    <>
      <Navbar user={user} balance={bal ?? undefined} />
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          {user && <div className="row"><span className="mu grow" style={{ textAlign: "left" }}>ยอดคงเหลือ</span><b>฿{baht(balance)}</b></div>}
          <Wheel prizes={prizes} deg={deg} anim={anim} />
          <button className="btn block" disabled={busy || !prizes.length} onClick={doSpin}>
            {busy ? "กำลังหมุน…" : loaded && !user ? "🔑 เข้าสู่ระบบเพื่อหมุน" : `🎡 หมุนวงล้อ ฿${baht(price)}`}
          </button>
          <p className="hint">ระบบสุ่มและแจกรางวัลที่เซิร์ฟเวอร์ ผลไม่เปลี่ยนแม้ปิดหน้าจอระหว่างหมุน</p>
        </div>
        <div className="card">
          <h2>รางวัลและโอกาสได้รับ</h2>
          {!prizes.length && <p className="mu">ตอนนี้ยังไม่มีรางวัลในวงล้อ</p>}
          {prizes.map((p) => (
            <div className="li" key={p.id} style={{ cursor: "default" }}>
              <div className="ic ac">{p.image ? <img src={p.image} alt="" /> : p.emoji}</div>
              <div className="grow"><div className="t bold">{p.name}</div>
                <div className="mu sm">{PRIZE_CAT[p.category]}{p.stock != null ? ` · เหลือ ${p.stock}` : ""}</div></div>
              <div className="am">{p.odds.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav role={user?.role} guest={loaded && !user} />
      {user && <IdleGuard seconds={user.idle_secs || 900} />}
    </>
  );
}
