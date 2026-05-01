import { buildNightOpsPrompt } from "../ai/prompts/nightOpsPrompt.mjs";
import { callAIProvider } from "../ai/providers/index.mjs";
import { classifyProblem } from "./incidentClassifier.mjs";
import { correlateIncidents } from "./correlationEngine.mjs";
import { generateShiftReport } from "./shiftReportService.mjs";

function buildShadowDecisionId(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SHADOW-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${random}`;
}

function deriveShadowDecision(incident, analysisId, generatedAt) {
  let decision = "monitor";
  let wouldNotify = false;

  if (incident.escalation?.required) {
    decision = "recommend_escalation";
    wouldNotify = true;
  } else if (
    incident.status === "ignored" ||
    (incident.severity === "low" && !incident.escalation?.required)
  ) {
    decision = "ignore";
  }

  return {
    id: buildShadowDecisionId(),
    createdAt: generatedAt,
    analysisId,
    incidentId: incident.id,
    decision,
    wouldNotify,
    severity: incident.severity,
    reason: incident.escalation?.reason || incident.probableCause || "Sem motivo informado.",
    evidence: incident.evidence || [],
    confidence: Number(incident.confidence || 0),
    humanValidation: {
      status: "pending",
      validatedBy: null,
      validatedAt: null,
      notes: "",
    },
  };
}

function compactIncidentForAI(incident) {
  return {
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    sourceSeverity: incident.sourceSeverity,
    status: incident.status,
    durationMinutes: incident.durationMinutes,
    affectedHosts: incident.affectedHosts,
    affectedGroups: incident.affectedGroups,
    evidence: incident.evidence?.slice(0, 5),
    escalation: incident.escalation,
  };
}

async function enrichIncidentsWithAI(config, incidents) {
  try {
    const response = await callAIProvider(config, {
      systemPrompt: buildNightOpsPrompt(),
      userPrompt: [
        "Analise os incidentes correlacionados abaixo e devolva somente JSON valido.",
        "Formato:",
        '{"summary":"...","incidents":[{"id":"...","probableCause":"...","impact":"...","customerMessage":"...","internalMessage":"...","recommendedActions":["..."],"confidence":0.7}]}',
        JSON.stringify({
          incidents: incidents.map(compactIncidentForAI),
        }),
      ].join("\n"),
      temperature: 0.1,
      maxTokens: 900,
    });

    const parsed = JSON.parse(String(response.content || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
    const aiMap = new Map(
      (Array.isArray(parsed.incidents) ? parsed.incidents : [])
        .filter((item) => item?.id)
        .map((item) => [item.id, item]),
    );

    return {
      providerSummary: String(parsed.summary || ""),
      incidents: incidents.map((incident) => {
        const aiIncident = aiMap.get(incident.id) || {};
        return {
          ...incident,
          probableCause: String(aiIncident.probableCause || incident.probableCause),
          impact: String(aiIncident.impact || incident.impact),
          customerMessage: String(aiIncident.customerMessage || incident.customerMessage),
          internalMessage: String(aiIncident.internalMessage || incident.internalMessage),
          recommendedActions: Array.isArray(aiIncident.recommendedActions)
            ? aiIncident.recommendedActions.map(String)
            : incident.recommendedActions,
          confidence: Number(aiIncident.confidence || incident.confidence || 0.6),
        };
      }),
      provider: response.provider,
      model: response.model,
    };
  } catch {
    return {
      providerSummary: "",
      incidents,
      provider: "deterministic",
      model: undefined,
    };
  }
}

export function createNightOpsService({ config, zabbixClient, store, configStore }) {
  function getRuntimeConfig() {
    return configStore?.getConfig?.() || {
      defaultStartHour: config.nightOpsDefaultStartHour,
      defaultEndHour: config.nightOpsDefaultEndHour,
      timezone: config.nightOpsTimezone,
      minDurationMinutes: config.nightOpsMinDurationMinutes,
      correlationWindowMinutes: config.nightOpsCorrelationWindowMinutes,
      sameGroupAffectedHostsThreshold: config.nightOpsSameGroupAffectedHostsThreshold,
      criticalKeywords: config.nightOpsCriticalKeywords,
      autoEscalationEnabled: false,
      shadowModeEnabled: true,
      shadowModeRetentionDays: 30,
    };
  }

  function getRuleOptions() {
    const runtimeConfig = getRuntimeConfig();
    return {
      correlationWindowMinutes: runtimeConfig.correlationWindowMinutes,
      criticalKeywords: runtimeConfig.criticalKeywords,
      rules: {
        minDurationMinutes: runtimeConfig.minDurationMinutes,
        sameGroupAffectedHostsThreshold:
          runtimeConfig.sameGroupAffectedHostsThreshold,
        criticalKeywords: runtimeConfig.criticalKeywords,
        autoEscalationEnabled: runtimeConfig.autoEscalationEnabled,
      },
    };
  }

  async function analyzeNightOps() {
    if (!zabbixClient.hasConfiguration()) {
      throw new Error("Integracao Zabbix nao configurada para NightOps.");
    }

    const snapshot = await zabbixClient.getOperationalSnapshot({
      hostLimit: 120,
      problemLimit: 120,
      eventLimit: 120,
    });

    const classified = snapshot.problems.map((problem) =>
      classifyProblem(problem, {
        nowTs: Date.now(),
        rules: getRuleOptions().rules,
      })
    );
    const correlated = correlateIncidents(classified, getRuleOptions());
    const enriched = await enrichIncidentsWithAI(config, correlated);

    const incidents = enriched.incidents;
    const summary = {
      activeProblems: snapshot.problems.length,
      criticalIncidents: incidents.filter((incident) => incident.severity === "critical").length,
      warningIncidents: incidents.filter((incident) => ["low", "medium"].includes(incident.severity)).length,
      ignoredNoise: incidents.filter((incident) => incident.status === "ignored").length,
      escalationRecommended: incidents.filter((incident) => incident.escalation?.required).length,
    };

    const generatedAt = new Date().toISOString();
    const result = {
      id: `analysis-${new Date().toISOString()}`,
      status: "ok",
      generatedAt,
      summary,
      incidents,
      analysisSource: enriched.provider,
      analysisModel: enriched.model,
      providerSummary: enriched.providerSummary,
    };

    const savedAnalysis = store.saveAnalysis(result);
    const runtimeConfig = getRuntimeConfig();

    if (runtimeConfig.shadowModeEnabled) {
      store.clearOldShadowDecisions(runtimeConfig.shadowModeRetentionDays);
      const shadowDecisions = incidents.map((incident) =>
        store.saveShadowDecision(
          deriveShadowDecision(incident, savedAnalysis.id, generatedAt),
        )
      );

      return {
        ...savedAnalysis,
        shadowDecisions,
      };
    }

    return {
      ...savedAnalysis,
      shadowDecisions: [],
    };
  }

  function getStatus() {
    const latest = store.getLatestAnalysis();
    if (!latest) {
      return {
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
    }

    return latest;
  }

  function resolveShiftPeriod(input = {}) {
    if (input.start && input.end) {
      return { start: input.start, end: input.end };
    }

    const runtimeConfig = getRuntimeConfig();
    const timezone = runtimeConfig.timezone || "America/Sao_Paulo";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const baseDate = `${year}-${month}-${day}`;
    const startHour = String(runtimeConfig.defaultStartHour).padStart(2, "0");
    const endHour = String(runtimeConfig.defaultEndHour).padStart(2, "0");

    const start = `${baseDate}T${startHour}:00:00-03:00`;
    const endDate = new Date(`${baseDate}T00:00:00-03:00`);
    if (Number(runtimeConfig.defaultEndHour) < Number(runtimeConfig.defaultStartHour)) {
      endDate.setDate(endDate.getDate() + 1);
    }
    const nextBase = endDate.toISOString().slice(0, 10);
    const end = `${nextBase}T${endHour}:00:00-03:00`;

    return { start, end };
  }

  async function createShiftReport(input = {}) {
    const period = resolveShiftPeriod(input);
    const analyses = store.getAnalysesBetween(period.start, period.end);
    const incidents = analyses.flatMap((analysis) => analysis.incidents || []);
    const latest = analyses.at(-1) || store.getLatestAnalysis();
    const report = generateShiftReport({
      start: period.start,
      end: period.end,
      incidents: incidents.length > 0 ? incidents : latest?.incidents || [],
      summary: latest?.providerSummary || undefined,
    });

    return store.saveShiftReport({
      ...report,
      id: `report-${period.start}-${period.end}`,
      generatedAt: new Date().toISOString(),
    });
  }

  function listHistory(filters = {}) {
    return store.listIncidents(filters);
  }

  function getConfig() {
    return getRuntimeConfig();
  }

  function updateConfig(nextConfig) {
    const result = configStore.updateConfig(nextConfig);
    if (!result.ok) {
      throw new Error(result.errors.join(" "));
    }

    return result.value;
  }

  function listShadowDecisions(filters = {}) {
    return store.listShadowDecisions(filters);
  }

  function getShadowMetrics(filters = {}) {
    return store.getShadowMetrics(filters);
  }

  function updateShadowDecisionValidation(id, validation) {
    const allowedStatuses = [
      "correct",
      "false_positive",
      "false_negative",
      "partially_correct",
    ];

    if (!allowedStatuses.includes(validation.status)) {
      throw new Error("Status de validacao shadow invalido.");
    }

    if (
      validation.validatedBy &&
      (typeof validation.validatedBy !== "string" || validation.validatedBy.length > 60)
    ) {
      throw new Error("validatedBy invalido.");
    }

    if (
      validation.notes &&
      (typeof validation.notes !== "string" || validation.notes.length > 500)
    ) {
      throw new Error("notes invalido.");
    }

    const updated = store.updateShadowDecisionValidation(id, {
      status: validation.status,
      validatedBy: validation.validatedBy || null,
      validatedAt: new Date().toISOString(),
      notes: validation.notes || "",
    });

    if (!updated) {
      throw new Error("Decisao shadow nao encontrada.");
    }

    return updated;
  }

  function listShiftReports(filters = {}) {
    return store.listShiftReports(filters);
  }

  function getLatestShiftReport() {
    return store.getLastShiftReport();
  }

  return {
    analyzeNightOps,
    getStatus,
    createShiftReport,
    getConfig,
    updateConfig,
    getLatestShiftReport,
    listHistory,
    listShadowDecisions,
    listShiftReports,
    getShadowMetrics,
    updateShadowDecisionValidation,
  };
}
