import type { EventItem } from "../types";

interface Props {
  events: EventItem[];
}

const badgeStyles = {
  Info: "bg-slate-800 text-slate-300",
  Aviso: "bg-amber-500/15 text-amber-300",
  High: "bg-amber-500/15 text-amber-300",
  Disaster: "bg-rose-500/15 text-rose-300",
};

function RecentEventsPanel({ events }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Eventos recentes
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Linha de tempo operacional
          </h3>
        </div>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Últimas 24h
        </span>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center text-slate-400">
            Nenhum evento recente encontrado no Zabbix.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id ?? `${event.time}-${event.type}-${event.message}`}
              className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-100">
                  {event.time}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyles[event.severity]}`}
                >
                  {event.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{event.type}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                {event.host ?? "Sem host"}
              </p>
              <p className="mt-2 text-sm text-slate-200">{event.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default RecentEventsPanel;
