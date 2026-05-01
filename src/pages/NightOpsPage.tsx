import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MoonStar,
  Radar,
  RefreshCcw,
  Save,
  Settings2,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import NightOpsShadowPanel from "../components/NightOpsShadowPanel";
import HelpTooltip from "../components/HelpTooltip";
import StatCard from "../components/StatCard";
import {
  analyzeNightOps,
  generateShiftReport,
  getLatestShiftReport,
  getNightOpsConfig,
  getNightOpsHistory,
  getNightOpsStatus,
  getShadowDecisions,
  getShadowMetrics,
  updateNightOpsConfig,
  updateShadowDecisionValidation,
} from "../services/nightOpsClient";
import type {
  NightOpsConfig,
  NightOpsHistoryItem,
  NightOpsIncident,
  NightOpsShadowDecision,
  NightOpsShadowMetrics,
  NightOpsShadowValidationStatus,
  NightOpsShiftReport,
  NightOpsStatus,
  NightOpsStoredShiftReport,
  StatMetric,
} from "../types";

const severityStyles = {
  low: "bg-slate-800 text-slate-300",
  medium: "bg-sky-500/15 text-sky-300",
  high: "bg-amber-500/15 text-amber-300",
  critical: "bg-rose-500/15 text-rose-300",
};

const statusStyles = {
  active: "bg-rose-500/10 text-rose-200",
  monitoring: "bg-amber-500/10 text-amber-200",
  resolved: "bg-emerald-500/10 text-emerald-200",
  ignored: "bg-slate-800 text-slate-300",
};

const emptyStatus: NightOpsStatus = {
  status: "ok",
  generatedAt: null,
  summary: {
    activeProblems: 0,
    criticalIncidents: 0,
    warningIncidents: 0,
    ignoredNoise: 0,
    escalationRecommended: 0,
  },
  incidents: [],
  shadowDecisions: [],
};

const emptyConfig: NightOpsConfig = {
  defaultStartHour: 19,
  defaultEndHour: 7,
  timezone: "America/Sao_Paulo",
  minDurationMinutes: 5,
  correlationWindowMinutes: 10,
  sameGroupAffectedHostsThreshold: 5,
  criticalKeywords: ["OLT", "POP", "BGP", "BACKBONE", "CORE", "TRANSPORTE", "ENLACE"],
  autoEscalationEnabled: false,
  shadowModeEnabled: true,
  shadowModeRetentionDays: 30,
};

