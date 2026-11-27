// MOCK=true: เก็บข้อมูลใน localStorage ทดสอบหน้าเว็บได้ก่อนมี backend
// ตั้ง VITE_MOCK=0 ตอน build เพื่อเรียก Rust จริง (เซสชันผ่าน cookie httpOnly)
const MOCK = import.meta.env.VITE_MOCK !== "0";
const K = "app_db", S = "app_session";
const pub = ({ password, ...u }) => u;
const toLogin = () => window.location.assign("/login?timeout=1");

function db() {
  try { const d = JSON.parse(localStorage.getItem(K)); if (d) return d; } catch {}
  const d = { users: [{ id: 1, email: "admin@test.com", password: "admin123", role: "admin", balance: 0 }] };
  localStorage.setItem(K, JSON.stringify(d)); return d;
}
const save = (d) => localStorage.setItem(K, JSON.stringify(d));

async function http(path, method = "GET", body) {
  const r = await fetch("/api" + path, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  // 401 นอกหน้า login/register = เซสชันหมดอายุ
  if (r.status === 401 && !path.startsWith("/auth/")) { toLogin(); throw new Error("หมดเวลาใช้งาน"); }
  if (!r.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
  return j;
}

export async function register(email, password) {
  if (!MOCK) return http("/auth/register", "POST", { email, password });
  const d = db();
  if (d.users.some((u) => u.email === email)) throw new Error("อีเมลนี้ถูกใช้แล้ว");
  const u = { id: Date.now(), email, password, role: "user", balance: 0 };
  d.users.push(u); save(d); localStorage.setItem(S, u.id); return pub(u);
}
export async function login(email, password) {
  if (!MOCK) return http("/auth/login", "POST", { email, password });
  const u = db().users.find((x) => x.email === email && x.password === password);
  if (!u) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  localStorage.setItem(S, u.id); return pub(u);
}
export async function logout() {
  if (!MOCK) { try { await http("/auth/logout", "POST"); } catch {} return; }
  localStorage.removeItem(S);
}
export async function me() {
  if (!MOCK) {
    try { const r = await fetch("/api/me", { credentials: "include" }); return r.ok ? await r.json() : null; }
    catch { return null; }
  }
  const id = localStorage.getItem(S);
  const u = db().users.find((x) => String(x.id) === id);
  return u ? pub(u) : null;
}
// ส่งสัญญาณว่ายังใช้งานอยู่ (ต่ออายุเซสชันฝั่ง server)
export async function ping() {
  if (MOCK) return;
  try { const r = await fetch("/api/me", { credentials: "include" }); if (r.status === 401) toLogin(); } catch {}
}
export async function listUsers() {
  if (!MOCK) return http("/admin/users");
  return db().users.map((u) => ({ ...pub(u), online: false, last_login: null, last_seen: null }));
}
export async function adjustBalance(id, amount) {
  if (!MOCK) return http(`/admin/users/${id}/balance`, "POST", { amount });
  const d = db(); const u = d.users.find((x) => x.id === id);
  u.balance = Math.max(0, +(u.balance + amount).toFixed(2)); save(d);
}
export async function setRole(id, role) {
  if (!MOCK) return http(`/admin/users/${id}/role`, "POST", { role });
  const d = db(); d.users.find((x) => x.id === id).role = role; save(d);
}
export async function topup(amount, file) {
  if (MOCK) { // โหมด mock ไม่ได้ตรวจสลิปจริง แค่เพิ่มยอดให้ทดสอบหน้าเว็บ
    const u = await me(); const d = db(); const x = d.users.find((v) => v.id === u.id);
    x.balance = +(x.balance + amount).toFixed(2); save(d); return { balance: x.balance };
  }
  const fd = new FormData();
  fd.append("amount", String(amount));
  fd.append("files", file);
  const r = await fetch("/api/topup", { method: "POST", credentials: "include", body: fd });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { toLogin(); throw new Error("หมดเวลาใช้งาน"); }
  if (!r.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
  return j;
}
export async function myLogs() {
  if (MOCK) return []; // โหมด mock ยังไม่มีประวัติ
  return http("/logs");
}
export async function adminLogs(userId, limit = 300) {
  if (MOCK) return [];
  return http(`/admin/logs?limit=${limit}` + (userId ? `&user_id=${userId}` : ""));
}
