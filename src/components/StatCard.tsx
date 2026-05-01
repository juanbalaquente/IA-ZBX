import type { StatMetric } from "../types";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Radar,
  ShieldCheck,
  Server,
  Wifi,
} from "lucide-react";

interface Props {
  item: StatMetric;
}

const iconMap = {
  Activity,
  AlertTriangle,
  Clock3,
  Radar,
  ShieldCheck,
  Server,
  Wifi,
};

function StatCard({ item }: Props) {
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Activity;

  const toneStyles = {
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-rose-300",
    info: "text-sky-300",
  };

  return (
    <article className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            {item.title}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">
            {item.value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 ${toneStyles[item.tone]}`}
        >
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{item.delta}</p>
    </article>
  );
}

export default StatCard;
