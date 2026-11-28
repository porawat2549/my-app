// เอฟเฟกต์กระดาษสีเมื่อชนะรางวัล/ซื้อสำเร็จ (ไม่ใช้ไลบรารี)
const COLORS = ["#7c5cff", "#22d3ee", "#fbbf24", "#f472b6", "#34d399", "#fb7185"];
export function confetti(n = 70) {
  if (typeof document === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < n; i++) {
    const e = document.createElement("i");
    e.className = "cf";
    const dur = 1.8 + Math.random() * 1.6;
    e.style.cssText = `left:${Math.random() * 100}vw;background:${COLORS[i % COLORS.length]};` +
      `--dx:${(Math.random() - 0.5) * 240}px;--rot:${Math.random() * 900 - 450}deg;` +
      `animation-duration:${dur}s;animation-delay:${Math.random() * 0.4}s`;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), (dur + 0.6) * 1000);
  }
}
