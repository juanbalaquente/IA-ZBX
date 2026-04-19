import { Info, ServerCog, ShieldCheck, WifiOff } from "lucide-react";
import type { ApiStatus } from "../hooks/useApiStatus";

interface Props {
  apiStatus: ApiStatus;
}

function ZabbixStatusPanel({ apiStatus }: Props) {
  const versionInfo = (() => {
    if (!apiStatus.details) return null;
    try {
      const parsed = JSON.parse(apiStatus.details);
      return parsed?.result ? String(parsed.result) : apiStatus.details;
    } catch {
      return apiStatus.details;
    }
  })();

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Conexão Zabbix
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Status da integração
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
          {apiStatus.state === "connected" ? (
            <ShieldCheck size={16} />
          ) : (
            <WifiOff size={16} />
          )}
          {apiStatus.state === "connected"
            ? "Conectado"
            : apiStatus.state === "checking"
              ? "Verificando"
              : "Sem conexão"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Endpoint
          </p>
          <p className="mt-2 text-sm break-all text-slate-200">
            {apiStatus.baseUrl}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Resumo
          </p>
          <p className="mt-2 text-sm text-slate-200">{apiStatus.message}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Info size={16} />
          <span>Resposta bruta do endpoint</span>
        </div>
        <pre className="mt-3 max-h-56 overflow-auto rounded-3xl bg-slate-900/90 p-4 text-xs leading-5 text-slate-300">
          {versionInfo ?? "Nenhuma resposta disponível ainda."}
        </pre>
      </div>

      {apiStatus.state === "connected" && versionInfo ? (
        <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="flex items-center gap-2">
            <ServerCog size={16} />
            <span>Versão do Zabbix detectada: {versionInfo}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ZabbixStatusPanel;
