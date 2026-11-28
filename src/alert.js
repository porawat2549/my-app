import Swal from "sweetalert2";

const base = Swal.mixin({
  background: "#0f1626", color: "#e7ecf6", heightAuto: false,
  confirmButtonColor: "#38bdf8", cancelButtonColor: "#334155", denyButtonColor: "#334155",
});

export const toast = (title, icon = "success") =>
  base.fire({ toast: true, position: "top", icon, title, showConfirmButton: false, timer: 2600, timerProgressBar: true });
export const ok = (title, text) => base.fire({ icon: "success", title, text, confirmButtonText: "ตกลง" });
export const fail = (title, text) => base.fire({ icon: "error", title, text, confirmButtonText: "ตกลง" });

export async function ask(title, text, confirmText = "ยืนยัน", danger = false) {
  const r = await base.fire({
    icon: danger ? "warning" : "question", title, text, showCancelButton: true, reverseButtons: true,
    confirmButtonText: confirmText, cancelButtonText: "ยกเลิก", confirmButtonColor: danger ? "#dc2626" : "#38bdf8",
  });
  return r.isConfirmed;
}
export async function askNumber(title, label, value) {
  const r = await base.fire({
    title, input: "number", inputLabel: label, inputValue: value, showCancelButton: true, reverseButtons: true,
    confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", inputAttributes: { min: 0, step: "any" },
    inputValidator: (v) => (v === "" || isNaN(+v) || +v < 0 ? "กรอกตัวเลขที่ถูกต้อง" : undefined),
  });
  return r.isConfirmed ? Number(r.value) : null;
}
export async function askLines(title, placeholder) {
  const r = await base.fire({
    title, input: "textarea", inputPlaceholder: placeholder, inputAttributes: { rows: 7 },
    showCancelButton: true, reverseButtons: true, confirmButtonText: "เพิ่ม", cancelButtonText: "ยกเลิก",
    inputValidator: (v) => (!v.trim() ? "กรอกอย่างน้อย 1 รายการ" : undefined),
  });
  return r.isConfirmed ? r.value.split("\n").map((s) => s.trim()).filter(Boolean) : null;
}
export async function askText(title, placeholder, confirmText = "ตกลง") {
  const r = await base.fire({
    title, input: "text", inputPlaceholder: placeholder, showCancelButton: true, reverseButtons: true,
    confirmButtonText: confirmText, cancelButtonText: "ยกเลิก",
    inputValidator: (v) => (!v.trim() ? "กรุณากรอกข้อมูล" : undefined),
  });
  return r.isConfirmed ? r.value.trim() : null;
}
export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("คัดลอกแล้ว"); }
  catch { toast("คัดลอกไม่ได้ ลองกดค้างที่ข้อความ", "error"); }
}
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export { Swal, base };
