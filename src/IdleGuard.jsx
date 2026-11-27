import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ping } from "./api.js";

// นับถอยหลังฝั่งหน้าเว็บ (server เป็นตัวบังคับจริง) ถ้าไม่แตะหน้าจอครบกำหนดจะกลับไปหน้า login
export default function IdleGuard({ seconds = 900 }) {
  const nav = useNavigate();
  const last = useRef(Date.now());
  const pinged = useRef(Date.now());
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const ms = seconds * 1000;
    const bump = () => {
      last.current = Date.now();
      if (Date.now() - pinged.current > 30000) { pinged.current = Date.now(); ping(); }
    };
    const ev = ["pointerdown", "keydown", "scroll", "touchstart"];
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const l = Math.ceil((ms - (Date.now() - last.current)) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(t); nav("/login?timeout=1", { replace: true }); }
    }, 1000);
    return () => { ev.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, [seconds]);

  if (left > 60) return null;
  return (
    <div className="idle">
      ไม่มีการใช้งาน จะออกจากระบบใน {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} · แตะที่ใดก็ได้เพื่อใช้งานต่อ
    </div>
  );
}
