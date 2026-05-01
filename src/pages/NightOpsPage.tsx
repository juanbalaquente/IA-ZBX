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
