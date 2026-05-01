import {
  occurredInPeriod,
  isCarryOverActive,
} from "./shiftPeriodUtils.mjs";

const maxRelevantOccurrences = 10;
const criticalKeywords = [
  "OLT",
  "POP",
  "BGP",
  "BACKBONE",
  "CIRCUITO",
  "ENLACE",
  "LINK",
];
const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const operationalImpactPatterns = [
  "OFFLINE",
  "UNAVAILABLE",
  "LINK DOWN",
  "INTERFACE DOWN",
  "GPON",
  "OLT",
  "POP",
  "BGP",
  "CIRCUITO",
  "CLIENTE OFFLINE",
  "SEM COMUNICAC",
];
const technicalAttentionPatterns = [
  "SINAL ALTO",
  "SINAL BAIXO",
  "LIMIAR",
  "OPTICO",
  "TEMPERATURA",
  "USO ALTO",
  "CAPACIDADE",
  "LIMITE",
];

function normalizePattern(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function buildIncidentSearchText(incident) {
  return [
    incident.title,
    incident.probableCause,
    incident.impact,
    incident.internalMessage,
    incident.customerMessage,
    ...(incident.affectedHosts || []),
    ...(incident.affectedGroups || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function matchesConfiguredPatterns(incident, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }

  const haystack = buildIncidentSearchText(incident);
  return patterns
    .map(normalizePattern)
    .filter(Boolean)
    .some((pattern) => haystack.includes(pattern));
}

function isCriticalPatternOccurrence(incident, config = {}) {
  return (
    matchesConfiguredPatterns(incident, config.alwaysIncludeHostPatterns) ||
    matchesConfiguredPatterns(incident, config.criticalHostPatterns)
  );
}

function summarizeNumbers(incidents) {
  return {
    totalProblems: incidents.reduce(
      (total, incident) => total + (incident.problemIds?.length || 0),
      0,
    ),
    criticalIncidents: incidents.filter((incident) => incident.severity === "critical").length,
    monitoredEvents: incidents.filter((incident) => incident.status === "monitoring").length,
    ignoredNoise: incidents.filter((incident) => incident.status === "ignored").length,
    escalations: incidents.filter((incident) => incident.escalation?.required).length,
  };
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "";
}

function formatDateTime(value) {
  if (!value) {
    return "Nao informado";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClock(value) {
  if (!value) {
    return "--:--";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriodHeader(start, end) {
  const sameDay =
    new Date(start).toLocaleDateString("pt-BR") ===
    new Date(end).toLocaleDateString("pt-BR");

  if (sameDay) {
    return `${formatDateTime(start)} ATE ${formatClock(end)}`;
  }

  return `${formatDateTime(start)} ATE ${formatDateTime(end)}`;
}

export function formatHumanDuration(totalMinutes = 0) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts = [];

  if (days > 0) {
    parts.push(days === 1 ? "1 dia" : `${days} dias`);
  }
  if (hours > 0) {
    parts.push(hours === 1 ? "1 hora" : `${hours} horas`);
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(remainingMinutes === 1 ? "1 minuto" : `${remainingMinutes} minutos`);
  }

  if (parts.length === 1) {
    return parts[0];
  }
  return `${parts.slice(0, -1).join(" e ")} e ${parts.at(-1)}`;
}

function mapOccurrenceStatus(incident) {
  const normalizedText = `${incident.title || ""} ${incident.impact || ""}`.toUpperCase();

  if (incident.status === "ignored") {
    return "IGNORADO";
  }
  if (incident.status === "resolved") {
    return "NORMALIZADO";
  }
  if (incident.status === "monitoring") {
    return "MONITORAMENTO";
  }
  if (/(OFFLINE|DOWN|INDISPON|SEM COMUNICAC|SEM SINAL|QUEDA)/.test(normalizedText)) {
    return "OFFLINE";
  }
  return "ATIVO";
}

function summarizeRecommendedAction(incident) {
  if (incident.recommendedActions?.length) {
    return incident.recommendedActions[0];
  }
  if (incident.escalation?.required) {
    return `Validar a ocorrencia e considerar acionamento de ${String(
      incident.escalation.target || "NOC",
    ).toLowerCase()}.`;
  }
  if (incident.status === "resolved") {
    return "Apenas registrar. Sem acao pendente no momento.";
  }
  return "Manter acompanhamento operacional no proximo turno.";
}

function occurrencePriority(incident, config = {}) {
  let score = 0;
  const normalizedText = buildIncidentSearchText(incident);
  const operationalImpact = operationalImpactPatterns.some((item) =>
    normalizedText.includes(item),
  );
  const technicalAttention = technicalAttentionPatterns.some((item) =>
    normalizedText.includes(item),
  );
  const criticalPattern = isCriticalPatternOccurrence(incident, config);

  score += (severityRank[incident.severity] || 1) * 100;
  score += criticalPattern ? 1000 : 0;
  score += operationalImpact ? 250 : 0;
  score -= technicalAttention && !operationalImpact ? 120 : 0;

  if (incident.escalation?.required) {
    score += 200;
  }

  score += Math.min((incident.affectedHosts?.length || 0) * 20, 200);
  score += Math.min(Number(incident.problemIds?.length || 0) * 10, 150);
  score += Math.min(Number(incident.durationMinutes || 0), 120);

  if (criticalKeywords.some((keyword) => normalizedText.includes(keyword))) {
    score += 150;
  }

  if (incident.status === "resolved") {
    score += 80;
  }

  return score;
}

function classifyOccurrenceType(incident, config = {}) {
  const normalizedText = buildIncidentSearchText(incident);
  const operationalImpact = operationalImpactPatterns.some((item) =>
    normalizedText.includes(item),
  );
  const technicalAttention = technicalAttentionPatterns.some((item) =>
    normalizedText.includes(item),
  );

  if (isCriticalPatternOccurrence(incident, config)) {
    return "operational";
  }

  if (operationalImpact) {
    return "operational";
  }

  if (
    technicalAttention &&
    !incident.escalation?.required &&
    !["critical", "high"].includes(incident.severity)
  ) {
    return "technical";
  }

  return "operational";
}

function buildRelevantOccurrence(incident, config = {}) {
  const status = mapOccurrenceStatus(incident);
  const criticalPattern = isCriticalPatternOccurrence(incident, config);
  const recommendedAction = criticalPattern
    ? /(OFFLINE|DOWN|UNAVAILABLE|SEM COMUNICAC|QUEDA)/.test(buildIncidentSearchText(incident))
      ? "Acionar validacao tecnica conforme procedimento interno, pois X9 e host critico da rede."
      : "Validar imediatamente disponibilidade, rota/enlace e impacto operacional. Manter acompanhamento pelo NOC."
    : summarizeRecommendedAction(incident);
  const impact = criticalPattern
    ? "Host X9 de importancia maxima na rede."
    : incident.impact || "Impacto nao detalhado.";

  return {
    title: incident.title || "Ocorrencia NightOps",
    status,
    startedAt: incident.startedAt || null,
    endedAt: incident.endedAt || null,
    durationText: formatHumanDuration(incident.durationMinutes || 0),
    impact,
    probableCause: incident.probableCause || "Causa provavel nao informada.",
    recommendedAction,
    isStillActive: status === "ATIVO" || status === "OFFLINE" || status === "MONITORAMENTO",
    relatedCount: Math.max(
      Number(incident.problemIds?.length || 0),
      Number(incident.affectedHosts?.length || 0),
    ),
    occurrenceType: classifyOccurrenceType(incident, config),
  };
}

function buildCarryOverOccurrence(incident) {
  return {
    title: incident.title || "Pendencia herdada",
    startedAt: incident.startedAt || null,
    durationText: formatHumanDuration(incident.durationMinutes || 0),
    status: mapOccurrenceStatus(incident),
    severity: incident.severity || "medium",
  };
}

function splitIncidentsByPeriod(incidents, period) {
  const periodIncidents = [];
  const carryOverIncidents = [];

  for (const incident of incidents) {
    if (occurredInPeriod(incident, period.start, period.end)) {
      periodIncidents.push(incident);
      continue;
    }

    if (isCarryOverActive(incident, period.start)) {
      carryOverIncidents.push(incident);
    }
  }

  return {
    periodIncidents,
    carryOverIncidents,
  };
}

function selectRelevantOccurrences(periodIncidents, config = {}) {
  const relevant = [...periodIncidents]
    .sort((left, right) => occurrencePriority(right, config) - occurrencePriority(left, config))
    .slice(0, maxRelevantOccurrences);

  const mapped = relevant.map((incident) => buildRelevantOccurrence(incident, config));
  const operational = mapped.filter((item) => item.occurrenceType === "operational");
  const technical = mapped.filter((item) => item.occurrenceType === "technical");

  return {
    operationalOccurrences: operational,
    technicalAttentionOccurrences: technical,
    relevantOccurrences: operational.length > 0 ? operational : technical,
  };
}

function selectCarryOverOccurrences(carryOverIncidents, config) {
  const minSeverityRank = severityRank[config.carryOverMinSeverity || "critical"] || 4;
  return [...carryOverIncidents]
    .filter((incident) => (severityRank[incident.severity] || 0) >= minSeverityRank)
    .sort((left, right) => (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0))
    .slice(0, Number(config.maxCarryOverItemsInReport ?? 5))
    .map(buildCarryOverOccurrence);
}

function buildObservation(numbers, relevantOccurrences, inheritedPendingCount) {
  if (numbers.totalProblems === 0) {
    return "Nao houve ocorrencias relevantes durante o periodo.";
  }

  const massEvent = relevantOccurrences.find((item) => item.relatedCount >= 5);
  if (numbers.totalProblems >= 50 && massEvent) {
    return `O numero elevado de incidentes do periodo esta relacionado principalmente a ${massEvent.title}, que concentrou multiplos alarmes associados no plantao.`;
  }

  if (relevantOccurrences.some((item) => item.isStillActive)) {
    return "Ha ocorrencias do periodo que permanecem ativas e precisam de acompanhamento pelo turno seguinte.";
  }

  return "As principais ocorrencias do periodo foram normalizadas durante o plantao.";
}

function buildSummaryText(numbers, relevantOccurrences, inheritedPendingCount, providedSummary) {
  if (providedSummary) {
    return providedSummary;
  }

  if (numbers.totalProblems === 0) {
    return "Durante o plantao nao foram identificadas ocorrencias relevantes com evento registrado no periodo.";
  }

  const parts = [
    `Durante o plantao foram identificadas ${numbers.totalProblems} ocorrencias com evento registrado no periodo.`,
  ];
  const massEvent = relevantOccurrences.find((item) => item.relatedCount >= 5);

  if (massEvent && numbers.totalProblems >= 50) {
    parts.push(
      `O volume alto foi causado principalmente por eventos relacionados a ${massEvent.title}, que gerou multiplos alarmes associados.`,
    );
  } else if (numbers.criticalIncidents === 0) {
    parts.push("Nao foram identificadas ocorrencias criticas no periodo.");
  }

  if (relevantOccurrences.some((item) => item.isStillActive)) {
    parts.push("Ha ocorrencias do periodo que permanecem ativas e precisam de acompanhamento pelo turno seguinte.");
  } else {
    parts.push("As principais ocorrencias do periodo foram normalizadas durante o plantao.");
  }

  return parts.join(" ");
}

function defaultRecommendations(periodIncidents, carryOverIncidents) {
  const recommendations = [];

  if (periodIncidents.some((incident) => incident.severity === "critical")) {
    recommendations.push("Revisar pela manha as ocorrencias criticas do periodo e validar RCA preliminar.");
  }
  if (periodIncidents.some((incident) => incident.escalation?.required)) {
    recommendations.push("Confirmar com supervisao quais recomendacoes de acionamento do periodo serao efetivamente executadas.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Sem desvios relevantes. Manter acompanhamento padrao do inicio do expediente.");
  }

  return recommendations;
}

function buildHandoverText(relevantOccurrences, inheritedPendingCount, summaryText) {
  if (relevantOccurrences.length === 0) {
    return "Bom dia. Durante o plantao nao houve ocorrencias relevantes. Ambiente permaneceu sob monitoramento normal.";
  }

  const activeItems = relevantOccurrences.filter((item) => item.isStillActive);
  const normalizedItems = relevantOccurrences.filter((item) => !item.isStillActive);
  const parts = [`Bom dia. ${summaryText}`];

  if (activeItems.length > 0) {
    parts.push(
      `Permanecem ativas as ocorrencias do periodo ${activeItems
        .slice(0, 2)
        .map((item) => item.title)
        .join(" e ")} e devem seguir em acompanhamento pela equipe diurna.`,
    );
  }

  if (normalizedItems.length > 0) {
    parts.push(
      `${normalizedItems
        .slice(0, 1)
        .map((item) => item.title)
        .join(", ")} foi normalizado durante o plantao, mantendo apenas registro e observacao de reincidencia.`,
    );
  }

  return parts.join(" ");
}

function buildPlainTextReport({
  title,
  period,
  summaryText,
  relevantOccurrences,
  carryOverOccurrences,
  inheritedPendingCount,
  numbers,
  handoverText,
  observation,
  periodIncidentCount,
}) {
  const lines = [
    title,
    `PERIODO: ${formatPeriodHeader(period.start, period.end)}`,
    "--------------------------------------------------------------------------------",
    "",
    "RESUMO GERAL:",
    summaryText,
    "",
    "OCORRENCIAS RELEVANTES:",
    "",
  ];

  if (relevantOccurrences.length === 0) {
    lines.push("Nenhuma ocorrencia relevante registrada no periodo.");
  } else {
    relevantOccurrences.forEach((occurrence, index) => {
      lines.push(`${index + 1}. ${occurrence.title}`);
      lines.push(`Status: ${occurrence.status}`);
      lines.push(`Inicio do alarme: ${formatDateTime(occurrence.startedAt)}`);
      if (occurrence.endedAt) {
        lines.push(`Normalizacao: ${formatDateTime(occurrence.endedAt)}`);
      }
      lines.push(`${occurrence.isStillActive ? "Tempo em alarme" : "Duracao"}: ${occurrence.durationText}`);
      lines.push(
        `Situacao: ${occurrence.isStillActive ? "Permanece ativo no fechamento do plantao." : "Normalizado durante o plantao."}`,
      );
      lines.push(`Impacto provavel: ${occurrence.impact}`);
      lines.push(`Acao recomendada: ${occurrence.recommendedAction}`);
      lines.push("");
    });
  }

  if (periodIncidentCount > relevantOccurrences.length) {
    lines.push(
      `Outras ${Math.max(periodIncidentCount - relevantOccurrences.length, 0)} ocorrencias menores foram registradas no periodo.`,
    );
    lines.push("");
  }

  lines.push(`TOTAL DE INCIDENTES/ALARMES DO PERIODO: ${numbers.totalProblems}`);
  lines.push("");
  lines.push("OBSERVACAO:");
  lines.push(observation);
  lines.push("");
  lines.push("PASSAGEM DE TURNO:");
  lines.push(handoverText);

  return lines.join("\n");
}

export function generateShiftReport({ start, end, incidents, summary, config = {}, periodPreset, periodLabel }) {
  const period = { start, end };
  const { periodIncidents, carryOverIncidents } = splitIncidentsByPeriod(
    incidents,
    period,
  );
  const selectedPeriodIncidents = config.includeCarryOverInMainReport
    ? [
        ...periodIncidents,
        ...carryOverIncidents.slice(0, Number(config.maxCarryOverItemsInReport ?? 5)),
      ]
    : periodIncidents;
  const {
    relevantOccurrences,
    operationalOccurrences,
    technicalAttentionOccurrences,
  } = selectRelevantOccurrences(selectedPeriodIncidents, config);
  const carryOverOccurrences = selectCarryOverOccurrences(carryOverIncidents, config);
  const numbers = {
    ...summarizeNumbers(periodIncidents),
    periodEventCount: summarizeNumbers(periodIncidents).totalProblems,
  };
  const inheritedPendingCount = carryOverIncidents.length;
  const summaryText = buildSummaryText(
    numbers,
    relevantOccurrences,
    inheritedPendingCount,
    summary,
  );
  const observation = buildObservation(
    numbers,
    relevantOccurrences,
    inheritedPendingCount,
  );
  const handoverText = buildHandoverText(
    relevantOccurrences,
    inheritedPendingCount,
    summaryText,
  );
  const title = `RELATORIO NOC - ${formatDate(start)}`;
  const plainTextReport = buildPlainTextReport({
    title,
    period,
    summaryText,
    relevantOccurrences,
    carryOverOccurrences,
    inheritedPendingCount,
    numbers,
    handoverText,
    observation,
    periodIncidentCount: periodIncidents.length,
  });

  return {
    title,
    period,
    summary: summaryText,
    numbers,
    incidents: periodIncidents,
    relevantOccurrences,
    operationalOccurrences,
    technicalAttentionOccurrences,
    carryOverOccurrences,
    inheritedPendingCount,
    excludedCarryOverCount: inheritedPendingCount,
    periodEventCount: numbers.periodEventCount,
    periodPreset,
    periodLabel,
    recommendations: defaultRecommendations(periodIncidents, carryOverIncidents),
    handoverText,
    plainTextReport,
  };
}
