import { Settings2, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import type { ApiStatus } from "../hooks/useApiStatus";

interface Props {
  apiStatus: ApiStatus;
}

const statusStyles = {
  mock: "bg-slate-800 text-slate-300 ring-slate-700/20",
  checking: "bg-sky-500/15 text-sky-300 ring-sky-500/20",
  connected: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
  error: "bg-rose-500/15 text-rose-300 ring-rose-500/20",
  unconfigured: "bg-slate-800 text-slate-300 ring-slate-700/20",
};

const badgeStyles = statusStyles;

function Header({ apiStatus }: Props) {
  const sourceLabel =
    apiStatus.state === "connected"
      ? "Fonte API configurada"
      : apiStatus.state === "checking"
        ? "Conectando ao endpoint..."
        : apiStatus.state === "unconfigured"
          ? "API nao configurada"
          : apiStatus.state === "mock"
            ? "Modo mock"
            : "Erro na conexao";

  return (
    <header className="border-b border-slate-800 bg-noc-surface3 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            NOC AI Platform
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">
            Visao geral do sistema
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Interface de monitoramento que reune status de hosts, problemas,
            enlaces e consultas em linguagem natural.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ring-1 ring-slate-800 ${statusStyles[apiStatus.state]}`}
          >
            <Wifi size={16} />
            <span>
              {apiStatus.state === "connected"
                ? "Operacional"
                : apiStatus.state === "checking"
                  ? "Conectando"
                  : apiStatus.state === "error"
                    ? "Erro de conexao"
                    : apiStatus.state === "unconfigured"
                      ? "API nao configurada"
                      : "Modo mock"}
            </span>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800"
          >
            <Settings2 size={18} />
            Configuracoes
          </Link>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ring-1 ring-slate-700/50 ${badgeStyles[apiStatus.state]}`}
        >
          {sourceLabel}
        </span>
        <span className="text-slate-500">{apiStatus.baseUrl}</span>
      </div>
      {apiStatus.state === "error" ? (
        <div className="mt-3 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {apiStatus.message}
          {apiStatus.details ? (
            <div className="mt-1 text-xs text-rose-200">
              {apiStatus.details}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export default Header;
