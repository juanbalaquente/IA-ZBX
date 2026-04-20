import { describe, expect, it } from "vitest";
import {
  buildGroupHealth,
  buildProblemInsight,
  buildTopOffenders,
  classifyOperationalImpact,
  filterIssuesByText,
} from "./operationalInsights";
import type { HostItem, Issue } from "../types";

const issues: Issue[] = [
  {
    id: "1",
    severity: "Disaster",
    host: "CORE-BACKBONE-01",
    description: "BGP peer down com operadora",
    time: "ha 2 min",
    status: "Aberto",
  },
  {
    id: "2",
    severity: "High",
    host: "OLT-CENTRO-01",
    description: "GPON 0/1 sem clientes online",
    time: "ha 5 min",
    status: "Aberto",
  },
  {
    id: "3",
    severity: "High",
    host: "OLT-CENTRO-01",
    description: "Perda de pacotes elevada",
    time: "ha 6 min",
    status: "Aberto",
  },
];

const hosts: HostItem[] = [
  {
    id: "h1",
    name: "OLT-CENTRO-01",
    ip: "10.0.0.1",
    status: "Offline",
    lastChecked: "ha 5 min",
    location: "POP-CENTRO, ACESSO",
  },
  {
    id: "h2",
    name: "SW-CENTRO-01",
    ip: "10.0.0.2",
    status: "Online",
    lastChecked: "ha 1 min",
    location: "POP-CENTRO",
  },
  {
    id: "h3",
    name: "RTR-NORTE-01",
    ip: "10.0.1.1",
    status: "Degradado",
    lastChecked: "ha 10 min",
    location: "POP-NORTE",
  },
];

describe("operationalInsights", () => {
  it("classifica impacto operacional por host e descricao", () => {
    expect(classifyOperationalImpact(issues[0])).toBe("BGP");
    expect(classifyOperationalImpact(issues[1])).toBe("GPON/OLT");
  });

  it("gera runbook e urgencia para problema critico", () => {
    const insight = buildProblemInsight(issues[0]);

    expect(insight.urgency).toBe("immediate");
    expect(insight.priorityScore).toBeGreaterThanOrEqual(120);
    expect(insight.nextActions.length).toBeGreaterThan(0);
    expect(insight.escalationMessage).toContain("CORE-BACKBONE-01");
  });

  it("ordena top ofensores por score operacional", () => {
    const offenders = buildTopOffenders(issues);

    expect(offenders[0].host).toBe("OLT-CENTRO-01");
    expect(offenders[1].host).toBe("CORE-BACKBONE-01");
  });

  it("calcula saude por grupo", () => {
    const health = buildGroupHealth(hosts);
    const centro = health.find((item) => item.group === "POP-CENTRO");

    expect(centro?.total).toBe(2);
    expect(centro?.online).toBe(1);
    expect(centro?.offline).toBe(1);
    expect(centro?.availability).toBe(50);
  });

  it("filtra incidentes ignorando acentos e caixa", () => {
    const result = filterIssuesByText(issues, "pacotes");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});
