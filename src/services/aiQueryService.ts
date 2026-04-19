import { queryEvents, queryHosts, queryProblems } from "./mcpClient";
import type { EventItem, HostItem, Issue } from "../types";

export const aiQuerySuggestions = [
  "Quais hosts estao offline?",
  "Top 10 hosts com olt no nome",
  "Quais hosts tem o IP 10.200.12.114?",
  "Hosts com olt no nome e offline",
  "Quais hosts do grupo speednet estao offline?",
  "Quais alarmes do host 10031-260GS_ARENA_MRV?",
  "Liste os eventos recentes",
];

const ignoredHostTerms = new Set([
  "a",
  "as",
  "com",
  "contexto",
  "contendo",
  "contem",
  "de",
  "da",
  "das",
  "detalhar",
  "detalhe",
  "dispositivos",
  "do",
  "dos",
  "down",
  "e",
  "em",
  "endereco",
  "evento",
  "eventos",
  "esta",
  "estao",
  "grupo",
  "grupos",
  "host",
  "hosts",
  "inventario",
  "ip",
  "listar",
  "liste",
  "me",
  "monitorados",
  "mostre",
  "mostrar",
  "na",
  "nas",
  "nao",
  "no",
  "nome",
  "nos",
  "o",
  "ativo",
  "ativos",
  "alarme",
  "alarmes",
  "desastre",
  "disaster",
  "high",
  "incidente",
  "incidentes",
  "offline",
  "online",
  "os",
  "para",
  "pop",
  "problema",
  "problemas",
  "procure",
  "qual",
  "quais",
  "quantidade",
  "quantos",
  "que",
  "retornar",
  "retorne",
  "site",
  "sem",
  "sobre",
  "status",
  "tem",
  "tenha",
  "tenham",
  "tiver",
  "tiverem",
  "top",
  "ultimas",
  "ultimos",
  "primeiras",
  "primeiros",
]);

type HostStatusFilter = HostItem["status"] | null;
type ProblemSeverityFilter = Issue["severity"] | null;

interface HostSearchCriteria {
  status: HostStatusFilter;
  excludedStatus: HostStatusFilter;
  excludedProblemSeverity: ProblemSeverityFilter;
  nameTokens: string[];
  groupTokens: string[];
  generalTokens: string[];
  ipTerms: string[];
}

const defaultResultLimit = 5;
const maxResultLimit = 20;

function normalizeQuery(query: string) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueTokens(tokens: string[]) {
  return Array.from(new Set(tokens));
}

function tokenizeTerms(fragment: string) {
  return uniqueTokens(
    normalizeQuery(fragment)
      .split(/[^a-z0-9._-]+/)
      .filter((token) => token.length >= 3 && !ignoredHostTerms.has(token)),
  );
}

function extractIpTerms(query: string) {
  return normalizeQuery(query).match(/\b\d{1,3}(?:\.\d{1,3}){1,3}\b/g) ?? [];
}

function stripKnownSegments(query: string) {
  return normalizeQuery(query)
    .replace(/\b\d{1,3}(?:\.\d{1,3}){1,3}\b/g, " ")
    .replace(/(?:com\s+)?([a-z0-9._-]+)\s+no\s+nome/g, " ")
    .replace(/nome\s+(?:contendo|com)\s+([a-z0-9._-]+)/g, " ")
    .replace(/grupo\s+(?:contendo|com|do|da)\s+([a-z0-9._-]+)/g, " ")
    .replace(/do\s+grupo\s+([a-z0-9._-]+)/g, " ")
    .replace(/da\s+grupo\s+([a-z0-9._-]+)/g, " ");
}

function extractNameTokens(query: string) {
  const normalized = normalizeQuery(query);
  const tokens = [
    ...Array.from(
      normalized.matchAll(/(?:com\s+)?([a-z0-9._-]+)\s+no\s+nome/g),
      (match) => match[1],
    ),
    ...Array.from(
      normalized.matchAll(/nome\s+(?:contendo|com)\s+([a-z0-9._-]+)/g),
      (match) => match[1],
    ),
  ];

  return uniqueTokens(tokens.filter((token) => token.length >= 2));
}

function extractGroupTokens(query: string) {
  const normalized = normalizeQuery(query);
  const tokens = [
    ...Array.from(
      normalized.matchAll(/grupo\s+(?:contendo|com|do|da)\s+([a-z0-9._-]+)/g),
      (match) => match[1],
    ),
    ...Array.from(
      normalized.matchAll(/do\s+grupo\s+([a-z0-9._-]+)/g),
      (match) => match[1],
    ),
  ];

  return uniqueTokens(tokens.filter((token) => token.length >= 2));
}

function wantsCount(query: string) {
  return /\bquantos\b|\bquantidade\b|\btotal\b/.test(query);
}

