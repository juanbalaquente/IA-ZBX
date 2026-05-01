import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const maxKeywords = 20;
const maxKeywordLength = 40;
const maxAllowedHostGroups = 50;
const maxHostGroupLength = 120;
const allowedCarryOverSeverities = ["low", "medium", "high", "critical"];

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function normalizeKeyword(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normalizeHostGroup(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateNightOpsConfig(input, defaults) {
  const errors = [];
  const nextConfig = {
    defaultStartHour: Number(input.defaultStartHour),
    defaultEndHour: Number(input.defaultEndHour),
    timezone: String(input.timezone || "").trim(),
    minDurationMinutes: Number(input.minDurationMinutes),
    correlationWindowMinutes: Number(input.correlationWindowMinutes),
    sameGroupAffectedHostsThreshold: Number(input.sameGroupAffectedHostsThreshold),
    allowedHostGroups: Array.isArray(input.allowedHostGroups)
      ? input.allowedHostGroups.map(normalizeHostGroup).filter(Boolean)
      : Array.isArray(defaults.allowedHostGroups)
        ? defaults.allowedHostGroups.map(normalizeHostGroup).filter(Boolean)
        : [],
    criticalKeywords: Array.isArray(input.criticalKeywords)
      ? input.criticalKeywords.map(normalizeKeyword).filter(Boolean)
      : [],
    autoEscalationEnabled: false,
    includeCarryOverInMainReport:
      typeof input.includeCarryOverInMainReport === "boolean"
        ? input.includeCarryOverInMainReport
        : Boolean(defaults.includeCarryOverInMainReport),
    maxCarryOverItemsInReport: Number(input.maxCarryOverItemsInReport),
    carryOverMinSeverity: String(
      input.carryOverMinSeverity || defaults.carryOverMinSeverity || "critical",
    ).trim().toLowerCase(),
    shadowModeEnabled:
      typeof input.shadowModeEnabled === "boolean"
        ? input.shadowModeEnabled
        : Boolean(defaults.shadowModeEnabled),
    shadowModeRetentionDays: Number(input.shadowModeRetentionDays),
  };

  if (!Number.isInteger(nextConfig.defaultStartHour) || nextConfig.defaultStartHour < 0 || nextConfig.defaultStartHour > 23) {
    errors.push("defaultStartHour invalido.");
  }

  if (!Number.isInteger(nextConfig.defaultEndHour) || nextConfig.defaultEndHour < 0 || nextConfig.defaultEndHour > 23) {
    errors.push("defaultEndHour invalido.");
  }

  if (!nextConfig.timezone) {
    errors.push("timezone obrigatorio.");
  }

  if (!Number.isFinite(nextConfig.minDurationMinutes) || nextConfig.minDurationMinutes < 1 || nextConfig.minDurationMinutes > 1440) {
    errors.push("minDurationMinutes invalido.");
  }

  if (!Number.isFinite(nextConfig.correlationWindowMinutes) || nextConfig.correlationWindowMinutes < 1 || nextConfig.correlationWindowMinutes > 720) {
    errors.push("correlationWindowMinutes invalido.");
  }

  if (
    !Number.isFinite(nextConfig.sameGroupAffectedHostsThreshold) ||
    nextConfig.sameGroupAffectedHostsThreshold < 1 ||
    nextConfig.sameGroupAffectedHostsThreshold > 1000
  ) {
    errors.push("sameGroupAffectedHostsThreshold invalido.");
  }

  if (nextConfig.allowedHostGroups.length === 0) {
    errors.push("allowedHostGroups nao pode ficar vazio.");
  }

  if (nextConfig.allowedHostGroups.length > maxAllowedHostGroups) {
    errors.push("allowedHostGroups excede o limite permitido.");
  }

  if (nextConfig.allowedHostGroups.some((group) => group.length > maxHostGroupLength)) {
    errors.push("allowedHostGroups contem item muito longo.");
  }

  if (nextConfig.criticalKeywords.length === 0) {
    errors.push("criticalKeywords nao pode ficar vazio.");
  }

  if (nextConfig.criticalKeywords.length > maxKeywords) {
    errors.push("criticalKeywords excede o limite permitido.");
  }

  if (nextConfig.criticalKeywords.some((keyword) => keyword.length > maxKeywordLength)) {
    errors.push("criticalKeywords contem item muito longo.");
  }

  if (
    !Number.isInteger(nextConfig.maxCarryOverItemsInReport) ||
    nextConfig.maxCarryOverItemsInReport < 0 ||
    nextConfig.maxCarryOverItemsInReport > 20
  ) {
    errors.push("maxCarryOverItemsInReport invalido.");
  }

  if (!allowedCarryOverSeverities.includes(nextConfig.carryOverMinSeverity)) {
    errors.push("carryOverMinSeverity invalido.");
  }

  if (
    !Number.isInteger(nextConfig.shadowModeRetentionDays) ||
    nextConfig.shadowModeRetentionDays < 1 ||
    nextConfig.shadowModeRetentionDays > 365
  ) {
    errors.push("shadowModeRetentionDays invalido.");
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      ...cloneConfig(defaults),
      ...nextConfig,
      allowedHostGroups: [...new Set(nextConfig.allowedHostGroups)],
      criticalKeywords: [...new Set(nextConfig.criticalKeywords)],
      autoEscalationEnabled: false,
      carryOverMinSeverity: nextConfig.carryOverMinSeverity,
    },
  };
}

export function createNightOpsConfigStore(options = {}) {
  const filePath = resolve(
    options.filePath || "server/data/nightops-config.json",
  );
  const dirPath = dirname(filePath);
  const defaults = cloneConfig(options.defaults || {});
  let currentConfig = cloneConfig(defaults);

  function writeConfig(config) {
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");
  }

  function backupInvalidFile() {
    if (!existsSync(filePath)) {
      return;
    }

    copyFileSync(filePath, `${filePath}.bak-${Date.now()}`);
  }

  function loadConfig() {
    try {
      mkdirSync(dirPath, { recursive: true });

      if (!existsSync(filePath)) {
        currentConfig = cloneConfig(defaults);
        writeConfig(currentConfig);
        return currentConfig;
      }

      const raw = readFileSync(filePath, "utf8").trim();
      if (!raw) {
        currentConfig = cloneConfig(defaults);
        writeConfig(currentConfig);
        return currentConfig;
      }

      const parsed = JSON.parse(raw);
      const validation = validateNightOpsConfig(parsed, defaults);
      if (!validation.valid) {
        backupInvalidFile();
        currentConfig = cloneConfig(defaults);
        writeConfig(currentConfig);
        return currentConfig;
      }

      currentConfig = validation.value;
      writeConfig(currentConfig);
      return currentConfig;
    } catch {
      backupInvalidFile();
      currentConfig = cloneConfig(defaults);
      writeConfig(currentConfig);
      return currentConfig;
    }
  }

  function getConfig() {
    return cloneConfig(currentConfig);
  }

  function updateConfig(nextInput) {
    const validation = validateNightOpsConfig(nextInput, defaults);
    if (!validation.valid) {
      return {
        ok: false,
        errors: validation.errors,
      };
    }

    currentConfig = validation.value;
    writeConfig(currentConfig);
    return {
      ok: true,
      value: getConfig(),
    };
  }

  loadConfig();

  return {
    getConfig,
    loadConfig,
    updateConfig,
  };
}
