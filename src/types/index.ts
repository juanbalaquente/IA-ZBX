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
  source?: "groq-agent" | "openrouter-agent" | "local-parser";
  model?: string;
  contextCounts?: {
    hosts: number;
    problems: number;
    events: number;
  };
}

export interface AIExample {
  label: string;
  prompt: string;
}

export type NightOpsSeverity = "low" | "medium" | "high" | "critical";

export interface NightOpsEscalation {
  required: boolean;
  reason: string;
  target: "NOC" | "Engenharia" | "Campo" | "Supervisor";
}

export interface NightOpsIncident {
  id: string;
  title: string;
  severity: NightOpsSeverity;
  sourceSeverity?: string;
  status: "active" | "monitoring" | "resolved" | "ignored";
  startedAt: string;
  durationMinutes: number;
  affectedHosts: string[];
  affectedGroups: string[];
  problemIds: string[];
  eventIds: string[];
  probableCause: string;
  impact: string;
  evidence: string[];
  recommendedActions: string[];
  escalation: NightOpsEscalation;
  customerMessage: string;
  internalMessage: string;
  confidence: number;
  classification?: string;
}

export interface NightOpsSummary {
  activeProblems: number;
  criticalIncidents: number;
  warningIncidents: number;
  ignoredNoise: number;
  escalationRecommended: number;
}

export interface NightOpsStatus {
  status: "ok";
  generatedAt: string | null;
  summary: NightOpsSummary;
  incidents: NightOpsIncident[];
  shadowDecisions?: NightOpsShadowDecision[];
  analysisSource?: string;
  analysisModel?: string;
  providerSummary?: string;
}

export interface NightOpsShiftReport {
  title: string;
  period: {
    start: string;
    end: string;
  };
  summary: string;
  numbers: {
    totalProblems: number;
    criticalIncidents: number;
    monitoredEvents: number;
    ignoredNoise: number;
    escalations: number;
  };
  incidents: NightOpsIncident[];
  recommendations: string[];
  handoverText: string;
}

export interface NightOpsStoredAnalysis extends NightOpsStatus {
  id: string;
  metadata: {
    totalProblems: number;
    totalIncidents: number;
    escalationRecommended: number;
  };
}

export interface NightOpsHistoryItem extends NightOpsIncident {
  analysisId: string;
  generatedAt: string;
}

export interface NightOpsStoredShiftReport extends NightOpsShiftReport {
  id: string;
  generatedAt: string;
}

export interface NightOpsConfig {
  defaultStartHour: number;
  defaultEndHour: number;
  timezone: string;
  minDurationMinutes: number;
  correlationWindowMinutes: number;
  sameGroupAffectedHostsThreshold: number;
  allowedHostGroups: string[];
  criticalKeywords: string[];
  autoEscalationEnabled: boolean;
  shadowModeEnabled: boolean;
  shadowModeRetentionDays: number;
}

export type NightOpsShadowDecisionType =
  | "ignore"
  | "monitor"
  | "recommend_escalation";

export type NightOpsShadowValidationStatus =
  | "pending"
  | "correct"
  | "false_positive"
  | "false_negative"
  | "partially_correct";

export interface NightOpsShadowDecision {
  id: string;
  createdAt: string;
  analysisId: string;
  incidentId: string;
  decision: NightOpsShadowDecisionType;
  wouldNotify: boolean;
  severity: NightOpsSeverity;
  reason: string;
  evidence: string[];
  confidence: number;
  humanValidation: {
    status: NightOpsShadowValidationStatus;
    validatedBy: string | null;
    validatedAt: string | null;
    notes: string;
  };
}

export interface NightOpsShadowMetrics {
  total: number;
  pending: number;
  correct: number;
  falsePositive: number;
  falseNegative: number;
  partiallyCorrect: number;
  wouldNotify: number;
  recommendEscalation: number;
  monitor: number;
  ignore: number;
}
