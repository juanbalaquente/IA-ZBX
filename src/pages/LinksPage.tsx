import { Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTriggers } from "../hooks/useTriggers";
import type { TriggerItem } from "../types";

const severityFilters = ["Todos", "Disaster", "High"] as const;
const statusFilters = ["Todos", "Enabled", "Disabled"] as const;

const severityStyles = {
  Information: "bg-slate-800 text-slate-300",
  Warning: "bg-amber-500/15 text-amber-300",
  Average: "bg-amber-500/15 text-amber-300",
  High: "bg-amber-500/15 text-amber-300",
  Disaster: "bg-rose-500/15 text-rose-300",
};

function LinksPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] =
    useState<(typeof severityFilters)[number]>("Todos");
  const [status, setStatus] =
    useState<(typeof statusFilters)[number]>("Todos");
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>(
    null,
  );
  const { triggers, loading, error, retry } = useTriggers();

  const filteredTriggers = useMemo(() => {
    return triggers
      .filter(
        (trigger) =>
          trigger.severity === "High" || trigger.severity === "Disaster",
      )
      .filter((trigger) => {
        const matchesSearch = [trigger.host, trigger.description].some((value) =>
          value.toLowerCase().includes(search.toLowerCase()),
        );
        const matchesSeverity =
          severity === "Todos" || trigger.severity === severity;
        const matchesStatus = status === "Todos" || trigger.status === status;

        return matchesSearch && matchesSeverity && matchesStatus;
      });
  }, [triggers, search, severity, status]);

  useEffect(() => {
    if (filteredTriggers.length === 0) {
      setSelectedTriggerId(null);
      return;
    }

    if (!selectedTriggerId) {
      setSelectedTriggerId(filteredTriggers[0].id);
      return;
    }

    if (!filteredTriggers.some((trigger) => trigger.id === selectedTriggerId)) {
      setSelectedTriggerId(filteredTriggers[0].id);
    }
  }, [filteredTriggers, selectedTriggerId]);

  const selectedTrigger = filteredTriggers.find(
    (trigger) => trigger.id === selectedTriggerId,
  );
  const visibleTriggers = triggers.filter(
    (trigger) => trigger.severity === "High" || trigger.severity === "Disaster",
  );
  const disasterCount = visibleTriggers.filter(
    (trigger) => trigger.severity === "Disaster",
  ).length;
  const highCount = visibleTriggers.filter(
    (trigger) => trigger.severity === "High",
  ).length;
  const enabledCount = visibleTriggers.filter(
    (trigger) => trigger.status === "Enabled",
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Enlaces
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Circuitos e triggers monitorados
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Visao operacional dos enlaces e equipamentos com triggers High e
              Disaster em aberto, usando `trigger.get` como base de monitoracao.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {visibleTriggers.length}
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
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                Enabled
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-100">
                {enabledCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full max-w-xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por host ou descricao do trigger"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </label>

            <div className="text-sm text-slate-400">
              {filteredTriggers.length} de {visibleTriggers.length} triggers
              exibidos
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatus(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    status === filter
                      ? "bg-slate-100 text-slate-950"
                      : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} />
              <p>Falha ao carregar a visao de enlaces.</p>
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
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Triggers
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">
                Fila de enlaces e circuitos
              </h3>
            </div>
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              High + Disaster
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
              Carregando triggers do Zabbix...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="px-3 py-3">Severidade</th>
                    <th className="px-3 py-3">Host</th>
                    <th className="px-3 py-3">Descricao</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTriggers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Nenhum trigger encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredTriggers.map((trigger) => (
                      <tr
                        key={trigger.id}
                        className={`transition-colors hover:bg-slate-950/60 ${
                          selectedTriggerId === trigger.id
                            ? "bg-slate-950/80"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-4 font-semibold">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs ${
                              severityStyles[trigger.severity]
                            }`}
                          >
                            {trigger.severity}
                          </span>
                        </td>
                        <td className="px-3 py-4">{trigger.host}</td>
                        <td className="px-3 py-4 text-slate-300">
                          {trigger.description}
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                            {trigger.status}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedTriggerId(trigger.id)}
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

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Detalhe
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Contexto do enlace
          </h3>

          {!selectedTrigger ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
              Selecione um trigger para visualizar o detalhamento operacional.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Host
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedTrigger.host}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Severidade
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs ${
                      severityStyles[selectedTrigger.severity]
                    }`}
                  >
                    {selectedTrigger.severity}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedTrigger.status}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Descricao
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {selectedTrigger.description}
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default LinksPage;
