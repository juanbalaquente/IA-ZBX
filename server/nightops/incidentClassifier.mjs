import { applyEscalationRules } from "./escalationRules.mjs";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function buildCauseHint(problem) {
  const text = normalizeText([problem.title, problem.triggerDescription, ...(problem.groups || [])].join(" "));

  if (/(link|enlace|backbone|transporte|uplink)/.test(text)) {
    return "Indicativo de indisponibilidade ou degradacao de transporte/enlace.";
  }

  if (/(olt|pon|cto)/.test(text)) {
    return "Indicativo de falha de acesso FTTH/OLT ou concentracao regional.";
  }

  if (/(bgp|core|routing|roteamento)/.test(text)) {
    return "Possivel impacto de roteamento ou infraestrutura core.";
  }

  return "Necessaria validacao operacional no host e na trigger associada.";
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
    durationMinutes,
    affectedHosts: [problem.host].filter(Boolean),
    affectedGroups: problem.groups || [],
    problemIds: [problem.id].filter(Boolean),
    eventIds: [problem.eventid].filter(Boolean),
    probableCause: buildCauseHint(problem),
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

  return applyEscalationRules(baseIncident, options.rules);
}
