import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAIQuery } from "./aiQueryService";
import type { EventItem, HostItem, Issue } from "../types";

vi.mock("./mcpClient", () => ({
  queryHosts: vi.fn(),
  queryProblems: vi.fn(),
  queryEvents: vi.fn(),
}));

import { queryEvents, queryHosts, queryProblems } from "./mcpClient";

const mockedQueryHosts = vi.mocked(queryHosts);
const mockedQueryProblems = vi.mocked(queryProblems);
const mockedQueryEvents = vi.mocked(queryEvents);

const hostsFixture: HostItem[] = [
  {
    id: "1",
    name: "OLT-CENTRO-01",
    ip: "10.200.12.114",
    status: "Online",
    lastChecked: "ha 1 min",
    location: "10031-SPEEDNET/BACKBONE",
    interfaceType: "SNMP",
    monitoringMode: "Monitorado",
    statusReason: "Interface principal SNMP esta respondendo.",
  },
  {
    id: "2",
    name: "OLT-CENTRO-02",
    ip: "10.200.12.115",
    status: "Offline",
    lastChecked: "ha 8 min",
    location: "10031-SPEEDNET",
    interfaceType: "SNMP",
    monitoringMode: "Monitorado",
    statusReason: "Interface principal SNMP esta indisponivel.",
  },
  {
    id: "3",
    name: "SW-INTELBRAS-ARENA",
    ip: "10.1.27.109",
    status: "Degradado",
    lastChecked: "Sem resposta recente",
    location: "ARENA-MRV",
    interfaceType: "SNMP",
    monitoringMode: "Monitorado",
    statusReason: "Sem telemetria recente da interface SNMP.",
  },
];

const problemsFixture: Issue[] = [
  {
    id: "p1",
    severity: "Disaster",
    host: "OLT-CENTRO-02",
    description: "Sem comunicacao com a OLT",
    time: "ha 8 min",
    status: "Aberto",
  },
  {
    id: "p2",
    severity: "High",
    host: "SW-INTELBRAS-ARENA",
    description: "Perda de desempenho",
    time: "ha 4 min",
    status: "Aberto",
  },
];

const eventsFixture: EventItem[] = [
  {
    id: "e1",
    host: "OLT-CENTRO-02",
    time: "ha 8 min",
    type: "Trigger",
    message: "Host sem comunicacao",
    severity: "Disaster",
  },
  {
    id: "e2",
    host: "SW-INTELBRAS-ARENA",
    time: "ha 4 min",
    type: "Trigger",
    message: "Latencia elevada",
    severity: "High",
  },
];

describe("resolveAIQuery", () => {
  beforeEach(() => {
    mockedQueryHosts.mockResolvedValue(hostsFixture);
    mockedQueryProblems.mockResolvedValue(problemsFixture);
    mockedQueryEvents.mockResolvedValue(eventsFixture);
  });

  it("retorna hosts por termo no nome", async () => {
    const answer = await resolveAIQuery("me retorne os hosts que tem olt no nome");

    expect(answer).toContain("OLT-CENTRO-01");
    expect(answer).toContain("OLT-CENTRO-02");
  });

  it("combina nome e status online", async () => {
    const answer = await resolveAIQuery("quantos hosts com olt no nome estao ativos");

    expect(answer).toContain("Encontrei 1 hosts");
    expect(answer).toContain("status online");
    expect(answer).toContain("nome contendo olt");
  });

  it("busca host por ip", async () => {
    const answer = await resolveAIQuery("quais hosts tem o IP 10.200.12.114?");

    expect(answer).toContain("OLT-CENTRO-01");
    expect(answer).toContain("10.200.12.114");
  });

  it("combina grupo e status offline", async () => {
    const answer = await resolveAIQuery("quais hosts do grupo speednet estao offline");

    expect(answer).toContain("OLT-CENTRO-02");
    expect(answer).toContain("status offline");
    expect(answer).toContain("grupo contendo speednet");
  });

  it("respeita o limite pedido na query", async () => {
    const answer = await resolveAIQuery("top 1 hosts com olt no nome");

    expect(answer).toContain("Hosts encontrados (2)");
    expect(answer).toContain("OLT-CENTRO-01");
    expect(answer).not.toContain("OLT-CENTRO-02");
  });

  it("aplica negacao de status", async () => {
    const answer = await resolveAIQuery("hosts com olt no nome que nao estao offline");

    expect(answer).toContain("OLT-CENTRO-01");
    expect(answer).not.toContain("OLT-CENTRO-02");
  });

  it("filtra hosts sem alarmes disaster", async () => {
    const answer = await resolveAIQuery("hosts do grupo speednet sem alarmes disaster");

    expect(answer).toContain("OLT-CENTRO-01");
    expect(answer).not.toContain("OLT-CENTRO-02");
  });

  it("retorna alarmes do host informado", async () => {
    const answer = await resolveAIQuery("quais alarmes do host SW-INTELBRAS-ARENA");

    expect(answer).toContain("Perda de desempenho");
    expect(answer).toContain("SW-INTELBRAS-ARENA");
  });

  it("retorna eventos do host informado", async () => {
    const answer = await resolveAIQuery("quais eventos do host arena");

    expect(answer).toContain("Latencia elevada");
    expect(answer).toContain("SW-INTELBRAS-ARENA");
  });
});
