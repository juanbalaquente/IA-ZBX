import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createNightOpsConfigStore,
  validateNightOpsConfig,
} from "./nightOpsConfigStore.mjs";

const defaults = {
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
  ],
  criticalKeywords: ["OLT", "POP", "BGP", "BACKBONE", "CORE", "TRANSPORTE", "ENLACE"],
  criticalHostPatterns: ["X9"],
  alwaysIncludeHostPatterns: ["X9"],
  autoEscalationEnabled: false,
  includeCarryOverInMainReport: false,
  maxCarryOverItemsInReport: 5,
  carryOverMinSeverity: "critical",
  shadowModeEnabled: true,
  shadowModeRetentionDays: 30,
};

function createTempFilePath(name) {
  const dir = join(
    tmpdir(),
    `nightops-config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    filePath: join(dir, name),
  };
}

describe("nightOpsConfigStore", () => {
  let tempDir = "";

  beforeEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("carrega configuracao default", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    const store = createNightOpsConfigStore({ filePath, defaults });

    expect(existsSync(filePath)).toBe(true);
    expect(store.getConfig().defaultStartHour).toBe(19);
    expect(store.getConfig().autoEscalationEnabled).toBe(false);
    expect(store.getConfig().shadowModeEnabled).toBe(true);
    expect(store.getConfig().allowedHostGroups).toContain("10031-SPEEDNET");
    expect(store.getConfig().includeCarryOverInMainReport).toBe(false);
    expect(store.getConfig().criticalHostPatterns).toEqual(["X9"]);
  });

  it("salva configuracao valida", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    const store = createNightOpsConfigStore({ filePath, defaults });

    const result = store.updateConfig({
      ...defaults,
      minDurationMinutes: 8,
      allowedHostGroups: ["1000-SERVIDORES", "ZABBIX SERVERS"],
      criticalKeywords: ["OLT", "POP", "CORE"],
      criticalHostPatterns: ["x9", " x9 "],
      alwaysIncludeHostPatterns: ["x9", "X9"],
      autoEscalationEnabled: true,
      includeCarryOverInMainReport: true,
      maxCarryOverItemsInReport: 3,
      carryOverMinSeverity: "high",
      shadowModeRetentionDays: 45,
    });

    expect(result.ok).toBe(true);
    expect(store.getConfig().minDurationMinutes).toBe(8);
    expect(store.getConfig().autoEscalationEnabled).toBe(false);
    expect(store.getConfig().shadowModeRetentionDays).toBe(45);
    expect(store.getConfig().includeCarryOverInMainReport).toBe(true);
    expect(store.getConfig().maxCarryOverItemsInReport).toBe(3);
    expect(store.getConfig().carryOverMinSeverity).toBe("high");
    expect(store.getConfig().criticalHostPatterns).toEqual(["X9"]);
    expect(store.getConfig().alwaysIncludeHostPatterns).toEqual(["X9"]);
    expect(store.getConfig().allowedHostGroups).toEqual([
      "1000-SERVIDORES",
      "ZABBIX SERVERS",
    ]);
  });

  it("rejeita valores invalidos", () => {
    const validation = validateNightOpsConfig(
      {
        ...defaults,
        correlationWindowMinutes: 0,
        allowedHostGroups: new Array(80).fill("grupo"),
        criticalKeywords: new Array(30).fill("A"),
        criticalHostPatterns: new Array(30).fill("X9"),
        alwaysIncludeHostPatterns: [],
        maxCarryOverItemsInReport: 50,
        carryOverMinSeverity: "urgent",
        shadowModeRetentionDays: 500,
      },
      defaults,
    );

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("cria backup quando JSON esta invalido", () => {
    const { dir, filePath } = createTempFilePath("nightops-config.json");
    tempDir = dir;
    writeFileSync(filePath, "{ invalido", "utf8");

    const store = createNightOpsConfigStore({ filePath, defaults });
    const backupName = readdirSync(dir).find((name) =>
      name.startsWith("nightops-config.json.bak-")
    );

    expect(Boolean(backupName)).toBe(true);
    expect(store.getConfig().timezone).toBe("America/Sao_Paulo");
  });
});
