import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const defaultHistory = {
  version: 1,
  incidents: [],
  analyses: [],
  shiftReports: [],
};

function cloneDefaultHistory() {
  return {
    version: 1,
    incidents: [],
    analyses: [],
    shiftReports: [],
  };
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return null;
}

function readTimestamp(value) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildStoredAnalysis(analysis) {
  const generatedAt = analysis.generatedAt || new Date().toISOString();
  return {
    id: analysis.id || `analysis-${generatedAt}`,
    generatedAt,
    status: analysis.status || "ok",
    summary: analysis.summary || {
      activeProblems: 0,
      criticalIncidents: 0,
      warningIncidents: 0,
      ignoredNoise: 0,
      escalationRecommended: 0,
    },
    incidents: ensureArray(analysis.incidents),
    analysisSource: analysis.analysisSource || "deterministic",
    analysisModel: analysis.analysisModel,
    providerSummary: analysis.providerSummary || "",
    metadata: {
      totalProblems: Number(analysis.summary?.activeProblems || 0),
      totalIncidents: ensureArray(analysis.incidents).length,
      escalationRecommended: Number(
        analysis.summary?.escalationRecommended || 0,
      ),
      ...(analysis.metadata || {}),
    },
  };
}

function buildStoredIncident(incident, analysis) {
  return {
    ...incident,
    analysisId: analysis.id,
    generatedAt: analysis.generatedAt,
    title: incident.title || "Incidente NightOps",
    severity: incident.severity || "medium",
    status: incident.status || "active",
    escalation: {
      required: Boolean(incident.escalation?.required),
      reason: incident.escalation?.reason || "Sem motivo informado.",
      target: incident.escalation?.target || "NOC",
    },
  };
}

function buildStoredShiftReport(report) {
  return {
    id: report.id || `report-${report.period?.start || new Date().toISOString()}`,
    generatedAt: report.generatedAt || new Date().toISOString(),
    title: report.title || "Relatorio NOC Noturno",
    period: report.period || {
      start: null,
      end: null,
    },
    summary: report.summary || "",
    numbers: report.numbers || {
      totalProblems: 0,
      criticalIncidents: 0,
      monitoredEvents: 0,
      ignoredNoise: 0,
      escalations: 0,
    },
    incidents: ensureArray(report.incidents),
    recommendations: ensureArray(report.recommendations),
    handoverText: report.handoverText || "",
  };
}

