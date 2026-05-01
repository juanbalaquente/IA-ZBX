import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import NightOpsAdvancedPanel from "../components/NightOpsAdvancedPanel";
import NightOpsCurrentSituationPanel from "../components/NightOpsCurrentSituationPanel";
import NightOpsOccurrencesPanel from "../components/NightOpsOccurrencesPanel";
import NightOpsRecentHistoryPanel from "../components/NightOpsRecentHistoryPanel";
import NightOpsShiftReportPanel from "../components/NightOpsShiftReportPanel";
import {
  analyzeNightOps,
  generateShiftReport,
  getLatestShiftReport,
  getNightOpsConfig,
  getNightOpsHistory,
  getNightOpsStatus,
  getShadowDecisions,
  getShadowMetrics,
  getShiftReports,
  updateNightOpsConfig,
  updateShadowDecisionValidation,
} from "../services/nightOpsClient";
import type {
  NightOpsConfig,
  NightOpsHistoryItem,
  NightOpsShadowDecision,
  NightOpsShadowMetrics,
  NightOpsShadowValidationStatus,
  NightOpsShiftReport,
  NightOpsStatus,
  NightOpsStoredShiftReport,
} from "../types";

type ReportMode =
  | "last_closed_shift"
  | "current_shift"
  | "previous_day_shift"
  | "previous_night_shift"
  | "manual";

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
  allowedHostGroups: [
    "1000-SERVIDORES",
    "10031-SPEEDNET",
    "10031-SPEEDNET/BACKBONE",
    "31002-PREFEITURA_SABARA",
    "31003-FIRETELECOM",
    "31007-AFS",
    "ZABBIX SERVERS",
  ],
  criticalKeywords: ["OLT", "POP", "BGP", "BACKBONE", "CORE", "TRANSPORTE", "ENLACE"],
  autoEscalationEnabled: false,
  includeCarryOverInMainReport: false,
  maxCarryOverItemsInReport: 5,
  carryOverMinSeverity: "critical",
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

