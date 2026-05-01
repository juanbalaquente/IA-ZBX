const criticalKeywords = [
  "olt",
  "pop",
  "backbone",
  "bgp",
  "core",
  "transporte",
  "link",
  "enlace",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasCriticalKeyword(values) {
  const haystack = normalizeText(values.filter(Boolean).join(" "));
  return criticalKeywords.some((keyword) => haystack.includes(keyword));
}

function increaseSeverity(severity) {
  const order = ["low", "medium", "high", "critical"];
  const currentIndex = order.indexOf(severity);
  return order[Math.min(order.length - 1, currentIndex + 1)] || "medium";
}

export function applyEscalationRules(incident, options = {}) {
  const minDurationMinutes = Number(options.minDurationMinutes ?? 5);
  const affectedGroupThreshold = Number(options.affectedGroupThreshold ?? 5);
  const normalizedDuration = Number(incident.durationMinutes ?? 0);
  const keywordBoost = hasCriticalKeyword([
    incident.title,
    incident.probableCause,
    ...(incident.affectedGroups || []),
    ...(incident.affectedHosts || []),
  ]);

  const result = {
    ...incident,
    severity: incident.severity || "medium",
    status: incident.status || "active",
    classification: incident.classification || "attention",
    escalation: {
      required: false,
      reason: "Sem criterios deterministas de escalonamento.",
      target: "NOC",
      ...(incident.escalation || {}),
    },
  };

  if (keywordBoost) {
    result.severity = increaseSeverity(result.severity);
    result.evidence = [
      ...(result.evidence || []),
      "Palavra-chave operacional critica detectada no incidente.",
    ];
  }

  if (result.sourceSeverity === "Disaster" && normalizedDuration > minDurationMinutes) {
    result.escalation = {
      required: true,
      reason: "Incidente Disaster com duracao acima do limite operacional.",
      target: "Supervisor",
    };
    result.severity = "critical";
  }

  if (
    ["High", "Disaster"].includes(result.sourceSeverity || "") &&
    Number(result.affectedHosts?.length || 0) > affectedGroupThreshold &&
    Number(result.affectedGroups?.length || 0) > 0
  ) {
    result.escalation = {
      required: true,
      reason: "Multiplos hosts afetados no mesmo contexto operacional.",
      target: "Engenharia",
    };
    result.severity = "critical";
    result.classification = "correlated-outage";
  }

  if (normalizedDuration > 0 && normalizedDuration < 3 && result.status === "resolved") {
    result.status = "ignored";
    result.classification = "noise";
    result.escalation = {
      required: false,
      reason: "Normalizacao rapida, tratada como ruido operacional.",
      target: "NOC",
    };
    result.severity = result.severity === "critical" ? "high" : result.severity;
  }

  if (
    Number(result.affectedHosts?.length || 0) <= 1 &&
    Number(result.affectedGroups?.length || 0) <= 1 &&
    !keywordBoost &&
    result.severity === "high"
  ) {
    result.severity = "medium";
    result.classification = "monitoring";
    if (!result.escalation.required) {
      result.escalation = {
        required: false,
        reason: "Host isolado com impacto contido. Monitorar antes de escalar.",
        target: "NOC",
      };
    }
  }

  return result;
}
