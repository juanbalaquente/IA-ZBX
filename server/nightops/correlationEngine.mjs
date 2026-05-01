import { applyEscalationRules } from "./escalationRules.mjs";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hostPrefix(host) {
  const normalized = normalizeText(host);
  return normalized.split(/[-_ ]/)[0] || normalized;
}

function extractKeywords(title, options = {}) {
  const normalized = normalizeText(title);
  const configuredKeywords = Array.isArray(options.criticalKeywords)
    ? options.criticalKeywords
    : ["olt", "pop", "cto", "link", "enlace", "bgp", "core", "backbone", "transporte"];
  const interesting = configuredKeywords.map((keyword) => normalizeText(keyword));
  return interesting.filter((keyword) => normalized.includes(keyword));
}

function findCorrelationKey(incident, windowMinutes, options = {}) {
  const startedAt = new Date(incident.startedAt).getTime();
  const bucket = Math.floor(startedAt / (windowMinutes * 60000));
  const group = incident.affectedGroups?.[0] || "sem-grupo";
  const prefix = hostPrefix(incident.affectedHosts?.[0] || "");
  const keyword = extractKeywords(incident.title, options)[0] || "geral";
  return [
    group.toLowerCase(),
    prefix,
    incident.sourceSeverity || incident.severity,
    keyword,
    bucket,
  ].join("|");
}

function mergeUnique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function correlateIncidents(incidents, options = {}) {
  const windowMinutes = Number(options.correlationWindowMinutes ?? 10);
  const grouped = new Map();

  for (const incident of incidents) {
    const key = findCorrelationKey(incident, windowMinutes, options);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, { ...incident });
      continue;
    }

    const earliestStart = new Date(current.startedAt).getTime() <= new Date(incident.startedAt).getTime()
      ? current.startedAt
      : incident.startedAt;
    const durationMinutes = Math.max(
      Number(current.durationMinutes || 0),
      Number(incident.durationMinutes || 0),
    );

    grouped.set(key, {
      ...current,
      title:
        mergeUnique([current.title, incident.title]).length > 1
          ? `Incidente correlacionado - ${current.affectedGroups?.[0] || "grupo operacional"}`
          : current.title,
      severity:
        current.severity === "critical" || incident.severity === "critical"
          ? "critical"
          : current.severity === "high" || incident.severity === "high"
            ? "high"
            : current.severity,
      status:
        current.status === "active" || incident.status === "active"
          ? "active"
          : current.status,
      classification: "correlated-outage",
      startedAt: earliestStart,
      durationMinutes,
      affectedHosts: mergeUnique([
        ...(current.affectedHosts || []),
        ...(incident.affectedHosts || []),
      ]),
      affectedGroups: mergeUnique([
        ...(current.affectedGroups || []),
        ...(incident.affectedGroups || []),
      ]),
      problemIds: mergeUnique([
        ...(current.problemIds || []),
        ...(incident.problemIds || []),
      ]),
      eventIds: mergeUnique([
        ...(current.eventIds || []),
        ...(incident.eventIds || []),
      ]),
      evidence: mergeUnique([
        ...(current.evidence || []),
        ...(incident.evidence || []),
        "Incidentes agrupados por grupo/host/severidade/janela de tempo.",
      ]),
      recommendedActions: mergeUnique([
        ...(current.recommendedActions || []),
        ...(incident.recommendedActions || []),
      ]),
      confidence: Math.min(0.95, Math.max(current.confidence || 0, incident.confidence || 0) + 0.1),
    });
  }

  return [...grouped.values()].map((incident) =>
    applyEscalationRules(incident, options.rules)
  );
}
