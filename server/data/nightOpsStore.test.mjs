import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it } from "vitest";
import { createNightOpsStore } from "./nightOpsStore.mjs";

function createTempFilePath(name) {
  const dir = join(
    tmpdir(),
    `nightops-store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    filePath: join(dir, name),
  };
}

describe("createNightOpsStore", () => {
  let tempDir = "";

  beforeEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("cria arquivo se nao existir", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;

    createNightOpsStore({ filePath });

    expect(existsSync(filePath)).toBe(true);
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    expect(parsed.analyses).toEqual([]);
  });

  it("salva incidente", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveIncident({
      id: "INC-1",
      title: "Falha POP",
      severity: "critical",
      status: "active",
      escalation: {
        required: true,
        reason: "Teste",
        target: "Supervisor",
      },
      generatedAt: "2026-04-30T23:00:00.000Z",
    });

    expect(store.getIncidentById("INC-1")?.title).toBe("Falha POP");
  });

  it("lista incidentes", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveIncident({
      id: "INC-2",
      title: "Falha Core",
      severity: "high",
      status: "monitoring",
      escalation: {
        required: false,
        reason: "Teste",
        target: "NOC",
      },
      generatedAt: "2026-05-01T00:00:00.000Z",
    });

    expect(store.listIncidents()).toHaveLength(1);
    expect(store.listIncidents({ severity: "high" })).toHaveLength(1);
  });

  it("salva relatorio", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    const report = store.saveShiftReport({
      id: "report-1",
      generatedAt: "2026-05-01T07:10:00.000Z",
      title: "Relatorio NOC Noturno",
      period: {
        start: "2026-04-30T19:00:00-03:00",
        end: "2026-05-01T07:00:00-03:00",
      },
      summary: "Resumo",
      numbers: {
        totalProblems: 1,
        criticalIncidents: 1,
        monitoredEvents: 0,
        ignoredNoise: 0,
        escalations: 1,
      },
      incidents: [],
      recommendations: ["Validar POP"],
      handoverText: "Passagem",
    });

    expect(report.id).toBe("report-1");
  });

  it("recupera ultimo relatorio", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShiftReport({
      id: "report-1",
      generatedAt: "2026-05-01T07:10:00.000Z",
      title: "Relatorio antigo",
      period: { start: "2026-04-29T19:00:00-03:00", end: "2026-04-30T07:00:00-03:00" },
      summary: "Resumo 1",
      numbers: {
        totalProblems: 1,
        criticalIncidents: 0,
        monitoredEvents: 1,
        ignoredNoise: 0,
        escalations: 0,
      },
      incidents: [],
      recommendations: [],
      handoverText: "Passagem 1",
    });

    store.saveShiftReport({
      id: "report-2",
      generatedAt: "2026-05-02T07:10:00.000Z",
      title: "Relatorio novo",
      period: { start: "2026-05-01T19:00:00-03:00", end: "2026-05-02T07:00:00-03:00" },
      summary: "Resumo 2",
      numbers: {
        totalProblems: 2,
        criticalIncidents: 1,
        monitoredEvents: 1,
        ignoredNoise: 0,
        escalations: 1,
      },
      incidents: [],
      recommendations: [],
      handoverText: "Passagem 2",
    });

    expect(store.getLastShiftReport()?.id).toBe("report-2");
  });

  it("lida com JSON invalido sem quebrar aplicacao", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    writeFileSync(filePath, "{ invalido", "utf8");

    const store = createNightOpsStore({ filePath });

    expect(store.listIncidents()).toEqual([]);
    expect(readFileSync(filePath, "utf8")).toContain('"version": 1');
    const backupName = readdirSync(dir).find((name) =>
      name.startsWith("nightops-history.json.bak-")
    );
    expect(Boolean(backupName)).toBe(true);
  });

  it("salva shadow decision", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShadowDecision({
      id: "SHADOW-1",
      createdAt: "2026-05-01T01:00:00.000Z",
      analysisId: "analysis-1",
      incidentId: "INC-1",
      decision: "monitor",
      wouldNotify: false,
      severity: "high",
      reason: "Validar recorrencia.",
      evidence: ["Host unico"],
      confidence: 0.7,
      humanValidation: {
        status: "pending",
        validatedBy: null,
        validatedAt: null,
        notes: "",
      },
    });

    expect(store.getShadowDecisionById("SHADOW-1")?.decision).toBe("monitor");
  });

  it("lista shadow decisions com filtros", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShadowDecision({
      id: "SHADOW-2",
      createdAt: "2026-05-01T01:00:00.000Z",
      analysisId: "analysis-1",
      incidentId: "INC-2",
      decision: "recommend_escalation",
      wouldNotify: true,
      severity: "critical",
      reason: "Falha critica.",
      evidence: [],
      confidence: 0.9,
      humanValidation: {
        status: "pending",
        validatedBy: null,
        validatedAt: null,
        notes: "",
      },
    });

    expect(store.listShadowDecisions({ wouldNotify: true })).toHaveLength(1);
    expect(store.listShadowDecisions({ decision: "recommend_escalation" })).toHaveLength(1);
  });

  it("atualiza validacao da shadow decision", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShadowDecision({
      id: "SHADOW-3",
      createdAt: "2026-05-01T01:00:00.000Z",
      analysisId: "analysis-1",
      incidentId: "INC-3",
      decision: "ignore",
      wouldNotify: false,
      severity: "low",
      reason: "Ruido.",
      evidence: [],
      confidence: 0.4,
      humanValidation: {
        status: "pending",
        validatedBy: null,
        validatedAt: null,
        notes: "",
      },
    });

    const updated = store.updateShadowDecisionValidation("SHADOW-3", {
      status: "false_negative",
      validatedBy: "Juan",
      notes: "Nao deveria ignorar.",
    });

    expect(updated?.humanValidation.status).toBe("false_negative");
    expect(updated?.humanValidation.validatedBy).toBe("Juan");
  });

  it("calcula metricas shadow", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShadowDecision({
      id: "SHADOW-4",
      createdAt: "2026-05-01T01:00:00.000Z",
      analysisId: "analysis-1",
      incidentId: "INC-4",
      decision: "recommend_escalation",
      wouldNotify: true,
      severity: "critical",
      reason: "Critico",
      evidence: [],
      confidence: 0.95,
      humanValidation: {
        status: "correct",
        validatedBy: "Juan",
        validatedAt: "2026-05-01T02:00:00.000Z",
        notes: "",
      },
    });

    const metrics = store.getShadowMetrics();
    expect(metrics.total).toBe(1);
    expect(metrics.correct).toBe(1);
    expect(metrics.wouldNotify).toBe(1);
    expect(metrics.recommendEscalation).toBe(1);
  });

  it("limpa shadow decisions antigas", () => {
    const { dir, filePath } = createTempFilePath("nightops-history.json");
    tempDir = dir;
    const store = createNightOpsStore({ filePath });

    store.saveShadowDecision({
      id: "SHADOW-5",
      createdAt: "2020-01-01T00:00:00.000Z",
      analysisId: "analysis-1",
      incidentId: "INC-5",
      decision: "monitor",
      wouldNotify: false,
      severity: "medium",
      reason: "Antigo",
      evidence: [],
      confidence: 0.5,
      humanValidation: {
        status: "pending",
        validatedBy: null,
        validatedAt: null,
        notes: "",
      },
    });

    store.clearOldShadowDecisions(30);
    expect(store.listShadowDecisions()).toHaveLength(0);
  });
});
