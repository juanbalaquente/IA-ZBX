import {
  getEvents,
  getHostsDetailed,
  getProblemsDetailed,
  getTriggers,
} from "./zabbixService";
import type { EventItem, HostItem, Issue, TriggerItem } from "../types";

export async function queryHosts(): Promise<HostItem[]> {
  return getHostsDetailed();
}

export async function queryProblems(): Promise<Issue[]> {
  return getProblemsDetailed();
}

export async function queryEvents(): Promise<EventItem[]> {
  return getEvents();
}

export async function queryTriggers(): Promise<TriggerItem[]> {
  return getTriggers();
}
