import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me } from "./api.js";

// roles: role ที่เข้าหน้านี้ได้ (ไม่ใส่ = ทุก role ที่ล็อกอินแล้ว)
export default function useAuth(roles) {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    me().then((u) => {
      if (!u) return nav("/login?next=" + encodeURIComponent(location.pathname), { replace: true });
      if (roles && !roles.includes(u.role)) return nav("/", { replace: true });
      setUser(u);
    });
  }, []);
  return user;
}

// หน้าที่ผู้เยี่ยมชมดูได้ (ร้านค้า/วงล้อ): ไม่บังคับล็อกอิน
// loaded=false ตอนกำลังเช็ก, user=null ถ้าเป็นผู้เยี่ยมชม
export function useOptionalUser() {
  const [st, setSt] = useState({ user: null, loaded: false });
  useEffect(() => { me().then((u) => setSt({ user: u, loaded: true })); }, []);
  return st;
}
