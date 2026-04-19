import { Loader2, Server, ShieldAlert } from "lucide-react";
import type { ApiStatus } from "../hooks/useApiStatus";
import { useZabbixMetrics } from "../hooks/useZabbixMetrics";

interface Props {
  apiStatus: ApiStatus;
}

function ZabbixMetricsPanel({ apiStatus }: Props) {
  const { loading, hostCount, problemCount, error } =
    useZabbixMetrics(apiStatus);

  const statusLabel =
    apiStatus.state === "connected"
      ? loading
        ? "Carregando"
        : "Dados consultados"
      : apiStatus.state === "checking"
        ? "Aguardando conexao"
        : apiStatus.state === "unconfigured"
          ? "Nao configurado"
          : "Sem conexao";

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Dados Zabbix
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Metricas reais
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Server size={16} />
          )}
          {statusLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Hosts ativos
          </p>
          <p className="mt-4 text-4xl font-semibold text-slate-100">
            {hostCount ?? "--"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Alarmes High/Disaster
          </p>
          <p className="mt-4 text-4xl font-semibold text-slate-100">
            {problemCount ?? "--"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>Falha ao buscar dados reais</span>
          </div>
          <p className="mt-2 text-sm text-rose-200">{error}</p>
        </div>
      ) : null}
    </section>
  );
}

export default ZabbixMetricsPanel;
