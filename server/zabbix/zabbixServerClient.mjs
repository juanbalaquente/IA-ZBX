function normalizeZabbixApiUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.pathname.endsWith("/zabbix.php")) {
      parsedUrl.pathname = parsedUrl.pathname.replace(
        /\/zabbix\.php$/,
        "/api_jsonrpc.php",
      );
      parsedUrl.search = "";
    }
    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
}

function severityLabel(severity) {
  const labels = {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
  };

  return labels[Number(severity)] || "Unknown";
}

function formatClock(clock) {
  const timestamp = Number(clock);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Sem horario";
  }

  return new Date(timestamp * 1000).toLocaleString("pt-BR");
}

function toTimestampMs(clock) {
  const timestamp = Number(clock);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp * 1000;
}

function truncateText(value, maxLength = 180) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function mapHostStatus(host, mainInterface) {
  const available = mainInterface?.available;
  if (host.status === "1") {
    return "Offline";
  }

  if (available === "1") {
    return "Online";
  }

  if (available === "2") {
    return "Offline";
  }

  return "Degradado";
}

export function createZabbixServerClient(config) {
  let cachedAuthToken = null;

  function isTokenMode() {
    return Boolean(config.zabbixToken) &&
      !(config.zabbixUser && config.zabbixPassword);
  }

  async function loginWithCredentials() {
    try {
      return await callZabbix(
        "user.login",
        {
          username: config.zabbixUser,
          password: config.zabbixPassword,
        },
        { skipAuth: true },
      );
    } catch (error) {
      if (!/unexpected parameter "username"|invalid parameter/i.test(error.message)) {
        throw error;
      }

      return await callZabbix(
        "user.login",
        {
          user: config.zabbixUser,
          password: config.zabbixPassword,
        },
        { skipAuth: true },
      );
    }
  }

  async function getAuthToken() {
    if (isTokenMode()) {
      return config.zabbixToken;
    }

    if (cachedAuthToken) {
      return cachedAuthToken;
    }

    if (config.zabbixUser && config.zabbixPassword) {
      cachedAuthToken = await loginWithCredentials();
      return cachedAuthToken;
    }

    return null;
  }

  async function callZabbix(method, params = {}, options = {}) {
    if (!config.zabbixUrl) {
      throw new Error("Zabbix API URL nao configurada.");
    }

    const useToken = isTokenMode();
    const headers = {
      "Content-Type": "application/json",
    };

    if (useToken) {
      headers["X-API-KEY"] = config.zabbixToken;
      headers["X-Auth-Token"] = config.zabbixToken;
    }

    const authToken = options.skipAuth ? null : await getAuthToken();
    const body = {
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    };

    if (!options.skipAuth && !useToken) {
      body.auth = authToken;
    }

    const sendRequest = async (payload) => {
      const response = await fetch(normalizeZabbixApiUrl(config.zabbixUrl), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      return await response.json();
    };

    let json = await sendRequest(body);

    if (
      json.error &&
      useToken &&
      !options.skipAuth &&
      /not authorized/i.test(`${json.error.message} ${json.error.data}`) &&
      config.zabbixToken
    ) {
      json = await sendRequest({ ...body, auth: config.zabbixToken });
    }

    if (json.error) {
      throw new Error(`${json.error.message}: ${json.error.data}`);
    }

    return json.result;
  }

  async function getVersion() {
    return await callZabbix("apiinfo.version", {}, { skipAuth: true });
  }

  async function getHosts(params = {}) {
    const hosts = await callZabbix("host.get", {
      output: ["hostid", "host", "name", "status", "lastaccess", "maintenance_status"],
      selectInterfaces: ["interfaceid", "ip", "main", "type", "available"],
      selectGroups: ["groupid", "name"],
      sortfield: "name",
      ...params,
    });

    return hosts.map((host) => {
      const mainInterface =
        host.interfaces?.find((item) => item.main === "1") || host.interfaces?.[0];

      return {
        id: host.hostid,
        hostid: host.hostid,
        name: host.name || host.host || "Sem host",
        technicalName: host.host || host.name || "Sem host",
        ip: mainInterface?.ip || "Sem IP",
        status: mapHostStatus(host, mainInterface),
        groups: host.groups?.map((group) => group.name) || [],
        lastCheck: formatClock(host.lastaccess),
        lastCheckTs: toTimestampMs(host.lastaccess),
        raw: host,
      };
    });
  }

  async function getProblems(params = {}) {
    const problems = await callZabbix("problem.get", {
      output: [
        "eventid",
        "objectid",
        "name",
        "severity",
        "clock",
        "r_eventid",
        "r_clock",
        "acknowledged",
      ],
      recent: true,
      sortfield: "eventid",
      sortorder: "DESC",
      ...params,
    });

    return problems.map((problem) => ({
      id: problem.eventid,
      eventid: problem.eventid,
      triggerid: problem.objectid,
      name: problem.name || "Problema sem descricao",
      severity: severityLabel(problem.severity),
      severityCode: Number(problem.severity || 0),
      clock: problem.clock,
      startedAt: formatClock(problem.clock),
      startedAtTs: toTimestampMs(problem.clock),
      recoveryEventId: problem.r_eventid || null,
      recoveryClock: problem.r_clock || null,
      recoveryAtTs: toTimestampMs(problem.r_clock),
      acknowledged: problem.acknowledged === "1",
      raw: problem,
    }));
  }

  async function getTriggers(params = {}) {
    return await callZabbix("trigger.get", {
      output: ["triggerid", "description", "priority", "status"],
      selectHosts: ["hostid", "host", "name"],
      selectGroups: ["groupid", "name"],
      selectTags: "extend",
      ...params,
    });
  }

  async function getEvents(params = {}) {
    const events = await callZabbix("event.get", {
      output: [
        "eventid",
        "name",
        "clock",
        "severity",
        "source",
        "object",
        "objectid",
        "acknowledged",
      ],
      selectHosts: ["hostid", "host", "name"],
      sortfield: "eventid",
      sortorder: "DESC",
      ...params,
    });

    return events.map((event) => ({
      id: event.eventid,
      eventid: event.eventid,
      objectid: event.objectid,
      name: event.name || "Evento operacional",
      severity: severityLabel(event.severity),
      severityCode: Number(event.severity || 0),
      clock: event.clock,
      time: formatClock(event.clock),
      timestampTs: toTimestampMs(event.clock),
      hosts: event.hosts || [],
      acknowledged: event.acknowledged === "1",
      raw: event,
    }));
  }

  async function getOperationalSnapshot(options = {}) {
    const [
      hosts,
      problems,
      events,
      triggers,
    ] = await Promise.all([
      getHosts({ limit: options.hostLimit ?? 100 }),
      getProblems({
        severities: options.problemSeverities ?? [4, 5],
        limit: options.problemLimit ?? 100,
      }),
      getEvents({
        severities: options.eventSeverities ?? [4, 5],
        limit: options.eventLimit ?? 100,
      }),
      getTriggers({
        triggerids: [],
      }),
    ]);

    const triggerIds = [...new Set(problems.map((problem) => problem.triggerid).filter(Boolean))];
    const relevantTriggers = triggerIds.length > 0
      ? await getTriggers({
          triggerids: triggerIds,
        })
      : [];

    const triggerMap = new Map(
      relevantTriggers.map((trigger) => [trigger.triggerid, trigger]),
    );
    const hostMap = new Map(hosts.map((host) => [host.hostid, host]));

    const enrichedProblems = problems.map((problem) => {
      const trigger = triggerMap.get(problem.triggerid) || null;
      const relatedHosts = trigger?.hosts || [];
      const relatedGroups = trigger?.groups || [];
      const primaryHost = relatedHosts[0] || null;
      const mappedHost = primaryHost?.hostid
        ? hostMap.get(primaryHost.hostid)
        : null;

      return {
        ...problem,
        title: problem.name,
        hostId: primaryHost?.hostid || mappedHost?.hostid || null,
        host: mappedHost?.name || primaryHost?.name || primaryHost?.host || "Sem host",
        hostTechnicalName:
          mappedHost?.technicalName || primaryHost?.host || primaryHost?.name || "Sem host",
        hostIp: mappedHost?.ip || "Sem IP",
        groups: relatedGroups.map((group) => group.name),
        tags: Array.isArray(trigger?.tags)
          ? trigger.tags.map((tag) => ({
              tag: tag.tag || "",
              value: tag.value || "",
            }))
          : [],
        triggerDescription: trigger?.description || problem.name,
      };
    });

    return {
      hosts,
      problems: enrichedProblems,
      events,
      triggers: relevantTriggers,
    };
  }

  function hasConfiguration() {
    return Boolean(
      config.zabbixUrl &&
        (config.zabbixToken || (config.zabbixUser && config.zabbixPassword)),
    );
  }

  return {
    callZabbix,
    getVersion,
    getHosts,
    getProblems,
    getEvents,
    getTriggers,
    getOperationalSnapshot,
    hasConfiguration,
  };
}
