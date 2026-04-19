import type {
  EventItem,
  HostItem,
  Issue,
  StatMetric,
  TriggerItem,
} from "../types";

const interfaceTypeMap: Record<string, HostItem["interfaceType"]> = {
  "1": "Agent",
  "2": "SNMP",
  "3": "IPMI",
  "4": "JMX",
};

const eventSeverityMap: Record<string, EventItem["severity"]> = {
  "0": "Info",
  "1": "Aviso",
  "2": "Aviso",
  "3": "Aviso",
  "4": "High",
  "5": "Disaster",
};

const problemSeverityMap: Record<string, Issue["severity"]> = {
  "0": "Low",
  "1": "Low",
  "2": "Low",
  "3": "Medium",
  "4": "High",
  "5": "Disaster",
};

const triggerSeverityMap: Record<string, TriggerItem["severity"]> = {
  "0": "Information",
  "1": "Warning",
  "2": "Average",
  "3": "High",
  "4": "Disaster",
  "5": "Disaster",
};

function formatTimestamp(timestamp?: string | number): string {
  if (!timestamp) {
    return "Nao disponivel";
  }

  const epoch =
    typeof timestamp === "string" ? Number(timestamp) * 1000 : timestamp * 1000;
  if (Number.isNaN(epoch)) {
    return "Nao disponivel";
  }

  const diff = Date.now() - epoch;
  if (diff < 60_000) {
    return "ha alguns segundos";
  }
  if (diff < 3_600_000) {
    return `ha ${Math.max(1, Math.floor(diff / 60_000))} min`;
  }
  if (diff < 86_400_000) {
    return `ha ${Math.max(1, Math.floor(diff / 3_600_000))} h`;
  }

  return new Date(epoch).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHostLocation(groups?: Array<{ name: string }>): string {
  if (!groups || groups.length === 0) {
    return "Sem grupo";
  }

  return groups.map((group) => group.name).join(", ");
}

function formatEventType(raw: any): string {
  const source = String(raw.source ?? "");
  const object = String(raw.object ?? "");

  if (source === "0" && object === "0") {
    return "Trigger";
  }

  if (source === "1") {
    return "Discovery";
  }

  if (source === "2") {
    return "Auto registration";
  }

  if (source === "3") {
    return "Internal";
  }

  return "Evento";
}

function getInterfaceType(rawInterface?: { type?: string }): HostItem["interfaceType"] {
  return interfaceTypeMap[String(rawInterface?.type ?? "")] ?? "Nao definido";
}

function getHostStatus(
  raw: any,
  rawInterface?: { available?: string; type?: string },
): Pick<HostItem, "status" | "monitoringMode" | "statusReason"> {
  const interfaceType = getInterfaceType(rawInterface);

  if (String(raw.status) === "1") {
    return {
      status: "Offline",
      monitoringMode: "Desabilitado",
      statusReason: "Host desabilitado no Zabbix.",
    };
  }

  if (String(raw.maintenance_status) === "1") {
    return {
      status: "Degradado",
      monitoringMode: "Monitorado",
      statusReason: "Host em janela de manutencao.",
    };
  }

  switch (String(rawInterface?.available ?? "")) {
    case "1":
      return {
        status: "Online",
        monitoringMode: "Monitorado",
        statusReason: `Interface principal ${interfaceType} esta respondendo.`,
      };
    case "2":
      return {
        status: "Offline",
        monitoringMode: "Monitorado",
        statusReason: `Interface principal ${interfaceType} esta indisponivel.`,
      };
    default:
      return {
        status: "Degradado",
        monitoringMode: "Monitorado",
        statusReason: `Sem telemetria recente da interface ${interfaceType}.`,
      };
  }
}

function formatHostLastChecked(
  timestamp: string | number | undefined,
  available?: string,
): string {
  if (timestamp) {
    return formatTimestamp(timestamp);
  }

  switch (String(available ?? "")) {
    case "1":
      return "Coleta ativa";
    case "2":
      return "Sem resposta recente";
    default:
      return "Sem historico recente";
  }
}

export function adaptHostItem(raw: any): HostItem {
  const mainInterface =
    raw.interfaces?.find((item: any) => item.main === "1") ?? raw.interfaces?.[0];
  const ip = mainInterface?.ip ?? "N/A";
  const location = formatHostLocation(raw.groups);
  const interfaceType = getInterfaceType(mainInterface);
  const { status, monitoringMode, statusReason } = getHostStatus(
    raw,
    mainInterface,
  );

  return {
    id: raw.hostid,
    name: raw.name || raw.host || "Sem nome",
    ip,
    status,
    lastChecked: formatHostLastChecked(raw.lastaccess, mainInterface?.available),
    location,
    interfaceType,
    monitoringMode,
    statusReason,
  };
}

export function adaptProblemItem(raw: any, hostName?: string): Issue {
  const host = hostName || raw.hosts?.[0]?.host || "Sem host";
  const severity = problemSeverityMap[String(raw.severity)] ?? "Low";
  const status = raw.acknowledged === "1" ? "Verificado" : "Aberto";

  return {
    id: raw.eventid,
    severity,
    host,
    description: raw.name || raw.description || "Problema sem descricao",
    time: formatTimestamp(raw.clock),
    status,
  };
}

export function adaptEventItem(raw: any): EventItem {
  const severity = eventSeverityMap[String(raw.severity)] ?? "Info";
  const type = formatEventType(raw);
  const message = raw.name || raw.value || "Evento operacional";
  const host = raw.hosts?.[0]?.host || "Sem host";

  return {
    id: raw.eventid || `${raw.clock}-${message}`,
    time: formatTimestamp(raw.clock),
    host,
    type,
    message,
    severity,
  };
}

export function adaptTriggerItem(raw: any): TriggerItem {
  const host = raw.hosts?.[0]?.host || "Sem host";
  const severity = triggerSeverityMap[String(raw.priority)] ?? "Information";
  const status = raw.status === "0" ? "Enabled" : "Disabled";

  return {
    id: raw.triggerid,
    description: raw.description || "Trigger sem descricao",
    host,
    severity,
    status,
  };
}

export function createDashboardStats(
  hosts: HostItem[],
  problems: Issue[],
  events: EventItem[],
): StatMetric[] {
  const totalHosts = hosts.length;
  const onlineHosts = hosts.filter((host) => host.status === "Online").length;
  const availability = totalHosts
    ? `${((onlineHosts / totalHosts) * 100).toFixed(2)}%`
    : "0.00%";

  return [
    {
      title: "Hosts monitorados",
      value: String(totalHosts),
      delta: `${onlineHosts} online`,
      icon: "Server",
      tone: "info",
    },
    {
      title: "Problemas ativos",
      value: String(problems.length),
      delta: problems.length > 0 ? "Atencao necessaria" : "Sem incidentes",
      icon: "AlertTriangle",
      tone: problems.length > 0 ? "danger" : "success",
    },
    {
      title: "Eventos recentes",
      value: String(events.length),
      delta: "Ultimas 24h",
      icon: "Activity",
      tone: "info",
    },
    {
      title: "Disponibilidade",
      value: availability,
      delta: `${onlineHosts}/${totalHosts} hosts ativos`,
      icon: "ShieldCheck",
      tone: onlineHosts === totalHosts ? "success" : "warning",
    },
  ];
}