function buildAnalysisSummaries(history: NightOpsHistoryItem[]) {
  const grouped = new Map<
    string,
    {
      id: string;
      generatedAt: string;
      title: string;
      occurrences: number;
      escalationRecommended: boolean;
      criticalCount: number;
    }
  >();

  history.forEach((item) => {
    const current = grouped.get(item.analysisId);
    if (!current) {
      grouped.set(item.analysisId, {
        id: item.analysisId,
        generatedAt: item.generatedAt,
        title: item.title,
        occurrences: 1,
        escalationRecommended: item.escalation.required,
        criticalCount: item.severity === "critical" ? 1 : 0,
      });
      return;
    }

    current.occurrences += 1;
    current.escalationRecommended =
      current.escalationRecommended || item.escalation.required;
    current.criticalCount += item.severity === "critical" ? 1 : 0;
  });

  return [...grouped.values()]
    .sort(
      (left, right) =>
        new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
    )
    .slice(0, 6);
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function toDateTimeLocalValue(value: Date) {
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatPeriodLabel(start: string, end: string) {
  return `${new Date(start).toLocaleString("pt-BR")} ate ${new Date(end).toLocaleString("pt-BR")}`;
}

function resolvePreviewPeriod(mode: ReportMode, timezone: string, manualStart: string, manualEnd: string) {
  if (mode === "manual" && manualStart && manualEnd) {
    return {
      start: new Date(manualStart).toISOString(),
      end: new Date(manualEnd).toISOString(),
    };
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  const currentDate = `${parts.year}-${parts.month}-${parts.day}`;
  const currentHour = Number(parts.hour);
  const currentNow = `${currentDate}T${parts.hour}:${parts.minute}:${parts.second}-03:00`;
  const shiftDate = (datePart: string, days: number) => {
    const base = new Date(`${datePart}T12:00:00-03:00`);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  };
  const window = (datePart: string, startHour: number, endHour: number) => {
    const start = `${datePart}T${String(startHour).padStart(2, "0")}:00:00-03:00`;
    const endDate = endHour <= startHour ? shiftDate(datePart, 1) : datePart;
    const end = `${endDate}T${String(endHour).padStart(2, "0")}:00:00-03:00`;
    return { start, end };
  };
  const previousDate = shiftDate(currentDate, -1);
  const twoDaysAgo = shiftDate(currentDate, -2);

  if (mode === "current_shift") {
    if (currentHour >= 19) {
      return { ...window(currentDate, 19, 7), end: currentNow };
    }
    if (currentHour < 7) {
      return { ...window(previousDate, 19, 7), end: currentNow };
    }
    return { ...window(currentDate, 7, 19), end: currentNow };
  }

  if (mode === "previous_day_shift") {
    return currentHour >= 19 ? window(currentDate, 7, 19) : window(previousDate, 7, 19);
  }

  if (mode === "previous_night_shift") {
    return currentHour >= 7 ? window(previousDate, 19, 7) : window(twoDaysAgo, 19, 7);
  }

  if (currentHour >= 19) {
    return window(currentDate, 7, 19);
  }
  if (currentHour >= 7) {
    return window(previousDate, 19, 7);
  }
  return window(previousDate, 7, 19);
}

function NightOpsPage() {
  const [status, setStatus] = useState<NightOpsStatus>(emptyStatus);
  const [report, setReport] = useState<NightOpsShiftReport | null>(null);
  const [latestStoredReport, setLatestStoredReport] =
    useState<NightOpsStoredShiftReport | null>(null);
  const [storedReports, setStoredReports] = useState<NightOpsStoredShiftReport[]>([]);
  const [history, setHistory] = useState<NightOpsHistoryItem[]>([]);
  const [config, setConfig] = useState<NightOpsConfig>(emptyConfig);
  const [hostGroupsInput, setHostGroupsInput] = useState(
    emptyConfig.allowedHostGroups.join("\n"),
  );
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
  const [reportMode, setReportMode] = useState<ReportMode>("last_closed_shift");
  const [manualRange, setManualRange] = useState(() => ({
    start: toDateTimeLocalValue(new Date(Date.now() - 12 * 60 * 60 * 1000)),
    end: toDateTimeLocalValue(new Date()),
  }));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const loadSideData = async () => {
    const [
      historyResponse,
      reportsResponse,
      latestReportResponse,
      configResponse,
      shadowResponse,
      shadowMetricsResponse,
    ] = await Promise.all([
      getNightOpsHistory(),
      getShiftReports(),
      getLatestShiftReport(),
      getNightOpsConfig(),
      getShadowDecisions(),
      getShadowMetrics(),
    ]);

    setHistory(historyResponse.items);
    setStoredReports(reportsResponse.items.slice(0, 6));
    setLatestStoredReport(latestReportResponse);
    setConfig(configResponse.config);
    setHostGroupsInput(configResponse.config.allowedHostGroups.join("\n"));
    setKeywordsInput(configResponse.config.criticalKeywords.join(", "));
    setShadowDecisions(shadowResponse.items);
    setShadowMetrics(shadowMetricsResponse.metrics);
  };

  useEffect(() => {
    const loadData = async () => {
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

    loadData();
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
      const params =
        reportMode === "manual"
          ? {
              start: manualRange.start ? new Date(manualRange.start).toISOString() : undefined,
              end: manualRange.end ? new Date(manualRange.end).toISOString() : undefined,
            }
          : { periodPreset: reportMode };
      const generatedReport = await generateShiftReport(params);
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
        allowedHostGroups: hostGroupsInput
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
        criticalKeywords: keywordsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        autoEscalationEnabled: false,
      };
      const response = await updateNightOpsConfig(payload);
      setConfig(response.config);
      setHostGroupsInput(response.config.allowedHostGroups.join("\n"));
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

  const handleCopy = async (key: string, text: string) => {
    if (!text) {
      return;
    }

    try {
      await copyTextToClipboard(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1800);
    } catch {
      setError("Nao foi possivel copiar o texto.");
    }
  };

  const analysisSummaries = buildAnalysisSummaries(history);
  const reportToDisplay = report || latestStoredReport;
  const previewPeriod = resolvePreviewPeriod(
    reportMode,
    config.timezone || "America/Sao_Paulo",
    manualRange.start,
    manualRange.end,
  );
  const selectedPeriodLabel = formatPeriodLabel(previewPeriod.start, previewPeriod.end);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          NOC Sentinel
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">
          Operacao simplificada do turno noturno
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Priorize o relatorio do turno, confirme a situacao atual e trate as ocorrencias detectadas. Auditoria e configuracoes ficam no fim da pagina.
        </p>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-10 text-center text-slate-400">
          Carregando dados do NightOps...
        </section>
      ) : (
        <>
          <NightOpsShiftReportPanel
            report={reportToDisplay}
            loading={reportLoading}
            copiedKey={copiedKey}
            onGenerate={handleGenerateReport}
            onCopy={handleCopy}
            selectedMode={reportMode}
            selectedPeriodLabel={selectedPeriodLabel}
            onModeChange={(mode) => setReportMode(mode as ReportMode)}
          />

          <NightOpsCurrentSituationPanel
            status={status}
            analyzing={analyzing}
            onAnalyze={handleAnalyzeNow}
          />

          <NightOpsOccurrencesPanel
            incidents={status.incidents}
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />

          <NightOpsRecentHistoryPanel
            analyses={analysisSummaries}
            reports={storedReports}
          />

          <NightOpsAdvancedPanel
            config={config}
            keywordsInput={keywordsInput}
            hostGroupsInput={hostGroupsInput}
            shadowDecisions={shadowDecisions}
            shadowMetrics={shadowMetrics}
            configSaving={configSaving}
            configMessage={configMessage}
            onConfigNumberChange={handleConfigNumberChange}
            onConfigTextChange={handleConfigTextChange}
            onConfigCheckboxChange={handleConfigCheckboxChange}
            onKeywordsChange={setKeywordsInput}
            onHostGroupsChange={setHostGroupsInput}
            onSaveConfig={handleSaveConfig}
            onValidateShadowDecision={handleValidateShadowDecision}
          />
        </>
      )}
    </div>
  );
}

export default NightOpsPage;
