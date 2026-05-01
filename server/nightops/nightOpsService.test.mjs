import { describe, expect, it, vi } from "vitest";
import { createNightOpsService } from "./nightOpsService.mjs";

function createStoreStub() {
  const shadowDecisions = [];

  return {
    clearOldShadowDecisions: vi.fn(),
    getAnalysesBetween: vi.fn(() => []),
    getLatestAnalysis: vi.fn(() => null),
    getLastShiftReport: vi.fn(() => null),
    getShadowMetrics: vi.fn(() => ({})),
    listIncidents: vi.fn(() => []),
    listShadowDecisions: vi.fn(() => shadowDecisions),
    listShiftReports: vi.fn(() => []),
    saveAnalysis: vi.fn((analysis) => analysis),
    saveShadowDecision: vi.fn((decision) => {
      shadowDecisions.push(decision);
      return decision;
    }),
    saveShiftReport: vi.fn((report) => report),
    updateShadowDecisionValidation: vi.fn(),
  };
}

function createBaseConfigStore(overrides = {}) {
  return {
    getConfig: () => ({
      defaultStartHour: 19,
      defaultEndHour: 7,
      timezone: "America/Sao_Paulo",
      minDurationMinutes: 5,
      correlationWindowMinutes: 10,
      sameGroupAffectedHostsThreshold: 5,
      allowedHostGroups: [
        "1000-SERVIDORES",
        "10031-SPEEDNET",
        "10031-SPEEDNET/BACKBONE",
        "31002-PREFEITURA_SABARA",
        "31003-FIRETELECOM",
        "31007-AFS",
        "ZABBIX SERVERS",
        "POP-CENTRO",
      ],
      criticalKeywords: ["OLT", "POP", "BGP", "BACKBONE", "CORE", "TRANSPORTE", "ENLACE"],
      autoEscalationEnabled: false,
      shadowModeEnabled: true,
      shadowModeRetentionDays: 30,
      ...overrides,
    }),
    updateConfig: vi.fn(),
  };
}

function createZabbixStub(problems) {
  return {
    hasConfiguration: () => true,
    getOperationalSnapshot: vi.fn(async () => ({
      hosts: [],
      problems,
      events: [],
      triggers: [],
    })),
  };
}

const baseProblem = {
  id: "p1",
  eventid: "e1",
  triggerid: "t1",
  title: "Problema de teste",
  severity: "High",
  startedAtTs: Date.parse("2026-05-01T00:00:00.000Z"),
  host: "HOST-01",
  groups: ["POP-CENTRO"],
  triggerDescription: "Problema de teste",
  acknowledged: false,
  hostEnabled: true,
};

describe("createNightOpsService", () => {
  it("analyze gera shadow decisions quando shadowModeEnabled=true", async () => {
    const store = createStoreStub();
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([baseProblem]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();

    expect(result.shadowDecisions).toHaveLength(1);
    expect(store.saveShadowDecision).toHaveBeenCalledTimes(1);
  });

  it("analyze nao gera shadow decisions quando shadowModeEnabled=false", async () => {
    const store = createStoreStub();
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([baseProblem]),
      store,
      configStore: createBaseConfigStore({ shadowModeEnabled: false }),
    });

    const result = await service.analyzeNightOps();

    expect(result.shadowDecisions).toHaveLength(0);
    expect(store.saveShadowDecision).not.toHaveBeenCalled();
  });

  it("escalation.required gera recommend_escalation", async () => {
    const store = createStoreStub();
    const problem = {
      ...baseProblem,
      severity: "Disaster",
      startedAtTs: Date.now() - 20 * 60 * 1000,
    };
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([problem]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();
    expect(result.shadowDecisions[0].decision).toBe("recommend_escalation");
    expect(result.shadowDecisions[0].wouldNotify).toBe(true);
  });

  it("incidente ignorado gera ignore", async () => {
    const store = createStoreStub();
    const problem = {
      ...baseProblem,
      severity: "Low",
      recoveryAtTs: Date.now() - 60 * 1000,
      startedAtTs: Date.now() - 2 * 60 * 1000,
    };
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([problem]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();
    expect(result.shadowDecisions[0].decision).toBe("ignore");
  });

  it("incidente intermediario gera monitor", async () => {
    const store = createStoreStub();
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([baseProblem]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();
    expect(result.shadowDecisions[0].decision).toBe("monitor");
  });

  it("ignora hosts inativos na analise", async () => {
    const store = createStoreStub();
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([
        { ...baseProblem, id: "p-enabled", eventid: "e-enabled", hostEnabled: true },
        { ...baseProblem, id: "p-disabled", eventid: "e-disabled", hostEnabled: false },
      ]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();

    expect(result.summary.activeProblems).toBe(1);
    expect(result.incidents).toHaveLength(1);
    expect(result.shadowDecisions).toHaveLength(1);
  });

  it("considera apenas problemas dos grupos permitidos", async () => {
    const store = createStoreStub();
    const service = createNightOpsService({
      config: {},
      zabbixClient: createZabbixStub([
        { ...baseProblem, id: "p-allowed", eventid: "e-allowed", groups: ["10031-SPEEDNET"] },
        { ...baseProblem, id: "p-blocked", eventid: "e-blocked", groups: ["GRUPO-NAO-PERMITIDO"] },
      ]),
      store,
      configStore: createBaseConfigStore(),
    });

    const result = await service.analyzeNightOps();

    expect(result.summary.activeProblems).toBe(1);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0].affectedGroups).toContain("10031-SPEEDNET");
  });
});
