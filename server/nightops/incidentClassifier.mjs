import { applyEscalationRules } from "./escalationRules.mjs";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizePattern(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function mapSourceSeverity(sourceSeverity) {
  switch (sourceSeverity) {
    case "Disaster":
      return "critical";
    case "High":
      return "high";
    case "Average":
      return "medium";
    default:
      return "low";
  }
}

function buildIncidentId(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}-${random}`;
}

function inferStatus(problem) {
  if (problem.recoveryAtTs) {
    return "resolved";
  }

  return problem.acknowledged ? "monitoring" : "active";
}

function buildCauseHint(problem, options = {}) {
  const text = normalizeText([problem.title, problem.triggerDescription, ...(problem.groups || [])].join(" "));
  const configuredKeywords = Array.isArray(options.criticalKeywords)
    ? options.criticalKeywords.map((keyword) => normalizeText(keyword))
    : [];

  if (/(link|enlace|backbone|transporte|uplink)/.test(text) || configuredKeywords.some((keyword) => ["link", "enlace", "backbone", "transporte"].includes(keyword) && text.includes(keyword))) {
    return "Indicativo de indisponibilidade ou degradacao de transporte/enlace.";
  }

  if (/(olt|pon|cto)/.test(text) || configuredKeywords.some((keyword) => ["olt", "pon", "cto", "pop"].includes(keyword) && text.includes(keyword))) {
    return "Indicativo de falha de acesso FTTH/OLT ou concentracao regional.";
  }

  if (/(bgp|core|routing|roteamento)/.test(text) || configuredKeywords.some((keyword) => ["bgp", "core"].includes(keyword) && text.includes(keyword))) {
    return "Possivel impacto de roteamento ou infraestrutura core.";
  }

  return "Necessaria validacao operacional no host e na trigger associada.";
}

function matchesConfiguredPatterns(problem, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }

  const haystack = [
    problem.host,
    problem.hostTechnicalName,
    problem.title,
    problem.name,
    problem.triggerDescription,
    ...(problem.groups || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return patterns
    .map(normalizePattern)
    .filter(Boolean)
    .some((pattern) => haystack.includes(pattern));
}

export function classifyProblem(problem, options = {}) {
  const nowTs = Number(options.nowTs ?? Date.now());
  const startedAtTs = Number(problem.startedAtTs ?? nowTs);
  const endedAtTs = Number(problem.recoveryAtTs ?? nowTs);
  const durationMinutes = Math.max(0, Math.round((endedAtTs - startedAtTs) / 60000));

  const baseIncident = {
    id: buildIncidentId(options.now ? new Date(options.now) : new Date(nowTs)),
    title: problem.title || problem.name || "Incidente operacional",
    severity: mapSourceSeverity(problem.severity),
    sourceSeverity: problem.severity,
    status: inferStatus(problem),
    classification: "attention",
    startedAt: new Date(startedAtTs).toISOString(),
    endedAt: problem.recoveryAtTs ? new Date(problem.recoveryAtTs).toISOString() : null,
    durationMinutes,
    affectedHosts: [problem.host].filter(Boolean),
    affectedGroups: problem.groups || [],
    problemIds: [problem.id].filter(Boolean),
    eventIds: [problem.eventid].filter(Boolean),
    probableCause: buildCauseHint(problem, options.rules),
    impact: `Afeta ${problem.host || "host nao identificado"}${problem.groups?.length ? ` no grupo ${problem.groups.join(", ")}` : ""}.`,
    evidence: [
      `Problema: ${problem.title || problem.name}`,
      `Severidade original: ${problem.severity}`,
      `Host: ${problem.host || "Sem host"}`,
    ],
    recommendedActions: [
      "Validar o host e a trigger no Zabbix.",
      "Confirmar alcance do impacto com a equipe de monitoracao.",
    ],
    escalation: {
      required: false,
      reason: "Aguardando regras deterministicas.",
      target: "NOC",
    },
    customerMessage:
      "Estamos validando um evento monitorado. No momento, a equipe acompanha o comportamento antes de qualquer acionamento.",
    internalMessage:
      "Evento classificado automaticamente para triagem inicial do NOC. Validar host, grupo e historico recente.",
    confidence: 0.58,
    metadata: {
      host: problem.host,
      hostId: problem.hostId,
      triggerId: problem.triggerid,
      keywords: normalizeText(problem.title).split(/[^a-z0-9]+/).filter(Boolean),
    },
  };

  const criticalPatternMatch =
    matchesConfiguredPatterns(problem, options.rules?.criticalHostPatterns) ||
    matchesConfiguredPatterns(problem, options.rules?.alwaysIncludeHostPatterns);

  if (criticalPatternMatch) {
    if (problem.host && !normalizeText(baseIncident.title).includes(normalizeText(problem.host))) {
      baseIncident.title = `${problem.host} - ${baseIncident.title}`;
    }
    baseIncident.severity = "critical";
    baseIncident.classification = "critical";
    baseIncident.probableCause =
      "Host X9 de importancia maxima na rede. Necessaria validacao imediata da disponibilidade e do caminho operacional.";
    baseIncident.impact =
      "Host X9 de importancia maxima na rede, com potencial impacto operacional relevante.";
    baseIncident.recommendedActions = [
      "Validar imediatamente disponibilidade, rota/enlace e impacto operacional do host X9.",
      "Manter acompanhamento continuo pelo NOC e seguir o procedimento interno para ativos criticos.",
    ];
    baseIncident.escalation = {
      required: true,
      reason: "Host X9 tratado como ativo critico de importancia maxima na rede.",
      target: "NOC",
    };
    baseIncident.customerMessage =
      "Estamos validando um evento em ativo critico da rede. A equipe acompanha o comportamento com prioridade maxima.";
    baseIncident.internalMessage =
      "Host X9 identificado no evento. Validar imediatamente disponibilidade, rota/enlace e impacto operacional.";
    baseIncident.confidence = Math.max(Number(baseIncident.confidence || 0), 0.9);
    baseIncident.evidence = [
      ...baseIncident.evidence,
      "Regra operacional aplicada: host com padrao critico X9.",
    ];
    baseIncident.metadata = {
      ...baseIncident.metadata,
      criticalPatternMatch: true,
    };
  }

  return applyEscalationRules(baseIncident, options.rules);
}
