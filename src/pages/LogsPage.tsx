import { Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useEvents } from "../hooks/useEvents";
import type { EventItem } from "../types";

const severityFilters = ["Todos", "Disaster", "High"] as const;

const severityStyles = {
  Info: "bg-slate-800 text-slate-300",
  Aviso: "bg-amber-500/15 text-amber-300",
  High: "bg-amber-500/15 text-amber-300",
  Disaster: "bg-rose-500/15 text-rose-300",
};

function getEventKey(event: EventItem) {
  return event.id ?? `${event.time}-${event.type}-${event.message}`;
}

function getEventHost(event: EventItem) {
  return event.host ?? "Sem host";
}

function LogsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] =
    useState<(typeof severityFilters)[number]>("Todos");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { events, loading, error, retry } = useEvents();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = [
        getEventHost(event),
        event.message,
        event.type,
      ].some((value) => value.toLowerCase().includes(search.toLowerCase()));
      const matchesSeverity =
        severity === "Todos" || event.severity === severity;

      return matchesSearch && matchesSeverity;
    });
  }, [events, search, severity]);

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedEventId) {
      setSelectedEventId(getEventKey(filteredEvents[0]));
      return;
    }

    if (!filteredEvents.some((event) => getEventKey(event) === selectedEventId)) {
      setSelectedEventId(getEventKey(filteredEvents[0]));
    }
  }, [filteredEvents, selectedEventId]);

  const selectedEvent = filteredEvents.find(
    (event) => getEventKey(event) === selectedEventId,
  );
  const disasterCount = events.filter(
    (event) => event.severity === "Disaster",
  ).length;
  const highCount = events.filter((event) => event.severity === "High").length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Logs
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Historico operacional de eventos
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Linha de eventos High e Disaster com busca, filtros e detalhe
              operacional baseado em `event.get`.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {events.length}
              </p>
            </div>
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">
                Disaster
              </p>
              <p className="mt-3 text-3xl font-semibold text-rose-100">
                {disasterCount}
              </p>
            </div>
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                High
              </p>
              <p className="mt-3 text-3xl font-semibold text-amber-100">
                {highCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-xl">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por host, mensagem ou tipo do evento"
              className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {severityFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSeverity(filter)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  severity === filter
                    ? "bg-noc-accent text-slate-950"
                    : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          {filteredEvents.length} de {events.length} eventos exibidos
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} />
              <p>Falha ao carregar os logs operacionais.</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-rose-500 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/30"
            >
              Tentar novamente
            </button>
          </div>
          <p className="mt-3 text-xs text-rose-200">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Eventos
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">
                Linha de eventos
              </h3>
            </div>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              High + Disaster
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
              Carregando eventos do Zabbix...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="px-3 py-3">Severidade</th>
                    <th className="px-3 py-3">Host</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Mensagem</th>
                    <th className="px-3 py-3">Horario</th>
                    <th className="px-3 py-3">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Nenhum evento encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                      <tr
                        key={getEventKey(event)}
                        className={`transition-colors hover:bg-slate-950/60 ${
                          selectedEventId === getEventKey(event)
                            ? "bg-slate-950/80"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-4 font-semibold">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs ${
                              severityStyles[event.severity]
                            }`}
                          >
                            {event.severity}
                          </span>
                        </td>
                        <td className="px-3 py-4">{getEventHost(event)}</td>
                        <td className="px-3 py-4">{event.type}</td>
                        <td className="px-3 py-4 text-slate-300">
                          {event.message}
                        </td>
                        <td className="px-3 py-4">{event.time}</td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(getEventKey(event))}
                            className="rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                          >
                            Ver detalhe
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Detalhe
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Contexto do evento
          </h3>

          {!selectedEvent ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
              Selecione um evento para visualizar o detalhamento operacional.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Host
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {getEventHost(selectedEvent)}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Severidade
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs ${
                      severityStyles[selectedEvent.severity]
                    }`}
                  >
                    {selectedEvent.severity}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Tipo
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedEvent.type}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Horario
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedEvent.time}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Mensagem
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {selectedEvent.message}
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default LogsPage;
