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

function summarizeNumbers(incidents) {
  return {
    totalProblems: incidents.reduce((total, incident) => total + (incident.problemIds?.length || 0), 0),
    criticalIncidents: incidents.filter((incident) => incident.severity === "critical").length,
    monitoredEvents: incidents.filter((incident) => incident.status === "monitoring").length,
    ignoredNoise: incidents.filter((incident) => incident.status === "ignored").length,
    escalations: incidents.filter((incident) => incident.escalation?.required).length,
  };
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("pt-BR");
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
    parts.push(
      remainingMinutes === 1 ? "1 minuto" : `${remainingMinutes} minutos`,
    );
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts.slice(0, -1).join(" e ")} e ${parts.at(-1)}`;
}

function occurrencePriority(incident) {
  let score = 0;
  const normalizedText = `${incident.title || ""} ${incident.probableCause || ""} ${incident.impact || ""}`.toUpperCase();

  if (incident.status === "active") {
    score += 1000;
  }

  if (incident.severity === "critical") {
    score += 500;
  } else if (incident.severity === "high") {
    score += 300;
  }

  if (incident.escalation?.required) {
    score += 400;
  }

  score += Math.min(Number(incident.durationMinutes || 0), 200);
  score += Math.min((incident.affectedHosts || []).length * 20, 200);

  if (criticalKeywords.some((keyword) => normalizedText.includes(keyword))) {
    score += 250;
  }

  if (incident.status === "resolved" && incident.severity !== "low") {
    score += 120;
  }

  return score;
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

  if (
    incident.status === "active" &&
    /(OFFLINE|DOWN|INDISPON|SEM COMUNICAC|SEM SINAL|QUEDA)/.test(normalizedText)
  ) {
    return "OFFLINE";
  }

  return "ATIVO";
}

function summarizeRecommendedAction(incident) {
  if (incident.recommendedActions?.length) {
    return incident.recommendedActions[0];
  }

  if (incident.escalation?.required) {
    return `Validar a ocorrencia e considerar acionamento de ${String(incident.escalation.target || "NOC").toLowerCase()}.`;
  }

  if (incident.status === "resolved") {
    return "Apenas registrar. Sem acao pendente no momento.";
  }

  return "Manter acompanhamento operacional no proximo turno.";
}

function buildRelevantOccurrence(incident) {
  const status = mapOccurrenceStatus(incident);
  const isStillActive = status === "ATIVO" || status === "OFFLINE" || status === "MONITORAMENTO";

  return {
    title: incident.title || "Ocorrencia NightOps",
    status,
    startedAt: incident.startedAt || null,
    endedAt: incident.status === "resolved" ? incident.endedAt || null : null,
    durationText: formatHumanDuration(incident.durationMinutes || 0),
    impact: incident.impact || "Impacto nao detalhado.",
    probableCause: incident.probableCause || "Causa provavel nao informada.",
    recommendedAction: summarizeRecommendedAction(incident),
    isStillActive,
    relatedCount: Math.max(
      Number(incident.problemIds?.length || 0),
      Number(incident.affectedHosts?.length || 0),
    ),
  };
}

function selectRelevantOccurrences(incidents) {
  return [...incidents]
    .sort((left, right) => occurrencePriority(right) - occurrencePriority(left))
    .slice(0, maxRelevantOccurrences)
    .map(buildRelevantOccurrence);
}

function buildObservation(numbers, relevantOccurrences, totalIncidents) {
  if (totalIncidents === 0) {
    return "Nao houve ocorrencias relevantes durante o periodo.";
  }

  const massEvent = relevantOccurrences.find((item) => item.relatedCount >= 5);
  if (numbers.totalProblems >= 50 && massEvent) {
    return `O numero elevado de incidentes esta relacionado principalmente a ${massEvent.title}, que concentrou multiplos alarmes associados no periodo.`;
  }

  if (relevantOccurrences.some((item) => item.isStillActive)) {
    return "Ha ocorrencias que permanecem ativas e precisam de acompanhamento pelo turno seguinte.";
  }

  return "As principais ocorrencias foram normalizadas durante o periodo.";
}

function buildSummaryText(incidents, numbers, relevantOccurrences, providedSummary) {
  if (providedSummary) {
    return providedSummary;
  }

  if (incidents.length === 0) {
    return "Nao foram identificadas ocorrencias relevantes durante o plantao.";
  }

  const lines = [
    `Durante o plantao foram identificados ${numbers.totalProblems} incidentes/alarmes no Zabbix.`,
  ];
  const massEvent = relevantOccurrences.find((item) => item.relatedCount >= 5);

  if (numbers.totalProblems >= 50 && massEvent) {
    lines.push(
      `O volume alto foi causado principalmente por eventos relacionados a ${massEvent.title}, que gerou multiplos alarmes associados.`,
    );
  } else if (numbers.criticalIncidents === 0) {
    lines.push("Nao foram identificados incidentes criticos durante o periodo.");
  }

  if (relevantOccurrences.some((item) => item.isStillActive)) {
    lines.push("Ha ocorrencias que permanecem ativas e precisam de acompanhamento pelo turno seguinte.");
  } else {
    lines.push("As principais ocorrencias foram normalizadas durante o periodo.");
  }

  return lines.join(" ");
}

function defaultRecommendations(incidents) {
  const recommendations = [];

  if (incidents.some((incident) => incident.severity === "critical")) {
    recommendations.push("Revisar pela manha os incidentes criticos correlacionados e validar RCA preliminar.");
  }

  if (incidents.some((incident) => incident.status === "ignored")) {
    recommendations.push("Avaliar alarmes ruidosos e ajustar trigger ou janela de histerese no Zabbix.");
  }

  if (incidents.some((incident) => incident.escalation?.required)) {
    recommendations.push("Confirmar com supervisao quais recomendacoes de escalonamento serao efetivamente acionadas.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Sem desvios relevantes. Manter acompanhamento padrao do inicio do expediente.");
  }

  return recommendations;
}

function buildHandoverText(relevantOccurrences, summaryText) {
  if (relevantOccurrences.length === 0) {
    return "Bom dia. Durante o plantao nao houve ocorrencias relevantes. Ambiente permaneceu sob monitoramento normal.";
  }

  const activeItems = relevantOccurrences.filter((item) => item.isStillActive);
  const normalizedItems = relevantOccurrences.filter((item) => !item.isStillActive);
  const activeSummary = activeItems
    .slice(0, 2)
    .map((item) => item.title)
    .join(" e ");
  const normalizedSummary = normalizedItems
    .slice(0, 1)
    .map((item) => item.title)
    .join(", ");

  const parts = [`Bom dia. ${summaryText}`];

  if (activeSummary) {
    parts.push(
      `Permanecem ativas as ocorrencias ${activeSummary} e devem seguir em acompanhamento pela equipe diurna.`,
    );
  }

  if (normalizedSummary) {
    parts.push(
      `${normalizedSummary} foi normalizado durante o periodo, mantendo apenas registro e observacao de reincidencia.`,
    );
  }

  return parts.join(" ");
}

function buildPlainTextReport({
  title,
  period,
  summaryText,
  relevantOccurrences,
  numbers,
  handoverText,
  observation,
  incidentsCount,
}) {
  const lines = [
    title,
    `PERIODO: ${formatClock(period.start)} AS ${formatClock(period.end)}`,
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
      lines.push(
        `${occurrence.isStillActive ? "Tempo em alarme" : "Duracao"}: ${occurrence.durationText}`,
      );
      lines.push(
        `Situacao: ${occurrence.isStillActive ? "Permanece ativo ate o fechamento do relatorio." : "Normalizado durante o periodo."}`,
      );
      lines.push(`Impacto provavel: ${occurrence.impact}`);
      lines.push(`Acao recomendada: ${occurrence.recommendedAction}`);
      lines.push("");
    });
  }

  if (incidentsCount > relevantOccurrences.length) {
    lines.push(
      `Outras ${Math.max(incidentsCount - relevantOccurrences.length, 0)} ocorrencias menores foram registradas no periodo.`,
    );
    lines.push("");
  }

  lines.push(`TOTAL DE INCIDENTES/ALARMES: ${numbers.totalProblems}`);
  lines.push("");
  lines.push("OBSERVACAO:");
  lines.push(observation);
  lines.push("");
  lines.push("PASSAGEM DE TURNO:");
  lines.push(handoverText);

  return lines.join("\n");
}

export function generateShiftReport({ start, end, incidents, summary }) {
  const numbers = summarizeNumbers(incidents);
  const relevantOccurrences = selectRelevantOccurrences(incidents);
  const summaryText = buildSummaryText(
    incidents,
    numbers,
    relevantOccurrences,
    summary,
  );
  const observation = buildObservation(
    numbers,
    relevantOccurrences,
    incidents.length,
  );
  const handoverText = buildHandoverText(relevantOccurrences, summaryText);
  const title = `RELATORIO NOC - ${formatDate(start)}`;
  const plainTextReport = buildPlainTextReport({
    title,
    period: { start, end },
    summaryText,
    relevantOccurrences,
    numbers,
    handoverText,
    observation,
    incidentsCount: incidents.length,
  });

  return {
    title,
    period: { start, end },
    summary: summaryText,
    numbers,
    incidents,
    relevantOccurrences,
    recommendations: defaultRecommendations(incidents),
    handoverText,
    plainTextReport,
  };
}
