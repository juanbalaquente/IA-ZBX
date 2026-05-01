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
});
