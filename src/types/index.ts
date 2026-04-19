export type SystemStatus = "online" | "degraded" | "offline";

export interface StatMetric {
  title: string;
  value: string;
  delta: string;
  icon: string;
  tone: "success" | "warning" | "danger" | "info";
}

export interface Issue {
  id: string;
  severity: "Disaster" | "High" | "Medium" | "Low";
  host: string;
  description: string;
  time: string;
  status: "Aberto" | "Em andamento" | "Verificado";
}

export interface EventItem {
  id?: string;
  time: string;
  host?: string;
  type: string;
  message: string;
  severity: "Info" | "Aviso" | "High" | "Disaster";
}

export interface HostItem {
  id: string;
  name: string;
  ip: string;
  status: "Online" | "Offline" | "Degradado";
  lastChecked: string;
  location: string;
  interfaceType?: "Agent" | "SNMP" | "IPMI" | "JMX" | "Nao definido";
  monitoringMode?: "Monitorado" | "Desabilitado";
  statusReason?: string;
}

export interface TriggerItem {
  id: string;
  description: string;
  host: string;
  severity: "Information" | "Warning" | "Average" | "High" | "Disaster";
  status: "Enabled" | "Disabled";
}

export interface AIConversation {
  role: "operator" | "assistant";
  message: string;
  timestamp: string;
}

export interface AIExample {
  label: string;
  prompt: string;
}