function getResultLimit(query: string) {
  const normalized = normalizeQuery(query);
  const patterns = [
    /\btop\s+(\d{1,2})\b/,
    /\bprimeiros?\s+(\d{1,2})\b/,
    /\bultimos?\s+(\d{1,2})\b/,
    /\bmostre\s+(\d{1,2})\b/,
    /\bliste\s+(\d{1,2})\b/,
    /\blistar\s+(\d{1,2})\b/,
    /\bretorne\s+(\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.min(parsed, maxResultLimit);
      }
    }
  }

  return defaultResultLimit;
}

function getStatusFilter(query: string): HostStatusFilter {
  if (/nao .*offline|nao estao offline|nao esteja offline|sem estar offline/.test(query)) {
    return null;
  }

  if (/nao .*online|nao estao online|nao esteja online|sem estar online/.test(query)) {
    return null;
  }

  if (/nao .*degradad|sem estar degradad/.test(query)) {
    return null;
  }

  if (/\boffline\b|\bdown\b|indisponiveis?/.test(query)) {
    return "Offline";
  }

  if (/degradad/.test(query)) {
    return "Degradado";
  }

  if (/\bonline\b|\bativos?\b/.test(query)) {
    return "Online";
  }

  return null;
}

function getExcludedStatusFilter(query: string): HostStatusFilter {
  if (/nao .*offline|nao estao offline|nao esteja offline|sem estar offline/.test(query)) {
    return "Offline";
  }

  if (/nao .*online|nao estao online|nao esteja online|sem estar online/.test(query)) {
    return "Online";
  }

  if (/nao .*degradad|sem estar degradad/.test(query)) {
    return "Degradado";
  }

  return null;
}

function getExcludedProblemSeverity(query: string): ProblemSeverityFilter {
  if (/sem alarmes? disaster|sem disaster|nao .*disaster|nao .*desastre/.test(query)) {
    return "Disaster";
  }

  if (/sem alarmes? high|sem high|nao .*high|nao .*alto/.test(query)) {
    return "High";
  }

  if (/sem alarmes?|sem incidentes?|sem problemas?/.test(query)) {
    return null;
  }

  return null;
}

function getHostCriteria(query: string): HostSearchCriteria {
  const stripped = stripKnownSegments(query);

  return {
    status: getStatusFilter(normalizeQuery(query)),
    excludedStatus: getExcludedStatusFilter(normalizeQuery(query)),
    excludedProblemSeverity: getExcludedProblemSeverity(normalizeQuery(query)),
    nameTokens: extractNameTokens(query),
    groupTokens: extractGroupTokens(query),
    generalTokens: tokenizeTerms(stripped),
    ipTerms: extractIpTerms(query),
  };
}

function countBySeverity(problems: Issue[]) {
  return {
    disaster: problems.filter((problem) => problem.severity === "Disaster").length,
    high: problems.filter((problem) => problem.severity === "High").length,
  };
}

function formatSingleHost(host: HostItem) {
  return `${host.name} (${host.ip}) | status ${host.status} | interface ${host.interfaceType ?? "Nao definida"} | grupos ${host.location} | motivo ${host.statusReason ?? "Sem detalhe adicional"} | ultimo check ${host.lastChecked}.`;
}

function formatHostInventorySummary(hosts: HostItem[]) {
  if (hosts.length === 0) {
    return "Nao ha hosts retornados pelo Zabbix no momento.";
  }

  const onlineCount = hosts.filter((host) => host.status === "Online").length;
  const offlineCount = hosts.filter((host) => host.status === "Offline").length;
  const degradedCount = hosts.filter(
    (host) => host.status === "Degradado",
  ).length;

  return `Inventario de hosts (${hosts.length}). Online: ${onlineCount}. Offline: ${offlineCount}. Degradado: ${degradedCount}.`;
}

function filterHosts(hosts: HostItem[], criteria: HostSearchCriteria) {
  return hosts.filter((host) => {
    if (criteria.status && host.status !== criteria.status) {
      return false;
    }

    if (criteria.excludedStatus && host.status === criteria.excludedStatus) {
      return false;
    }

    if (criteria.ipTerms.length > 0 && !criteria.ipTerms.some((ip) => host.ip.includes(ip))) {
      return false;
    }

    const normalizedName = normalizeQuery(host.name);
    const normalizedGroup = normalizeQuery(host.location);
    const normalizedGeneral = normalizeQuery(
      [host.name, host.ip, host.location].join(" "),
    );

    if (
      criteria.nameTokens.length > 0 &&
      !criteria.nameTokens.every((token) => normalizedName.includes(token))
    ) {
      return false;
    }

    if (
      criteria.groupTokens.length > 0 &&
      !criteria.groupTokens.every((token) => normalizedGroup.includes(token))
    ) {
      return false;
    }

    if (
      criteria.generalTokens.length > 0 &&
      !criteria.generalTokens.every((token) => normalizedGeneral.includes(token))
    ) {
      return false;
    }

    return true;
  });
}

