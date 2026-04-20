import { callZabbix, zabbixAlarmSeverities } from "./api";
import {
  adaptEventItem,
  adaptHostItem,
  adaptProblemItem,
  adaptTriggerItem,
} from "../adapters/zabbixAdapter";
import type { EventItem, HostItem, Issue, TriggerItem } from "../types";

interface RawProblem {
  eventid: string;
  objectid?: string;
  name?: string;
  severity?: string;
  clock?: string;
  acknowledged?: string;
}

interface ProblemsQueryOptions {
  limit?: number;
  severities?: readonly number[];
  recent?: boolean;
  sortOrder?: "ASC" | "DESC";
}

interface EventsQueryOptions {
  limit?: number;
  severities?: readonly number[];
  sortOrder?: "ASC" | "DESC";
}

interface TriggersQueryOptions {
  limit?: number;
  sortOrder?: "ASC" | "DESC";
}

interface RawTrigger {
  triggerid: string;
  hosts?: Array<{
    host?: string;
  }>;
}

async function getTriggerHostMap(triggerIds: string[]) {
  if (triggerIds.length === 0) {
    return new Map<string, string>();
  }

  const rawTriggers = await callZabbix<RawTrigger[]>("trigger.get", {
    output: ["triggerid"],
    triggerids: triggerIds,
    selectHosts: ["host"],
  });

  return new Map(
    rawTriggers.map((trigger) => [
      trigger.triggerid,
      trigger.hosts?.[0]?.host ?? "Sem host",
    ]),
  );
}

export async function getHostsDetailed(): Promise<HostItem[]> {
  const rawHosts = await callZabbix<any[]>("host.get", {
    output: ["hostid", "host", "name", "status", "lastaccess", "maintenance_status"],
    selectInterfaces: ["ip", "main", "type", "available"],
    selectGroups: ["groupid", "name"],
    sortfield: "name",
  });

  return rawHosts.map(adaptHostItem);
}

export async function getProblemsDetailed(
  options: ProblemsQueryOptions = {},
): Promise<Issue[]> {
  const rawProblems = await callZabbix<RawProblem[]>("problem.get", {
    output: ["eventid", "objectid", "name", "severity", "clock", "acknowledged"],
    severities: options.severities ?? zabbixAlarmSeverities,
    sortfield: "eventid",
    sortorder: options.sortOrder ?? "DESC",
    recent: options.recent ?? true,
    limit: options.limit ?? 10,
  });

  const triggerIds = Array.from(
    new Set(
      rawProblems
        .map((problem) => problem.objectid)
        .filter((triggerId): triggerId is string => Boolean(triggerId)),
    ),
  );
  const triggerHostMap = await getTriggerHostMap(triggerIds);

  return rawProblems
    .sort((left, right) => Number(right.clock ?? 0) - Number(left.clock ?? 0))
    .map((problem) =>
      adaptProblemItem(problem, triggerHostMap.get(problem.objectid ?? "")),
    );
}

export async function getEvents(
  options: EventsQueryOptions = {},
): Promise<EventItem[]> {
  const rawEvents = await callZabbix<any[]>("event.get", {
    output: [
      "eventid",
      "name",
      "clock",
      "severity",
      "source",
      "object",
      "objectid",
    ],
    severities: options.severities ?? zabbixAlarmSeverities,
    selectHosts: ["host"],
    sortfield: "eventid",
    sortorder: options.sortOrder ?? "DESC",
    limit: options.limit ?? 8,
  });

  return rawEvents
    .sort((left, right) => Number(right.clock ?? 0) - Number(left.clock ?? 0))
    .map(adaptEventItem);
}

export async function getTriggers(
  options: TriggersQueryOptions = {},
): Promise<TriggerItem[]> {
  const rawTriggers = await callZabbix<any[]>("trigger.get", {
    output: ["triggerid", "description", "priority", "status"],
    selectHosts: ["host"],
    filter: { value: 1 },
    sortfield: "priority",
    sortorder: options.sortOrder ?? "DESC",
    limit: options.limit ?? 12,
  });

  return rawTriggers.map(adaptTriggerItem);
}