export function createNightOpsStore(options = {}) {
  const historyFilePath = resolve(
    options.filePath || "server/data/nightops-history.json",
  );
  const historyDir = dirname(historyFilePath);
  let history = cloneDefaultHistory();

  function persistHistory() {
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(historyFilePath, JSON.stringify(history, null, 2), "utf8");
  }

  function backupCorruptedFile() {
    if (!existsSync(historyFilePath)) {
      return null;
    }

    const backupPath = `${historyFilePath}.bak-${Date.now()}`;
    copyFileSync(historyFilePath, backupPath);
    return backupPath;
  }

  function ensureHistoryFile() {
    try {
      mkdirSync(historyDir, { recursive: true });

      if (!existsSync(historyFilePath)) {
        history = cloneDefaultHistory();
        persistHistory();
        return;
      }

      const raw = readFileSync(historyFilePath, "utf8").trim();
      if (!raw) {
        history = cloneDefaultHistory();
        persistHistory();
        return;
      }

      const parsed = JSON.parse(raw);
      history = {
        version: Number(parsed?.version || 1),
        incidents: ensureArray(parsed?.incidents),
        analyses: ensureArray(parsed?.analyses),
        shiftReports: ensureArray(parsed?.shiftReports),
      };
      persistHistory();
    } catch {
      backupCorruptedFile();
      history = cloneDefaultHistory();
      persistHistory();
    }
  }

  function upsertById(collectionName, item) {
    const collection = history[collectionName];
    const existingIndex = collection.findIndex((entry) => entry.id === item.id);

    if (existingIndex >= 0) {
      collection[existingIndex] = item;
    } else {
      collection.push(item);
    }
  }

  function saveIncident(incident) {
    try {
      const normalized = {
        ...incident,
        id: incident.id || `incident-${Date.now()}`,
      };
      upsertById("incidents", normalized);
      persistHistory();
      return normalized;
    } catch (error) {
      throw new Error(
        `Falha ao salvar incidente NightOps: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
    }
  }

  function saveAnalysis(analysis) {
    try {
      const normalized = buildStoredAnalysis(analysis);
      upsertById("analyses", normalized);

      for (const incident of normalized.incidents) {
        saveIncident(buildStoredIncident(incident, normalized));
      }

      persistHistory();
      return normalized;
    } catch (error) {
      throw new Error(
        `Falha ao salvar analise NightOps: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
    }
  }

  function saveShiftReport(report) {
    try {
      const normalized = buildStoredShiftReport(report);
      upsertById("shiftReports", normalized);
      persistHistory();
      return normalized;
    } catch (error) {
      throw new Error(
        `Falha ao salvar relatorio NightOps: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
    }
  }

  function filterByDateRange(items, filters = {}, dateField = "generatedAt") {
    const startTs = filters.start ? readTimestamp(filters.start) : null;
    const endTs = filters.end ? readTimestamp(filters.end) : null;

    return items.filter((item) => {
      const itemTs = readTimestamp(item[dateField] || item.startedAt);
      if (startTs && itemTs < startTs) {
        return false;
      }
      if (endTs && itemTs > endTs) {
        return false;
      }
      return true;
    });
  }

  function listIncidents(filters = {}) {
    let items = [...history.incidents];

    if (filters.severity) {
      items = items.filter((item) => item.severity === filters.severity);
    }

    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    const escalationRequired = normalizeBoolean(filters.escalationRequired);
    if (escalationRequired !== null) {
      items = items.filter(
        (item) => Boolean(item.escalation?.required) === escalationRequired,
      );
    }

    items = filterByDateRange(items, filters);
    return items.sort(
      (left, right) => readTimestamp(right.generatedAt) - readTimestamp(left.generatedAt),
    );
  }

  function listAnalyses(filters = {}) {
    let items = [...history.analyses];
    items = filterByDateRange(items, filters);
    return items.sort(
      (left, right) => readTimestamp(right.generatedAt) - readTimestamp(left.generatedAt),
    );
  }

  function getIncidentById(id) {
    return history.incidents.find((incident) => incident.id === id) || null;
  }

  function listShiftReports(filters = {}) {
    const items = filterByDateRange([...history.shiftReports], filters);
    return items.sort(
      (left, right) => readTimestamp(right.generatedAt) - readTimestamp(left.generatedAt),
    );
  }

  function getLastShiftReport() {
    return listShiftReports()[0] || null;
  }

  function clearOldHistory(days = 7) {
    const cutoffTs = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    const isRecent = (item) => readTimestamp(item.generatedAt || item.startedAt) >= cutoffTs;

    history = {
      ...history,
      incidents: history.incidents.filter(isRecent),
      analyses: history.analyses.filter(isRecent),
      shiftReports: history.shiftReports.filter(isRecent),
    };

    persistHistory();
    return {
      status: "ok",
      incidents: history.incidents.length,
      analyses: history.analyses.length,
      shiftReports: history.shiftReports.length,
    };
  }

  function getLatestAnalysis() {
    return listAnalyses()[0] || null;
  }

  function getAnalysesBetween(start, end) {
    return listAnalyses({ start, end });
  }

  function setLatestAnalysis(result) {
    return saveAnalysis(result);
  }

  function setLatestShiftReport(report) {
    return saveShiftReport(report);
  }

  ensureHistoryFile();

  return {
    clearOldHistory,
    getAnalysesBetween,
    getIncidentById,
    getLastShiftReport,
    getLatestAnalysis,
    getLatestShiftReport: getLastShiftReport,
    listAnalyses,
    listIncidents,
    listShiftReports,
    saveAnalysis,
    saveIncident,
    saveShiftReport,
    setLatestAnalysis,
    setLatestShiftReport,
  };
}
