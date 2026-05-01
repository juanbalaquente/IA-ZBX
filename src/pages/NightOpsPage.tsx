import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MoonStar,
  Radar,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import HelpTooltip from "../components/HelpTooltip";
import StatCard from "../components/StatCard";
import {
  analyzeNightOps,
  generateShiftReport,
  getLatestShiftReport,
  getNightOpsHistory,
  getNightOpsStatus,
} from "../services/nightOpsClient";
import type {
  NightOpsHistoryItem,
  NightOpsIncident,
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

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Evidencias
          </p>
          <div className="mt-2 space-y-2">
            {incident.evidence.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Acoes recomendadas
          </p>
          <div className="mt-2 space-y-2">
            {incident.recommendedActions.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Mensagem interna
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {incident.internalMessage}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Mensagem ao cliente
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {incident.customerMessage}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Escalonamento
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {incident.escalation.required
            ? `${incident.escalation.target}: ${incident.escalation.reason}`
            : incident.escalation.reason}
        </p>
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
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const loadSideData = async () => {
    const [historyResponse, latestReportResponse] = await Promise.all([
      getNightOpsHistory(),
      getLatestShiftReport(),
    ]);

    setHistory(historyResponse.items);
    setLatestStoredReport(latestReportResponse);
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
      value: status.generatedAt ? new Date(status.generatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }) : "--:--",
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

      <section className="grid gap-4 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-10 text-center text-slate-400">
            Carregando status do NightOps...
          </div>
        ) : (
          metrics.map((item) => <StatCard key={item.title} item={item} />)
        )}
      </section>

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
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId(expanded ? null : item.id)
                        }
                        className="flex w-full items-start justify-between gap-4 text-left"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs ${severityStyles[item.severity]}`}>
                              {item.severity}
                            </span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyles[item.status]}`}>
                              {item.status}
                            </span>
                            {item.escalation.required ? (
                              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                                Escalonamento
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-slate-100">
                            {item.title}
                          </h4>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(item.generatedAt)}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp size={16} className="mt-1 text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="mt-1 text-slate-400" />
                        )}
                      </button>

                      {expanded ? (
                        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                          <p className="text-sm text-slate-300">{item.impact}</p>
                          <p className="text-sm text-slate-400">
                            {item.escalation.required
                              ? `${item.escalation.target}: ${item.escalation.reason}`
                              : item.escalation.reason}
                          </p>
                          <div className="space-y-2">
                            {item.recommendedActions.slice(0, 3).map((action) => (
                              <div
                                key={action}
                                className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
                              >
                                {action}
                              </div>
                            ))}
                          </div>
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
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Ultima analise
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {formatDateTime(status.generatedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Ruido ignorado
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {status.summary.ignoredNoise} evento(s)
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Recomendacoes de escalonamento
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {status.summary.escalationRecommended} incidente(s)
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Relatorio
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  Passagem de turno
                </h3>
              </div>
            </div>

            {!report ? (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
                Gere o relatorio para obter o texto pronto de handover do turno noturno.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Periodo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {formatDateTime(report.period.start)} ate {formatDateTime(report.period.end)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Resumo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {report.summary}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Handover
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {report.handoverText}
                  </p>
                </div>
                <div className="space-y-2">
                  {report.recommendations.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-300" />
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Ultimo relatorio de turno
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  Persistido em arquivo
                </h3>
              </div>
            </div>

            {!latestStoredReport ? (
              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
                Nenhum relatorio salvo no historico ainda.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Periodo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {formatDateTime(latestStoredReport.period.start)} ate{" "}
                    {formatDateTime(latestStoredReport.period.end)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Resumo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {latestStoredReport.summary}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Passagem de turno
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {latestStoredReport.handoverText}
                  </p>
                </div>
                <div className="space-y-2">
                  {latestStoredReport.recommendations.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300"
                    >
                      {item}
                    </div>
                  ))}
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
