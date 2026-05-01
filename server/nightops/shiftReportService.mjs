function summarizeNumbers(incidents) {
  return {
    totalProblems: incidents.reduce((total, incident) => total + (incident.problemIds?.length || 0), 0),
    criticalIncidents: incidents.filter((incident) => incident.severity === "critical").length,
    monitoredEvents: incidents.filter((incident) => incident.status === "monitoring").length,
    ignoredNoise: incidents.filter((incident) => incident.status === "ignored").length,
    escalations: incidents.filter((incident) => incident.escalation?.required).length,
  };
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

export function generateShiftReport({ start, end, incidents, summary }) {
  const numbers = summarizeNumbers(incidents);
  const summaryText = summary ||
    (incidents.length === 0
      ? "Turno sem incidentes relevantes correlacionados."
      : `${incidents.length} incidentes consolidados no turno, com ${numbers.criticalIncidents} criticidade alta/critica e ${numbers.escalations} recomendacoes de escalonamento.`);

  return {
    title: "Relatorio NOC Noturno",
    period: { start, end },
    summary: summaryText,
    numbers,
    incidents,
    recommendations: defaultRecommendations(incidents),
    handoverText: incidents.length === 0
      ? "Turno noturno sem ocorrencias relevantes. Ambiente permaneceu sob monitoramento normal."
      : `Passagem de turno: ${summaryText} Priorizar a revisao dos incidentes com escalonamento recomendado e validar eventual necessidade de acao manual.`,
  };
}
