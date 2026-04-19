import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserCog,
  WifiOff,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { useSettingsDiagnostics } from "../hooks/useSettingsDiagnostics";
import type { ApiStatus } from "../hooks/useApiStatus";

interface Props {
  apiStatus: ApiStatus;
}

const stateStyles = {
  connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  checking: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  unconfigured: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  mock: "border-slate-700 bg-slate-900/80 text-slate-200",
};

const authModeLabels = {
  "api-token": "API token",
  "user-login": "User login",
  unconfigured: "Nao configurado",
};

function SettingsPage({ apiStatus }: Props) {
  const { runtime, loading, error, data, lastUpdated, refresh } =
    useSettingsDiagnostics(apiStatus);

  const readinessChecks = useMemo(
    () => [
      {
        label: "Endpoint configurado",
        ok: runtime.rawBaseUrl !== "Nao configurado",
        value: runtime.rawBaseUrl,
      },
      {
        label: "Autenticacao disponivel",
        ok: runtime.authMode !== "unconfigured",
        value: authModeLabels[runtime.authMode],
      },
      {
        label: "Conexao validada",
        ok: apiStatus.state === "connected",
        value: apiStatus.message,
      },
      {
        label: "Diagnostico ao vivo",
        ok: Boolean(data),
        value: data
          ? `Hosts ${data.hostCount} | Problemas ${data.problemCount}`
          : "Aguardando consulta em tempo real",
      },
    ],
    [apiStatus.message, apiStatus.state, data, runtime.authMode, runtime.rawBaseUrl],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Settings
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Diagnostico da integracao Zabbix
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Painel operacional para validar endpoint, modo de autenticacao,
              contagens em tempo real e a saude da conexao usada pelo frontend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                stateStyles[apiStatus.state]
              }`}
            >
              {apiStatus.state === "connected" ? (
                <ShieldCheck size={16} />
              ) : (
                <WifiOff size={16} />
              )}
              {apiStatus.state === "connected"
                ? "Conectado"
                : apiStatus.state === "checking"
                  ? "Verificando"
                  : apiStatus.state === "unconfigured"
                    ? "Nao configurado"
                    : "Sem conexao"}
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={loading || apiStatus.state !== "connected"}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Atualizar diagnostico
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Estado da conexao
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-100">
            {apiStatus.state === "connected"
              ? "Online"
              : apiStatus.state === "checking"
                ? "Checking"
                : apiStatus.state === "unconfigured"
                  ? "Pendente"
                  : "Erro"}
          </p>
          <p className="mt-2 text-sm text-slate-400">{apiStatus.message}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Modo de autenticacao
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-100">
            {authModeLabels[runtime.authMode]}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {runtime.hasRedundantAuthConfig
              ? "Token e user/password presentes. O fluxo efetivo usa user.login."
              : runtime.authMode === "api-token"
                ? "Cabecalhos de token habilitados no frontend."
                : runtime.authMode === "user-login"
                  ? "Sessao obtida via user.login."
                  : "Nenhuma credencial valida detectada."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Hosts ativos
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-100">
            {data?.hostCount ?? "--"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Contagem retornada por `host.get` com `status = 0`.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Alarmes High/Disaster
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-100">
            {data?.problemCount ?? "--"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Contagem operacional de `problem.get` com severidades 4 e 5.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <Wrench className="text-slate-400" size={18} />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Runtime
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">
                Configuracao efetiva do frontend
              </h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Base URL informada
              </p>
              <p className="mt-2 break-all text-sm text-slate-200">
                {runtime.rawBaseUrl}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                URL normalizada
              </p>
              <p className="mt-2 break-all text-sm text-slate-200">
                {runtime.normalizedBaseUrl}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Endpoint usado nas requisicoes
              </p>
              <p className="mt-2 break-all text-sm text-slate-200">
                {runtime.requestBaseUrl}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Ambiente
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {runtime.environment} {runtime.usesProxy ? "| proxy /api" : "| direto"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {runtime.authMode === "user-login" ? (
                <UserCog size={16} />
              ) : (
                <KeyRound size={16} />
              )}
              <span>Resumo de autenticacao</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Token
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {runtime.hasToken ? "Presente" : "Ausente"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Usuario
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {runtime.hasUser ? "Presente" : "Ausente"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Password
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {runtime.hasPassword ? "Presente" : "Ausente"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Diagnostico
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Sinais operacionais
          </h3>

          <div className="mt-6 space-y-4">
            {readinessChecks.map((check) => (
              <div
                key={check.label}
                className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4"
              >
                <div className="flex items-start gap-3">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                  ) : (
                    <AlertTriangle className="mt-0.5 text-amber-300" size={18} />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {check.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{check.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Ultima coleta
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {lastUpdated ?? "Nenhuma coleta concluida ainda"}
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Telemetria
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Resultado da consulta ao vivo
          </h3>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
              Atualizando diagnostico da integracao...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Falha ao executar o diagnostico ao vivo</span>
              </div>
              <p className="mt-3 text-xs text-rose-200">{error}</p>
            </div>
          ) : apiStatus.state !== "connected" ? (
            <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
              A consulta ao vivo depende de conexao valida com o Zabbix.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Versao do Zabbix
                </p>
                <p className="mt-4 text-3xl font-semibold text-slate-100">
                  {data?.version ?? "--"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Eventos High/Disaster
                </p>
                <p className="mt-4 text-3xl font-semibold text-slate-100">
                  {data?.eventCount ?? "--"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Mensagem da conexao
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {apiStatus.message}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Resultado bruto
                </p>
                <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-slate-900/80 p-3 text-xs leading-5 text-slate-300">
                  {apiStatus.details ?? "Nenhum detalhe retornado pelo teste inicial."}
                </pre>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Observacoes
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Leitura da configuracao
          </h3>

          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <p>
              O frontend usa <span className="font-medium text-slate-100">/api</span>{" "}
              em desenvolvimento e a URL normalizada em producao.
            </p>
            <p>
              As contagens de alarmes e eventos seguem o recorte operacional de
              severidades <span className="font-medium text-slate-100">High</span>{" "}
              e <span className="font-medium text-slate-100">Disaster</span>.
            </p>
            <p>
              Esta pagina nao expone token nem senha; mostra apenas presenca de
              credenciais e o modo efetivo de autenticacao.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default SettingsPage;
