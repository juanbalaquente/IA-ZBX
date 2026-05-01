import { describe, expect, it } from "vitest";
import { formatHumanDuration, generateShiftReport } from "./shiftReportService.mjs";

const period = {
  start: "2026-04-30T07:00:00-03:00",
  end: "2026-04-30T19:00:00-03:00",
};

function buildIncident(overrides = {}) {
  return {
    id: "INC-1",
    title: "OLT TAQUARAS OFFLINE",
    severity: "critical",
    status: "active",
    startedAt: "2026-04-30T10:00:00-03:00",
    endedAt: null,
    durationMinutes: 75,
    affectedHosts: ["OLT-1", "CLIENTE-1"],
    affectedGroups: ["10031-SPEEDNET"],
    problemIds: ["p1", "p2", "p3"],
    eventIds: ["e1"],
    probableCause: "Queda temporaria de energia ou transporte.",
    impact: "Clientes vinculados sem comunicacao.",
    evidence: ["Sem comunicacao com a OLT", "Multiplos hosts afetados"],
    recommendedActions: ["Validar energia e transporte da OLT."],
    escalation: { required: true, reason: "Evento massivo", target: "Engenharia" },
    customerMessage: "",
    internalMessage: "",
    confidence: 0.8,
    ...overrides,
  };
}

describe("shiftReportService", () => {
  it("alarme antigo ativo sem mudanca nao entra em relevantOccurrences", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "GPON antiga",
          startedAt: "2025-04-12T16:01:00-03:00",
          durationMinutes: 550000,
        }),
      ],
    });

    expect(report.relevantOccurrences).toEqual([]);
    expect(report.inheritedPendingCount).toBe(1);
  });

  it("alarme comecou dentro do plantao entra", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [buildIncident()],
    });

    expect(report.relevantOccurrences).toHaveLength(1);
  });

  it("alarme normalizou dentro do plantao entra", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          status: "resolved",
          startedAt: "2026-04-30T08:00:00-03:00",
          endedAt: "2026-04-30T08:15:00-03:00",
          durationMinutes: 15,
        }),
      ],
    });

    expect(report.relevantOccurrences).toHaveLength(1);
    expect(report.plainTextReport).toContain("Normalizacao:");
  });

  it("alarme comecou antes e normalizou antes do plantao nao entra", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          startedAt: "2026-04-29T10:00:00-03:00",
          endedAt: "2026-04-29T11:00:00-03:00",
          status: "resolved",
        }),
      ],
    });

    expect(report.relevantOccurrences).toEqual([]);
    expect(report.inheritedPendingCount).toBe(0);
  });

  it("alarme comecou depois do plantao nao entra", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          startedAt: "2026-04-30T20:00:00-03:00",
        }),
      ],
    });

    expect(report.relevantOccurrences).toEqual([]);
  });

  it("alarme antigo ativo aparece apenas em carryOverOccurrences", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "BGP antigo",
          startedAt: "2026-03-23T12:00:00-03:00",
          severity: "critical",
          durationMinutes: 55000,
        }),
      ],
    });

    expect(report.carryOverOccurrences).toHaveLength(1);
    expect(report.relevantOccurrences).toHaveLength(0);
  });

  it("relevantOccurrences nao prioriza duracao antiga", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "Pendencia antiga",
          startedAt: "2025-04-12T16:01:00-03:00",
          durationMinutes: 999999,
        }),
        buildIncident({
          title: "Evento do plantao",
          startedAt: "2026-04-30T12:00:00-03:00",
          durationMinutes: 10,
        }),
      ],
    });

    expect(report.relevantOccurrences).toHaveLength(1);
    expect(report.relevantOccurrences[0].title).toBe("Evento do plantao");
  });

  it("totalProblems considera apenas eventos do periodo", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "Pendencia antiga",
          startedAt: "2025-04-12T16:01:00-03:00",
          problemIds: ["old-1", "old-2"],
        }),
        buildIncident({
          title: "Evento do plantao",
          startedAt: "2026-04-30T12:00:00-03:00",
          problemIds: ["new-1", "new-2", "new-3"],
        }),
      ],
    });

    expect(report.numbers.totalProblems).toBe(3);
    expect(report.periodEventCount).toBe(3);
  });

  it("plainTextReport informa pendencias herdadas separadamente", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "Pendencia antiga",
          startedAt: "2025-04-12T16:01:00-03:00",
          severity: "critical",
        }),
      ],
    });

    expect(report.plainTextReport).toContain("PENDENCIAS HERDADAS:");
    expect(report.plainTextReport).toContain("sem alteracao no plantao");
  });

  it("passagem de turno nao cita alarmes antigos como ocorrencia do plantao", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [
        buildIncident({
          title: "Pendencia antiga",
          startedAt: "2025-04-12T16:01:00-03:00",
          severity: "critical",
        }),
      ],
    });

    expect(report.handoverText).toContain("pendencias antigas");
    expect(report.handoverText).not.toContain("Permanecem ativas as ocorrencias do periodo Pendencia antiga");
  });

  it("gera plainTextReport e mantem handoverText", () => {
    const report = generateShiftReport({
      ...period,
      incidents: [buildIncident()],
    });

    expect(report.plainTextReport).toContain("RELATORIO NOC");
    expect(report.handoverText).toContain("Bom dia");
  });

  it("formata duracao em minutos e horas", () => {
    expect(formatHumanDuration(15)).toBe("15 minutos");
    expect(formatHumanDuration(70)).toBe("1 hora e 10 minutos");
    expect(formatHumanDuration(1560)).toBe("1 dia e 2 horas");
  });
});
