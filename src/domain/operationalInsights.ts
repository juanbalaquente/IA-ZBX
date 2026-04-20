import type { HostItem, Issue } from "../types";

export type OperationalImpact =
  | "Backbone"
  | "Acesso"
  | "Energia"
  | "Enlace"
  | "GPON/OLT"
  | "BGP"
  | "Latencia/Perda"
  | "Equipamento"
  | "Indefinido";

export interface ProblemInsight {
  issue: Issue;
  impact: OperationalImpact;
  priorityScore: number;
  urgency: "immediate" | "soon" | "monitor";
  probableCause: string;
  nextActions: string[];
  escalationMessage: string;
}

export interface OffenderRankingItem {
  host: string;
  total: number;
  disaster: number;
  high: number;
  priorityScore: number;
}

export interface GroupHealthItem {
  group: string;
  total: number;
  online: number;
  offline: number;
  degraded: number;
  availability: number;
}

const impactMatchers: Array<{
  impact: OperationalImpact;
  pattern: RegExp;
  probableCause: string;
  actions: string[];
}> = [
  {
    impact: "GPON/OLT",
    pattern: /\bgpon\b|\bolt\b|\bpon\b|\bonu\b/i,
    probableCause:
      "Possivel falha em OLT, porta PON, uplink de acesso ou alimentacao local.",
    actions: [
      "Validar se a OLT responde por ICMP/SNMP.",
      "Checar uplink, porta PON e alarmes de energia no POP.",
      "Verificar impacto por clientes/ONUs antes de escalar campo.",
    ],
  },
  {
    impact: "BGP",
    pattern: /\bbgp\b|\bpeer\b|\bsess(a|ã)o\b/i,
    probableCause:
      "Possivel queda de sessao BGP, falha de transporte ou indisponibilidade do vizinho.",
    actions: [
      "Validar estado dos peers BGP no roteador.",
      "Checar transporte ate o vizinho e rotas afetadas.",
      "Escalar backbone se houver perda de prefixos ou redundancia comprometida.",
    ],
  },
  {
    impact: "Latencia/Perda",
    pattern: /lat(e|ê)ncia|jitter|perda|packet loss|loss/i,
    probableCause:
      "Possivel degradacao de enlace, saturacao, perda fisica ou instabilidade de transporte.",
    actions: [
      "Comparar latencia/perda com historico recente.",
      "Verificar utilizacao, erros de interface e rota do circuito.",
      "Priorizar enlaces com impacto em backbone, POP ou muitos clientes.",
    ],
  },
  {
    impact: "Energia",
    pattern: /energia|power|ups|nobreak|battery|bateria|retificador/i,
    probableCause:
      "Possivel falha de energia, autonomia reduzida ou indisponibilidade de alimentacao no site.",
    actions: [
      "Confirmar status de energia e autonomia do site.",
      "Validar se ha multiplos equipamentos offline no mesmo POP.",
      "Acionar equipe de campo/infra se a indisponibilidade persistir.",
    ],
  },
  {
    impact: "Enlace",
    pattern: /link|enlace|interface|ethernet|porta|oper down|ifdown/i,
    probableCause:
      "Possivel queda de interface, fibra, porta, modulo optico ou circuito de transporte.",
    actions: [
      "Verificar estado operacional da interface e erros fisicos.",
      "Checar potencia optica/modulo e ultimo flap do circuito.",
      "Validar redundancia antes de escalonar fornecedor ou campo.",
    ],
  },
  {
    impact: "Backbone",
    pattern: /backbone|core|transporte|router|roteador|mpls/i,
    probableCause:
      "Possivel impacto em backbone, transporte ou equipamento de agregacao.",
    actions: [
      "Validar redundancia e rotas afetadas.",
      "Checar alarmes correlatos no mesmo POP/grupo.",
      "Escalar N2/backbone se houver impacto amplo.",
    ],
  },
  {
    impact: "Acesso",
    pattern: /switch|sw-|cto|cliente|acesso|ap_|ap-/i,
    probableCause:
      "Possivel falha em equipamento de acesso, atendimento local ou segmento de clientes.",
    actions: [
      "Confirmar se o host responde e se ha alarmes no mesmo grupo.",
      "Verificar uplink do equipamento de acesso.",
      "Priorizar se houver muitos clientes ou recorrencia no mesmo site.",
    ],
  },
  {
    impact: "Equipamento",
    pattern: /icmp|sem resposta|unavailable|indisponivel|offline|down/i,
    probableCause:
      "Possivel indisponibilidade do equipamento, falha de energia, rede ou gerencia.",
    actions: [
      "Validar ICMP e gerencia SNMP/agent.",
      "Checar conectividade do gateway e equipamentos vizinhos.",
      "Correlacionar com alarmes de energia, interface e POP.",
    ],
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function classifyOperationalImpact(issue: Issue): OperationalImpact {
  const haystack = `${issue.host} ${issue.description}`;
  return (
    impactMatchers.find((matcher) => matcher.pattern.test(haystack))?.impact ??
    "Indefinido"
  );
}

export function getRunbookForIssue(issue: Issue) {
  const impact = classifyOperationalImpact(issue);
  const matcher = impactMatchers.find((item) => item.impact === impact);

  return {
    impact,
    probableCause:
      matcher?.probableCause ??
      "Sem categoria operacional clara. Validar evidencias no Zabbix e no equipamento.",
    actions:
      matcher?.actions ??
      [
        "Validar alarme no Zabbix.",
        "Checar disponibilidade do host e eventos recentes.",
        "Escalar para o time responsavel se houver impacto operacional.",
      ],
  };
}

export function getIssuePriorityScore(issue: Issue) {
  const severityScore = issue.severity === "Disaster" ? 100 : 65;
  const statusScore = issue.status === "Aberto" ? 20 : issue.status === "Em andamento" ? 10 : 0;
  const impact = classifyOperationalImpact(issue);
  const impactScore = ["Backbone", "BGP", "GPON/OLT", "Enlace"].includes(impact)
    ? 20
    : impact === "Energia"
      ? 15
      : 5;

  return severityScore + statusScore + impactScore;
}

export function buildProblemInsight(issue: Issue): ProblemInsight {
  const runbook = getRunbookForIssue(issue);
  const priorityScore = getIssuePriorityScore(issue);
  const urgency =
    priorityScore >= 120 ? "immediate" : priorityScore >= 85 ? "soon" : "monitor";

  return {
    issue,
    impact: runbook.impact,
    priorityScore,
    urgency,
    probableCause: runbook.probableCause,
    nextActions: runbook.actions,
    escalationMessage: [
      `ALERTA ZABBIX - ${issue.severity}`,
      `Host: ${issue.host}`,
      `Impacto: ${runbook.impact}`,
      `Problema: ${issue.description}`,
      `Urgencia: ${urgency}`,
      `Acao inicial: ${runbook.actions[0]}`,
    ].join("\n"),
  };
}

export function buildTopOffenders(issues: Issue[], limit = 5): OffenderRankingItem[] {
  const byHost = new Map<string, OffenderRankingItem>();

  for (const issue of issues) {
    const current =
      byHost.get(issue.host) ??
      {
        host: issue.host,
        total: 0,
        disaster: 0,
        high: 0,
        priorityScore: 0,
      };

    current.total += 1;
    current.disaster += issue.severity === "Disaster" ? 1 : 0;
    current.high += issue.severity === "High" ? 1 : 0;
    current.priorityScore += getIssuePriorityScore(issue);
    byHost.set(issue.host, current);
  }

  return Array.from(byHost.values())
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, limit);
}

export function buildGroupHealth(hosts: HostItem[], limit = 5): GroupHealthItem[] {
  const groups = new Map<string, GroupHealthItem>();

  for (const host of hosts) {
    const groupNames = host.location
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean);

    for (const group of groupNames.length > 0 ? groupNames : ["Sem grupo"]) {
      const current =
        groups.get(group) ??
        {
          group,
          total: 0,
          online: 0,
          offline: 0,
          degraded: 0,
          availability: 0,
        };

      current.total += 1;
      current.online += host.status === "Online" ? 1 : 0;
      current.offline += host.status === "Offline" ? 1 : 0;
      current.degraded += host.status === "Degradado" ? 1 : 0;
      current.availability = current.total ? (current.online / current.total) * 100 : 0;
      groups.set(group, current);
    }
  }

  return Array.from(groups.values())
    .sort((left, right) => {
      const riskDelta =
        right.offline + right.degraded - (left.offline + left.degraded);
      if (riskDelta !== 0) return riskDelta;
      return left.availability - right.availability;
    })
    .slice(0, limit);
}

export function filterIssuesByText(issues: Issue[], search: string) {
  const term = normalizeText(search.trim());
  if (!term) return issues;

  return issues.filter((issue) =>
    normalizeText(`${issue.host} ${issue.description} ${issue.severity}`).includes(term),
  );
}
