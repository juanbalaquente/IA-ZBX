import { CircleHelp } from "lucide-react";

interface Props {
  label: string;
  text: string;
  side?: "left" | "right";
}

function HelpTooltip({ label, text, side = "right" }: Props) {
  const positionClass =
    side === "left"
      ? "right-0 origin-top-right"
      : "left-0 origin-top-left";

  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/80 text-slate-400 transition hover:border-cyan-400/60 hover:text-cyan-200 focus:border-cyan-400 focus:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
      >
        <CircleHelp size={14} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-8 z-30 w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs leading-5 text-slate-200 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-within:opacity-100 ${positionClass}`}
      >
        {text}
      </span>
    </span>
  );
}

export default HelpTooltip;
