import { describe, expect, it } from "vitest";
import { applyEscalationRules } from "./escalationRules.mjs";

function createIncident(overrides = {}) {
  return {
    id: "INC-TEST",
    title: "Falha de host isolado",
    severity: "high",
    sourceSeverity: "High",
    status: "active",
    durationMinutes: 10,
    affectedHosts: ["HOST-01"],
    affectedGroups: ["ACESSO"],
    problemIds: ["p1"],
    eventIds: ["e1"],
    probableCause: "Validar host isolado.",
    impact: "Impacto localizado.",
    evidence: [],
    recommendedActions: [],
    escalation: {
      required: false,
      reason: "Sem criterios deterministas de escalonamento.",
      target: "NOC",
    },
    ...overrides,
  };
}

describe("applyEscalationRules", () => {
  it("recomenda escalonamento para Disaster com duracao alta", () => {
    const result = applyEscalationRules(
      createIncident({
        title: "Falha POP principal",
        severity: "critical",
        sourceSeverity: "Disaster",
        durationMinutes: 12,
      }),
      { minDurationMinutes: 5 },
    );

    expect(result.escalation.required).toBe(true);
    expect(result.severity).toBe("critical");
  });

  it("trata problema curto normalizado como ruido", () => {
    const result = applyEscalationRules(
      createIncident({
        status: "resolved",
        durationMinutes: 2,
      }),
      { minDurationMinutes: 5 },
    );

    expect(result.status).toBe("ignored");
    expect(result.classification).toBe("noise");
  });

  it("nao promove host isolado para acionamento critico automaticamente", () => {
    const result = applyEscalationRules(createIncident(), {
      minDurationMinutes: 5,
    });

    expect(result.escalation.required).toBe(false);
    expect(result.severity).toBe("medium");
  });

  it("aumenta prioridade quando encontra palavra-chave critica", () => {
    const result = applyEscalationRules(
      createIncident({
        title: "BGP flap no core",
        severity: "medium",
      }),
      { minDurationMinutes: 5 },
    );

    expect(result.severity).toBe("high");
  });
});
