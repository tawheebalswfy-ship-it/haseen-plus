import { Card } from "@/components/ui/card";

export default function ComplianceGauge({ score, label, size = "lg" }) {
  const radius = size === "lg" ? 80 : 50;
  const strokeWidth = size === "lg" ? 12 : 8;
  const circumference = 2 * Math.PI * radius;
  const progress = ((score || 0) / 100) * circumference;
  
  const getColor = (score) => {
    if (score >= 80) return { stroke: "#10b981", bg: "#d1fae5" };
    if (score >= 60) return { stroke: "#f59e0b", bg: "#fef3c7" };
    if (score >= 40) return { stroke: "#f97316", bg: "#ffedd5" };
    return { stroke: "#ef4444", bg: "#fee2e2" };
  };
  
  const colors = getColor(score);
  const center = radius + strokeWidth;
  const viewBox = `0 0 ${center * 2} ${center * 2}`;

  return (
    <Card className="p-6 bg-white border-0 shadow-sm flex flex-col items-center">
      <div className="relative">
        <svg width={center * 2} height={center * 2} viewBox={viewBox} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size === "lg" ? "text-4xl" : "text-2xl"} font-bold text-slate-900`}>
            {score || 0}%
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Score</span>
        </div>
      </div>
      {label && (
        <p className="mt-4 text-sm font-medium text-slate-700 text-center">{label}</p>
      )}
    </Card>
  );
}