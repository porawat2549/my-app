import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me } from "./api.js";

// roles: role ที่เข้าหน้านี้ได้ (ไม่ใส่ = ทุก role ที่ล็อกอินแล้ว)
export default function useAuth(roles) {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    me().then((u) => {
      if (!u) return nav("/login", { replace: true });
      if (roles && !roles.includes(u.role)) return nav("/dashboard", { replace: true });
      setUser(u);
    });
  }, []);
  return user;
}
