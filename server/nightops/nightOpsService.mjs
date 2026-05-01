import { buildNightOpsPrompt } from "../ai/prompts/nightOpsPrompt.mjs";
import { callAIProvider } from "../ai/providers/index.mjs";
import { classifyProblem } from "./incidentClassifier.mjs";
import { correlateIncidents } from "./correlationEngine.mjs";
import { generateShiftReport } from "./shiftReportService.mjs";

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

export function createNightOpsService({ config, zabbixClient, store }) {
  function getRuleOptions() {
    return {
      correlationWindowMinutes: config.nightOpsCorrelationWindowMinutes,
      rules: {
        minDurationMinutes: config.nightOpsMinDurationMinutes,
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
        rules: { minDurationMinutes: config.nightOpsMinDurationMinutes },
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

    const result = {
      status: "ok",
      generatedAt: new Date().toISOString(),
      summary,
      incidents,
      analysisSource: enriched.provider,
      analysisModel: enriched.model,
      providerSummary: enriched.providerSummary,
    };

    store.setLatestAnalysis(result);
    return result;
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

    const timezone = config.nightOpsTimezone || "America/Sao_Paulo";
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
    const startHour = String(config.nightOpsDefaultStartHour).padStart(2, "0");
    const endHour = String(config.nightOpsDefaultEndHour).padStart(2, "0");

    const start = `${baseDate}T${startHour}:00:00-03:00`;
    const endDate = new Date(`${baseDate}T00:00:00-03:00`);
    if (Number(config.nightOpsDefaultEndHour) < Number(config.nightOpsDefaultStartHour)) {
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

    store.setLatestShiftReport(report);
    return report;
  }

  return {
    analyzeNightOps,
    getStatus,
    createShiftReport,
  };
}