function describeCriteria(criteria: HostSearchCriteria) {
  const parts: string[] = [];

  if (criteria.status) {
    parts.push(`status ${criteria.status.toLowerCase()}`);
  }

  if (criteria.excludedStatus) {
    parts.push(`sem status ${criteria.excludedStatus.toLowerCase()}`);
  }

  if (criteria.excludedProblemSeverity) {
    parts.push(`sem alarmes ${criteria.excludedProblemSeverity.toLowerCase()}`);
  }

  if (criteria.ipTerms.length > 0) {
    parts.push(`IP ${criteria.ipTerms.join(", ")}`);
  }

  if (criteria.nameTokens.length > 0) {
    parts.push(`nome contendo ${criteria.nameTokens.join(", ")}`);
  }

  if (criteria.groupTokens.length > 0) {
    parts.push(`grupo contendo ${criteria.groupTokens.join(", ")}`);
  }

  if (criteria.generalTokens.length > 0) {
    parts.push(`termos ${criteria.generalTokens.join(", ")}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "sem filtro especifico";
}

function formatHostsResult(
  hosts: HostItem[],
  criteria: HostSearchCriteria,
  label: string,
  limit: number,
  countOnly = false,
) {
  if (hosts.length === 0) {
    return `Nao encontrei hosts para ${describeCriteria(criteria)}.`;
  }

  if (countOnly) {
    return `Encontrei ${hosts.length} hosts para ${describeCriteria(criteria)}.`;
  }

  return `${label} (${hosts.length}) para ${describeCriteria(criteria)}. ${hosts
    .slice(0, limit)
    .map((host) => formatSingleHost(host))
    .join(" ")}`;
}

function filterHostsWithoutProblems(
  hosts: HostItem[],
  problems: Issue[],
  severity: ProblemSeverityFilter,
) {
  if (!severity) {
    return hosts.filter((host) => {
      return !problems.some(
        (problem) => normalizeQuery(problem.host) === normalizeQuery(host.name),
      );
    });
  }

  return hosts.filter((host) => {
    return !problems.some(
      (problem) =>
        normalizeQuery(problem.host) === normalizeQuery(host.name) &&
        problem.severity === severity,
    );
  });
}

function formatProblemSummary(problems: Issue[], limit: number) {
  if (problems.length === 0) {
    return "Nao ha alarmes High ou Disaster ativos no momento.";
  }

  const { disaster, high } = countBySeverity(problems);
  const highlights = problems
    .slice(0, limit)
    .map(
      (problem) =>
        `[${problem.severity}] ${problem.host}: ${problem.description} (${problem.status}, ${problem.time})`,
    );

  return `Alarmes ativos (${problems.length}). Disaster: ${disaster}. High: ${high}. ${highlights.join("; ")}.`;
}

function formatFilteredProblemSummary(
  problems: Issue[],
  severity: "High" | "Disaster",
  limit: number,
) {
  const filteredProblems = problems.filter(
    (problem) => problem.severity === severity,
  );

  if (filteredProblems.length === 0) {
    return `Nao ha alarmes ${severity} ativos no momento.`;
  }

  return `Alarmes ${severity} (${filteredProblems.length}): ${filteredProblems
    .slice(0, limit)
    .map(
      (problem) =>
        `${problem.host}: ${problem.description} (${problem.status}, ${problem.time})`,
    )
    .join("; ")}.`;
}

function formatHostScopedProblems(
  problems: Issue[],
  hostTerms: string[],
  limit: number,
  countOnly = false,
) {
  const matches = problems.filter((problem) => {
    const haystack = normalizeQuery([problem.host, problem.description].join(" "));
    return hostTerms.every((term) => haystack.includes(term));
  });

  if (matches.length === 0) {
    return `Nao encontrei alarmes para os termos: ${hostTerms.join(", ")}.`;
  }

  if (countOnly) {
    return `Encontrei ${matches.length} alarmes para os termos: ${hostTerms.join(", ")}.`;
  }

  return `Alarmes encontrados (${matches.length}) para ${hostTerms.join(", ")}: ${matches
    .slice(0, limit)
    .map(
      (problem) =>
        `[${problem.severity}] ${problem.host}: ${problem.description} (${problem.status}, ${problem.time})`,
    )
    .join("; ")}.`;
}

function formatEventSummary(events: EventItem[], limit: number) {
  if (events.length === 0) {
    return "Nao ha eventos High ou Disaster recentes.";
  }

  const disasterCount = events.filter(
    (event) => event.severity === "Disaster",
  ).length;
  const highCount = events.filter((event) => event.severity === "High").length;

  return `Eventos recentes (${events.length}). Disaster: ${disasterCount}. High: ${highCount}. ${events
    .slice(0, limit)
    .map(
      (event) =>
        `[${event.severity}] ${event.time} - ${event.host ?? "Sem host"} - ${event.type}: ${event.message}`,
    )
    .join("; ")}.`;
}

function formatHostScopedEvents(
  events: EventItem[],
  hostTerms: string[],
  limit: number,
  countOnly = false,
) {
  const matches = events.filter((event) => {
    const haystack = normalizeQuery(
      [event.host ?? "", event.type, event.message].join(" "),
    );
    return hostTerms.every((term) => haystack.includes(term));
  });

  if (matches.length === 0) {
    return `Nao encontrei eventos para os termos: ${hostTerms.join(", ")}.`;
  }

  if (countOnly) {
    return `Encontrei ${matches.length} eventos para os termos: ${hostTerms.join(", ")}.`;
  }

  return `Eventos encontrados (${matches.length}) para ${hostTerms.join(", ")}: ${matches
    .slice(0, limit)
    .map(
      (event) =>
        `[${event.severity}] ${event.time} - ${event.host ?? "Sem host"} - ${event.type}: ${event.message}`,
    )
    .join("; ")}.`;
}

export async function resolveAIQuery(query: string) {
  const normalized = normalizeQuery(query);
  const criteria = getHostCriteria(query);
  const countOnly = wantsCount(normalized);
  const hasHostTerms =
    criteria.nameTokens.length > 0 ||
    criteria.groupTokens.length > 0 ||
    criteria.generalTokens.length > 0 ||
    criteria.ipTerms.length > 0;
  const limit = getResultLimit(query);
  const isHostQuery =
    /hosts?|host|inventario|dispositivos|nome|grupo|site|pop|backbone|ip|endereco/.test(
      normalized,
    );
  const requestsHostsWithoutProblems =
    isHostQuery &&
    /sem alarmes?|sem incidentes?|sem problemas?|nao .*disaster|nao .*desastre|nao .*high/.test(
      normalized,
    );

  if (requestsHostsWithoutProblems) {
    const [hosts, problems] = await Promise.all([queryHosts(), queryProblems()]);
    const initialMatches =
      !hasHostTerms && !criteria.status ? hosts : filterHosts(hosts, criteria);
    const matches = filterHostsWithoutProblems(
      initialMatches,
      problems,
      criteria.excludedProblemSeverity,
    );

    return formatHostsResult(
      matches,
      criteria,
      "Hosts encontrados",
      limit,
      countOnly,
    );
  }

  if (
    /problemas?|incidentes?|alarmes?/.test(normalized) &&
    hasHostTerms &&
    !isHostQuery
  ) {
    const problems = await queryProblems();
    return formatHostScopedProblems(
      problems,
      [
        ...criteria.nameTokens,
        ...criteria.groupTokens,
        ...criteria.generalTokens,
        ...criteria.ipTerms,
      ],
      limit,
      countOnly,
    );
  }

  if (/eventos?|logs?|latencia|jitter/.test(normalized) && hasHostTerms && !isHostQuery) {
    const events = await queryEvents();
    return formatHostScopedEvents(
      events,
      [
        ...criteria.nameTokens,
        ...criteria.groupTokens,
        ...criteria.generalTokens,
        ...criteria.ipTerms,
      ],
      limit,
      countOnly,
    );
  }

  if (/desastre|disaster/.test(normalized)) {
    const problems = await queryProblems();
    return formatFilteredProblemSummary(problems, "Disaster", limit);
  }

  if (/\bhigh\b|altos?|alto/.test(normalized)) {
    const problems = await queryProblems();
    return formatFilteredProblemSummary(problems, "High", limit);
  }

  if (/problemas?|incidentes?|alarmes?/.test(normalized)) {
    const problems = await queryProblems();
    return formatProblemSummary(problems, limit);
  }

  if (/eventos?|logs?|latencia|jitter/.test(normalized)) {
    const events = await queryEvents();
    return formatEventSummary(events, limit);
  }

  if (isHostQuery) {
    const hosts = await queryHosts();

    if (!hasHostTerms && !criteria.status) {
      return formatHostInventorySummary(hosts);
    }

    let matches = filterHosts(hosts, criteria);

    if (/sem alarmes?|sem incidentes?|sem problemas?|nao .*disaster|nao .*desastre|nao .*high/.test(normalized)) {
      const problems = await queryProblems();
      matches = filterHostsWithoutProblems(
        matches,
        problems,
        criteria.excludedProblemSeverity,
      );
    }

    return formatHostsResult(
      matches,
      criteria,
      "Hosts encontrados",
      limit,
      countOnly,
    );
  }

  return "Nao encontrei uma acao direta para essa consulta. Tente perguntar sobre hosts offline, hosts por nome, hosts por grupo, busca por IP, alarmes do host ou eventos recentes.";
}
