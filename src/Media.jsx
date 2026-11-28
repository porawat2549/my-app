import { useRef, useState } from "react";
import { upload } from "./api.js";
import { askText, fail } from "./alert.js";

// ดึง YouTube video id จากลิงก์ (watch / youtu.be / shorts / embed) หรือรับ id 11 ตัวตรงๆ
export function ytId(input) {
  const t = String(input || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  try {
    const u = new URL(t);
    let id = "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) {
      id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch { return ""; }
}

// รูปปก: รูปแรก ถ้าไม่มีใช้วิดีโอ/YouTube แรก
export function Cover({ media, className }) {
  const list = media || [];
  const img = list.find((m) => m.type === "image");
  if (img) return <img className={className} src={img.url} alt="" loading="lazy" />;
  const v = list.find((m) => m.type === "video");
  if (v) return <video className={className} src={v.url + "#t=0.5"} muted playsInline preload="metadata" />;
  const y = list.find((m) => m.type === "youtube");
  if (y) return <img className={className} src={`https://img.youtube.com/vi/${y.url}/hqdefault.jpg`} alt="" loading="lazy" />;
  return <div className="ph">🛍️</div>;
}

// แกลเลอรี่หน้าสินค้า: รูป / วิดีโอ / YouTube สลับดูได้
export function Gallery({ media }) {
  const [i, setI] = useState(0);
  const list = media || [];
  if (!list.length) return <div className="gal"><div className="main" style={{ display: "grid", placeItems: "center", fontSize: 60, opacity: .4 }}>🛍️</div></div>;
  const m = list[Math.min(i, list.length - 1)];
  return (
    <div className="gal">
      <div className="main" key={i}>
        {m.type === "image" && <img src={m.url} alt="" />}
        {m.type === "video" && <video src={m.url} controls playsInline preload="metadata" />}
        {m.type === "youtube" && (
          <iframe src={`https://www.youtube-nocookie.com/embed/${m.url}`} title="video" allowFullScreen
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
        )}
      </div>
      {list.length > 1 && (
        <div className="th">
          {list.map((x, k) => (
            <button key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={"สื่อที่ " + (k + 1)}>
              {x.type === "image" && <img src={x.url} alt="" />}
              {x.type === "video" && <><video src={x.url + "#t=0.5"} muted preload="metadata" /><span className="pl">▶</span></>}
              {x.type === "youtube" && <><img src={`https://img.youtube.com/vi/${x.url}/default.jpg`} alt="" /><span className="pl">▶</span></>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ตัวเลือกอัปโหลดรูป/วิดีโอ (แอดมิน)  value = [{type,url}]
export function MediaPicker({ value, onChange, max = 8, video = true, youtube = true }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const list = value || [];
  async function pick(e) {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    let next = list;
    for (const f of files) {
      if (next.length >= max) { fail("เกินจำนวนที่กำหนด", `แนบได้ไม่เกิน ${max} ไฟล์`); break; }
      try { const r = await upload(f); next = [...next, { type: r.type, url: r.url }]; onChange(next); }
      catch (x) { fail("อัปโหลดไม่สำเร็จ", `${f.name}: ${x.message}`); }
    }
    setBusy(false);
  }
  async function addYt() {
    const v = await askText("ลิงก์ YouTube", "https://www.youtube.com/watch?v=...");
    if (!v) return;
    const id = ytId(v);
    if (!id) return fail("ลิงก์ไม่ถูกต้อง", "วางลิงก์วิดีโอ YouTube");
    onChange([...list, { type: "youtube", url: id }]);
  }
  const move = (k) => { const a = [...list]; [a[k - 1], a[k]] = [a[k], a[k - 1]]; onChange(a); };
  return (
    <div>
      <div className="mp">
        {list.map((m, k) => (
          <div className="tile" key={m.url + k}>
            {m.type === "image" && <img src={m.url} alt="" />}
            {m.type === "video" && <video src={m.url + "#t=0.5"} muted preload="metadata" />}
            {m.type === "youtube" && <img src={`https://img.youtube.com/vi/${m.url}/default.jpg`} alt="" />}
            {m.type !== "image" && <span className="kind">▶</span>}
            <button type="button" className="x" onClick={() => onChange(list.filter((_, j) => j !== k))} aria-label="ลบ">✕</button>
            {k > 0 && <button type="button" className="lf" onClick={() => move(k)}>◀ เลื่อน</button>}
          </div>
        ))}
        {list.length < max && (
          <button type="button" className="add" disabled={busy} onClick={() => ref.current.click()}>
            {busy ? "กำลังอัปโหลด…" : <>＋<br />{video ? "รูป/วิดีโอ" : "รูปภาพ"}</>}
          </button>
        )}
        {youtube && list.length < max && <button type="button" className="add" onClick={addYt}>▶<br />YouTube</button>}
      </div>
      <input ref={ref} type="file" hidden multiple={max > 1}
        accept={video ? "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" : "image/png,image/jpeg,image/gif,image/webp"} onChange={pick} />
      <p className="hint">{video ? "รูป ≤ 8 MB · วิดีโอ MP4/WEBM ≤ 60 MB · " : "รูป ≤ 8 MB · "}รูปแรกเป็นภาพปก</p>
    </div>
  );
}
