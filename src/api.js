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
// ถ้าบัญชีเปิด 2FA และยังไม่ส่ง code จะได้ { need_2fa: true } (ยังไม่ล็อกอิน)
export async function login(email, password, code) {
  if (!MOCK) return http("/auth/login", "POST", { email, password, code: code || undefined });
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
export async function adminLogs(userId, limit = 300) {
  if (MOCK) return [];
  return http(`/admin/logs?limit=${limit}` + (userId ? `&user_id=${userId}` : ""));
}

// ---------- วงล้อสุ่ม / คลังของ / จัดการรางวัล (ต้องเชื่อมกับ Rust) ----------
const needServer = () => { throw new Error("ฟีเจอร์นี้ต้องเชื่อมกับเซิร์ฟเวอร์จริง (VITE_MOCK=0)"); };
export async function getPrizes() { if (MOCK) return { price: 0, prizes: [] }; return http("/prizes"); }
export async function spin() { if (MOCK) return needServer(); return http("/spin", "POST"); }
export async function inventory() { if (MOCK) return []; return http("/inventory"); }
export async function adminPrizes() { if (MOCK) return { price: 0, prizes: [] }; return http("/admin/prizes"); }
export async function addPrize(body) { if (MOCK) return needServer(); return http("/admin/prizes", "POST", body); }
export async function addStock(id, codes) { if (MOCK) return needServer(); return http(`/admin/prizes/${id}/stock`, "POST", { codes }); }
export async function setWeight(id, weight) { if (MOCK) return needServer(); return http(`/admin/prizes/${id}/weight`, "POST", { weight }); }
export async function deletePrize(id) { if (MOCK) return needServer(); return http(`/admin/prizes/${id}/delete`, "POST"); }
export async function setPrice(price) { if (MOCK) return needServer(); return http("/admin/price", "POST", { price }); }
export async function setPrizeImage(id, image) { if (MOCK) return needServer(); return http(`/admin/prizes/${id}/image`, "POST", { image }); }
// odds = [{ id, percent }] รวมต้อง 100
export async function setOdds(odds) { if (MOCK) return needServer(); return http("/admin/prizes/odds", "POST", { odds }); }

// ---------- ร้านค้า (ทุกคนดูได้ ซื้อต้องล็อกอิน) ----------
async function publicGet(path) {
  const r = await fetch("/api" + path, { credentials: "include" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
  return j;
}
export async function products() { if (MOCK) return []; return publicGet("/products"); }
export async function product(id) { if (MOCK) throw new Error("ต้องเชื่อมกับเซิร์ฟเวอร์จริง (VITE_MOCK=0)"); return publicGet("/products/" + id); }
export async function buyProduct(id) { if (MOCK) return needServer(); return http(`/products/${id}/buy`, "POST"); }
export async function adminProducts() { if (MOCK) return []; return http("/admin/products"); }
export async function addProduct(body) { if (MOCK) return needServer(); return http("/admin/products", "POST", body); }
export async function editProduct(id, body) { if (MOCK) return needServer(); return http(`/admin/products/${id}`, "POST", body); }
export async function addProductStock(id, codes) { if (MOCK) return needServer(); return http(`/admin/products/${id}/stock`, "POST", { codes }); }
export async function deleteProduct(id) { if (MOCK) return needServer(); return http(`/admin/products/${id}/delete`, "POST"); }

// อัปโหลดรูป/วิดีโอ (แอดมินเท่านั้น) คืน { url, type }
export async function upload(file) {
  if (MOCK) return needServer();
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { toLogin(); throw new Error("หมดเวลาใช้งาน"); }
  if (!r.ok) throw new Error(j.error || (r.status === 413 ? "ไฟล์ใหญ่เกินไป" : "อัปโหลดไม่สำเร็จ"));
  return j;
}

// ---------- 2FA (Google Authenticator / Authy ฯลฯ) ----------
export async function twofaSetup() { if (MOCK) return needServer(); return http("/2fa/setup", "POST"); }
export async function twofaEnable(code) { if (MOCK) return needServer(); return http("/2fa/enable", "POST", { code }); }
export async function twofaDisable(password, code) { if (MOCK) return needServer(); return http("/2fa/disable", "POST", { password, code }); }
