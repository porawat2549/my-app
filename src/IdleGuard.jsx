import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ping } from "./api.js";
import { Swal, base } from "./alert.js";

// เตือนด้วย SweetAlert2 ตอนเหลือ 1 นาที (server เป็นตัวบังคับหมดเวลาจริง)
export default function IdleGuard({ seconds = 900 }) {
  const nav = useNavigate();
  const last = useRef(Date.now());
  const pinged = useRef(Date.now());

  useEffect(() => {
    const ms = seconds * 1000;
    let warned = false, iv;
    const bump = () => {
      last.current = Date.now();
      if (Date.now() - pinged.current > 30000) { pinged.current = Date.now(); ping(); }
    };
    const ev = ["pointerdown", "keydown", "scroll", "touchstart"];
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const l = Math.ceil((ms - (Date.now() - last.current)) / 1000);
      if (l <= 0) { clearInterval(t); Swal.close(); nav("/login?timeout=1", { replace: true }); return; }
      if (l <= 60 && !warned) {
        warned = true;
        base.fire({
          icon: "warning", title: "ยังใช้งานอยู่ไหม?", html: "จะออกจากระบบใน <b></b> วินาที",
          timer: l * 1000, timerProgressBar: true, confirmButtonText: "ใช้งานต่อ", allowOutsideClick: false,
          didOpen: () => {
            const b = Swal.getHtmlContainer().querySelector("b");
            iv = setInterval(() => { b.textContent = Math.max(0, Math.ceil(Swal.getTimerLeft() / 1000)); }, 250);
          },
          willClose: () => clearInterval(iv),
        }).then((r) => {
          if (r.isConfirmed) { pinged.current = 0; bump(); warned = false; }
          else if (r.dismiss === Swal.DismissReason.close) warned = false;
        });
      } else if (l > 60 && warned) {
        Swal.close(); // ผู้ใช้แตะหน้าจอแล้ว ต่อเวลาให้
      }
    }, 1000);
    return () => { ev.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); clearInterval(iv); };
  }, [seconds]);
  return null;
}