const emptyShadowMetrics: NightOpsShadowMetrics = {
  total: 0,
  pending: 0,
  correct: 0,
  falsePositive: 0,
  falseNegative: 0,
  partiallyCorrect: 0,
  wouldNotify: 0,
  recommendEscalation: 0,
  monitor: 0,
  ignore: 0,
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem analise ainda";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function IncidentCard({ incident }: { incident: NightOpsIncident }) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityStyles[incident.severity]}`}>
              {incident.severity}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyles[incident.status]}`}>
              {incident.status}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
              {incident.durationMinutes} min
            </span>
            {incident.escalation.required ? (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                Escalonamento recomendado
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-100">
            {incident.title}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Inicio: {formatDateTime(incident.startedAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Confianca
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {Math.round((incident.confidence || 0) * 100)}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Impacto
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {incident.impact}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Causa provavel
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {incident.probableCause}
          </p>
        </div>
      </div>
    </article>
  );
}

function NightOpsPage() {
  const [status, setStatus] = useState<NightOpsStatus>(emptyStatus);
  const [report, setReport] = useState<NightOpsShiftReport | null>(null);
  const [latestStoredReport, setLatestStoredReport] =
    useState<NightOpsStoredShiftReport | null>(null);
  const [history, setHistory] = useState<NightOpsHistoryItem[]>([]);
  const [config, setConfig] = useState<NightOpsConfig>(emptyConfig);
  const [keywordsInput, setKeywordsInput] = useState(
    emptyConfig.criticalKeywords.join(", "),
  );
  const [shadowDecisions, setShadowDecisions] = useState<NightOpsShadowDecision[]>([]);
  const [shadowMetrics, setShadowMetrics] =
    useState<NightOpsShadowMetrics>(emptyShadowMetrics);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const loadSideData = async () => {
    const [
      historyResponse,
      latestReportResponse,
      configResponse,
      shadowResponse,
      shadowMetricsResponse,
    ] = await Promise.all([
      getNightOpsHistory(),
      getLatestShiftReport(),
      getNightOpsConfig(),
      getShadowDecisions(),
      getShadowMetrics(),
    ]);

    setHistory(historyResponse.items);
    setLatestStoredReport(latestReportResponse);
    setConfig(configResponse.config);
    setKeywordsInput(configResponse.config.criticalKeywords.join(", "));
    setShadowDecisions(shadowResponse.items);
    setShadowMetrics(shadowMetricsResponse.metrics);
  };

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const [statusResponse] = await Promise.all([
          getNightOpsStatus(),
          loadSideData(),
        ]);
        setStatus(statusResponse);
      } catch (loadError) {
        setError((loadError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleAnalyzeNow = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeNightOps();
      setStatus(result);
      await loadSideData();
    } catch (analysisError) {
      setError((analysisError as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      setError(null);
      const generatedReport = await generateShiftReport();
      setReport(generatedReport);
      await loadSideData();
    } catch (reportError) {
      setError((reportError as Error).message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleConfigNumberChange =
    (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => {
      setConfig((current) => ({
        ...current,
        [field]: Number(event.target.value),
      }));
    };

  const handleConfigTextChange =
    (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => {
      setConfig((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleConfigCheckboxChange =
    (field: keyof NightOpsConfig) => (event: ChangeEvent<HTMLInputElement>) => {
      setConfig((current) => ({
        ...current,
        [field]: event.target.checked,
      }));
    };

  const handleSaveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setConfigSaving(true);
      setConfigMessage(null);
      setError(null);
      const payload: NightOpsConfig = {
        ...config,
        criticalKeywords: keywordsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        autoEscalationEnabled: false,
      };
      const response = await updateNightOpsConfig(payload);
      setConfig(response.config);
      setKeywordsInput(response.config.criticalKeywords.join(", "));
      setConfigMessage("Configuracoes do Sentinel salvas.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleValidateShadowDecision = async (
    id: string,
    payload: {
      status: Exclude<NightOpsShadowValidationStatus, "pending">;
      validatedBy?: string;
      notes?: string;
    },
  ) => {
    await updateShadowDecisionValidation(id, payload);
    await loadSideData();
  };

  const metrics: StatMetric[] = [
    {
      title: "Sistema operacional",
      value: status.status === "ok" ? "Ativo" : "Indefinido",
      delta: status.analysisSource
        ? `Analise ${status.analysisSource}`
        : "Modo deterministico disponivel",
      icon: "ShieldCheck",
      tone: "success",
    },
    {
      title: "Ultima analise",
      value: status.generatedAt
        ? new Date(status.generatedAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--",
      delta: formatDateTime(status.generatedAt),
      icon: "Clock3",
      tone: "info",
    },
    {
      title: "Alarmes ativos",
      value: String(status.summary.activeProblems),
      delta: `${status.summary.warningIncidents} incidentes monitorados`,
      icon: "Radar",
      tone: "warning",
    },
    {
      title: "Incidentes criticos",
      value: String(status.summary.criticalIncidents),
      delta: `${status.summary.escalationRecommended} recomendam escalonamento`,
      icon: "AlertTriangle",
      tone: status.summary.criticalIncidents > 0 ? "danger" : "info",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                NOC Sentinel
              </p>
              <HelpTooltip
                label="Explicar NightOps"
                text="Modulo de analise noturna que correlaciona problemas ativos, aplica regras deterministicas e usa IA apenas para resumir e sugerir mensagens."
              />
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              NightOps / analista NOC noturno
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Consolida alarmes, correlaciona eventos e recomenda escalonamento
              sem acionar pessoas automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAnalyzeNow}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} />
              {analyzing ? "Analisando..." : "Analisar agora"}
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="inline-flex items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ClipboardList size={16} />
              {reportLoading ? "Gerando..." : "Gerar relatorio do turno"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          {error}
        </section>
      ) : null}

      {configMessage ? (
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {configMessage}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-10 text-center text-slate-400">
            Carregando status do NightOps...
          </div>
        ) : (
          metrics.map((item) => <StatCard key={item.title} item={item} />)
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-sky-300" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Configuracoes do Sentinel
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">
              Regras operacionais ajustaveis
            </h3>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSaveConfig}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Horario inicial do turno</span>
              <input type="number" min={0} max={23} value={config.defaultStartHour} onChange={handleConfigNumberChange("defaultStartHour")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Horario final do turno</span>
              <input type="number" min={0} max={23} value={config.defaultEndHour} onChange={handleConfigNumberChange("defaultEndHour")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Timezone</span>
              <input type="text" value={config.timezone} onChange={handleConfigTextChange("timezone")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Duracao minima do incidente</span>
              <input type="number" min={1} value={config.minDurationMinutes} onChange={handleConfigNumberChange("minDurationMinutes")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Janela de correlacao</span>
              <input type="number" min={1} value={config.correlationWindowMinutes} onChange={handleConfigNumberChange("correlationWindowMinutes")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Limite de hosts no mesmo grupo</span>
              <input type="number" min={1} value={config.sameGroupAffectedHostsThreshold} onChange={handleConfigNumberChange("sameGroupAffectedHostsThreshold")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Retencao do Shadow Mode (dias)</span>
              <input type="number" min={1} max={365} value={config.shadowModeRetentionDays} onChange={handleConfigNumberChange("shadowModeRetentionDays")} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <input type="checkbox" checked={config.shadowModeEnabled} onChange={handleConfigCheckboxChange("shadowModeEnabled")} className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
              <span className="text-sm text-slate-200">Shadow Mode habilitado</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Palavras-chave criticas</span>
            <input type="text" value={keywordsInput} onChange={(event) => setKeywordsInput(event.target.value)} placeholder="OLT, POP, BGP, BACKBONE, CORE" className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" />
          </label>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-100">Auto escalation</p>
                <p className="mt-1 text-xs text-amber-200">
                  Visivel para configuracao futura, mas bloqueado nesta versao. Nenhum acionamento automatico sera executado.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" checked={false} disabled readOnly className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
                Desativado
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={configSaving} className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={16} />
              {configSaving ? "Salvando..." : "Salvar configuracoes"}
            </button>
          </div>
        </form>
      </section>

      <NightOpsShadowPanel
        enabled={config.shadowModeEnabled}
        metrics={shadowMetrics}
        decisions={shadowDecisions}
        onValidate={handleValidateShadowDecision}
      />

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <MoonStar size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Incidentes correlacionados
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  Fila consolidada do turno
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {status.incidents.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-slate-400">
                  Nenhum incidente correlacionado disponivel. Execute a analise para montar a fila NightOps.
                </div>
              ) : (
                status.incidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Historico recente
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  Incidentes persistidos
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {history.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
                  Nenhum incidente salvo em historico ainda.
                </div>
              ) : (
                history.slice(0, 10).map((item) => {
                  const expanded = expandedHistoryId === item.id;
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <button type="button" onClick={() => setExpandedHistoryId(expanded ? null : item.id)} className="flex w-full items-start justify-between gap-4 text-left">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs ${severityStyles[item.severity]}`}>{item.severity}</span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyles[item.status]}`}>{item.status}</span>
                            {item.escalation.required ? (
                              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                                Escalonamento
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-slate-100">{item.title}</h4>
                          <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.generatedAt)}</p>
                        </div>
                        {expanded ? <ChevronUp size={16} className="mt-1 text-slate-400" /> : <ChevronDown size={16} className="mt-1 text-slate-400" />}
                      </button>
                      {expanded ? (
                        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                          <p className="text-sm text-slate-300">{item.impact}</p>
                          <p className="text-sm text-slate-400">
                            {item.escalation.required ? `${item.escalation.target}: ${item.escalation.reason}` : item.escalation.reason}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Status rapido
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  Estado operacional
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ultima analise</p>
                <p className="mt-2 text-sm text-slate-200">{formatDateTime(status.generatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ruido ignorado</p>
                <p className="mt-2 text-sm text-slate-200">{status.summary.ignoredNoise} evento(s)</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recomendacoes de escalonamento</p>
                <p className="mt-2 text-sm text-slate-200">{status.summary.escalationRecommended} incidente(s)</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Ultimo relatorio de turno</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">Persistido em arquivo</h3>
              </div>
            </div>
            {!latestStoredReport ? (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
                Nenhum relatorio salvo no historico ainda.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Periodo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {formatDateTime(latestStoredReport.period.start)} ate {formatDateTime(latestStoredReport.period.end)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Resumo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{latestStoredReport.summary}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Passagem de turno</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {latestStoredReport.handoverText}
                  </p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

export default NightOpsPage;
