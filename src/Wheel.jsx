const COLORS = ["#6d4aff", "#0ea5e9", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#ca8a04", "#4f46e5"];
const P = (a, r) => { const t = (a * Math.PI) / 180; return [150 + r * Math.sin(t), 150 - r * Math.cos(t)]; };
const LAMPS = Array.from({ length: 24 }, (_, i) => P(i * 15, 143));

// วาดอย่างเดียว: deg = มุมหมุนสะสม, anim = เปิดอนิเมชัน (รางวัลที่มีรูปจะแสดงรูปแทนอีโมจิ)
export default function Wheel({ prizes, deg, anim }) {
  const n = prizes.length, seg = 360 / Math.max(n, 1);
  const sz = n > 10 ? 32 : 44, cy = 52;
  return (
    <div className={"wheel-wrap" + (anim ? " spinning" : "")}>
      <div className="pointer" />
      <svg viewBox="0 0 300 300"
        style={{ transform: `rotate(${deg}deg)`, transition: anim ? "transform 5s cubic-bezier(.12,.7,.1,1)" : "none" }}>
        <defs>
          <clipPath id="wcp"><circle cx="150" cy={cy} r={sz / 2} /></clipPath>
        </defs>
        <circle cx="150" cy="150" r="147" fill="#0b1222" stroke="#fbbf24" strokeWidth="4" />
        {n === 0 && <text x="150" y="155" textAnchor="middle" fill="#8b98b5" fontSize="14">ยังไม่มีรางวัล</text>}
        {n === 1 && <circle cx="150" cy="150" r="134" fill={COLORS[0]} />}
        {n > 1 && prizes.map((p, i) => {
          const [x1, y1] = P(i * seg, 134), [x2, y2] = P((i + 1) * seg, 134);
          return <path key={p.id} d={`M150 150 L${x1} ${y1} A134 134 0 ${seg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
            fill={COLORS[i % COLORS.length]} stroke="#0b1222" strokeWidth="2" />;
        })}
        {prizes.map((p, i) => (
          <g key={"t" + p.id} transform={`rotate(${(i + 0.5) * seg} 150 150)`}>
            {p.image ? (<>
              <circle cx="150" cy={cy} r={sz / 2 + 2} fill="#fff" opacity=".9" />
              <image href={p.image} x={150 - sz / 2} y={cy - sz / 2} width={sz} height={sz} clipPath="url(#wcp)" preserveAspectRatio="xMidYMid slice" />
            </>) : (
              <text x="150" y={cy + 8} textAnchor="middle" fontSize={n > 10 ? 18 : 24}>{p.emoji}</text>
            )}
            {n <= 10 && <text x="150" y={cy + sz / 2 + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
              {p.name.length > 8 ? p.name.slice(0, 7) + "…" : p.name}</text>}
          </g>
        ))}
        {LAMPS.map(([x, y], i) => <circle key={i} className={"lamp" + (i % 2 ? " b" : "")} cx={x} cy={y} r="2.6" style={{ animationDelay: i % 2 ? ".17s" : "0s" }} />)}
      </svg>
      <div className="hub">🎡</div>
    </div>
  );
}
