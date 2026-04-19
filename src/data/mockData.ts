import type {
  AIConversation,
  AIExample,
  EventItem,
  HostItem,
  Issue,
  StatMetric,
} from "../types";

export const systemStatus = {
  state: "online" as const,
  summary: "Todos os sistemas operacionais estão funcionais.",
};

export const dashboardStats: StatMetric[] = [
  {
    title: "Hosts monitorados",
    value: "1.248",
    delta: "+8 em 24h",
    icon: "Server",
    tone: "info",
  },
  {
    title: "Problemas ativos",
    value: "14",
    delta: "-2 em 1h",
    icon: "AlertTriangle",
    tone: "danger",
  },
  {
    title: "Enlaces críticos",
    value: "6",
    delta: "+1 em 3h",
    icon: "Wifi",
    tone: "warning",
  },
  {
    title: "Eventos 24h",
    value: "324",
    delta: "+18%",
    icon: "Activity",
    tone: "info",
  },
  {
    title: "Disponibilidade",
    value: "99.87%",
    delta: "+0.04%",
    icon: "ShieldCheck",
    tone: "success",
  },
  {
    title: "Latência média",
    value: "28 ms",
    delta: "-4 ms",
    icon: "Clock3",
    tone: "success",
  },
];

export const activeIssues: Issue[] = [
  {
    id: "ISS-1024",
    severity: "Disaster",
    host: "BR-SP-CORE-01",
    description: "Perda de pacotes em enlace principal.",
    time: "02:14",
    status: "Aberto",
  },
  {
    id: "ISS-1025",
    severity: "High",
    host: "RJ-POP-03",
    description: "Alto jitter detectado em rota de transporte.",
    time: "01:49",
    status: "Em andamento",
  },
  {
    id: "ISS-1026",
    severity: "High",
    host: "POC-VAL-07",
    description: "CPU acima de 85% no switch agregador.",
    time: "01:12",
    status: "Aberto",
  },
  {
    id: "ISS-1027",
    severity: "Disaster",
    host: "MG-BACKBONE-02",
    description: "Manutenção agendada em próximo enlace.",
    time: "00:48",
    status: "Verificado",
  },
];

export const recentEvents: EventItem[] = [
  {
    time: "03:05",
    type: "Alert",
    message: "Interface Gi0/1 apresenta flapping.",
    severity: "Disaster",
  },
  {
    time: "02:42",
    type: "Topology",
    message: "Novo enlace adicionado ao POP Norte.",
    severity: "Info",
  },
  {
    time: "02:10",
    type: "Performance",
    message: "Latência em rota transatlântica acima do limite.",
    severity: "High",
  },
  {
    time: "01:30",
    type: "Health",
    message: "Host BR-SP-FW perdeu conexão SNMP.",
    severity: "Disaster",
  },
];

export const hosts: HostItem[] = [
  {
    id: "H-1001",
    name: "BR-SP-CORE-01",
    ip: "10.1.0.12",
    status: "Online",
    lastChecked: "há 2 min",
    location: "São Paulo",
  },
  {
    id: "H-1002",
    name: "RJ-POP-03",
    ip: "10.2.3.45",
    status: "Degradado",
    lastChecked: "há 4 min",
    location: "Rio de Janeiro",
  },
  {
    id: "H-1003",
    name: "MG-BACKBONE-02",
    ip: "10.3.5.99",
    status: "Online",
    lastChecked: "há 1 min",
    location: "Minas Gerais",
  },
  {
    id: "H-1004",
    name: "POC-VAL-07",
    ip: "10.4.1.22",
    status: "Offline",
    lastChecked: "há 8 min",
    location: "Vale do Paraíba",
  },
  {
    id: "H-1005",
    name: "SP-EDGE-09",
    ip: "10.1.7.88",
    status: "Online",
    lastChecked: "há 3 min",
    location: "São Paulo",
  },
];

export const aiConversation: AIConversation[] = [
  {
    role: "operator",
    message: "Quais hosts estão com falha de hardware?",
    timestamp: "03:10",
  },
  {
    role: "assistant",
    message:
      "Atualmente o host BR-SP-CORE-01 apresenta falha de memória e está em verificação de integridade.",
    timestamp: "03:11",
  },
  {
    role: "operator",
    message: "Resuma os problemas críticos ativos.",
    timestamp: "03:16",
  },
  {
    role: "assistant",
    message:
      "Identificamos 2 problemas críticos: enlace principal com perda de pacotes e host BR-SP-FW sem conexão SNMP.",
    timestamp: "03:17",
  },
];

export const aiExamples: AIExample[] = [
  { label: "Hosts down", prompt: "Quais hosts estão down?" },
  { label: "Enlaces de latência", prompt: "Mostre enlaces com maior latência" },
  { label: "Portas críticas", prompt: "Há portas críticas no POP central?" },
  { label: "Resumo de problemas", prompt: "Resuma os problemas ativos" },
];
