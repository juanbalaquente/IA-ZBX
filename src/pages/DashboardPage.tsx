import { useMemo } from "react";
import ActiveIssuesTable from "../components/ActiveIssuesTable";
import OperationalInsightsPanel from "../components/OperationalInsightsPanel";
import QueryConsole from "../components/QueryConsole";
import RecentEventsPanel from "../components/RecentEventsPanel";
import StatCard from "../components/StatCard";
import ZabbixMetricsPanel from "../components/ZabbixMetricsPanel";
import ZabbixStatusPanel from "../components/ZabbixStatusPanel";
import type { ApiStatus } from "../hooks/useApiStatus";
import { useDashboardData } from "../hooks/useDashboardData";

interface Props {
  apiStatus: ApiStatus;
}

function DashboardPage({ apiStatus }: Props) {
  const { loading, error, stats, hosts, issues, events, reload } =
    useDashboardData();
  const showConnectionPanel = useMemo(
    () => apiStatus.state !== "mock",
    [apiStatus.state],
  );

  return (
    <div className="space-y-8">
      {showConnectionPanel ? <ZabbixStatusPanel apiStatus={apiStatus} /> : null}
      {showConnectionPanel ? (
        <ZabbixMetricsPanel apiStatus={apiStatus} />
      ) : null}

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Falha ao carregar dados operacionais.</p>
            <button
              type="button"
              onClick={reload}
              className="rounded-full border border-rose-500 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/30"
            >
              Tentar novamente
            </button>
          </div>
          <p className="mt-3 text-xs text-rose-200">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3 xl:grid-rows-[auto_minmax(0,1fr)]">
        {loading ? (
          <div className="col-span-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-10 text-center text-slate-400">
            Carregando métricas do Zabbix...
          </div>
        ) : (
          stats.map((item) => <StatCard key={item.title} item={item} />)
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <OperationalInsightsPanel hosts={hosts} issues={issues} />
          <QueryConsole />
          <ActiveIssuesTable issues={issues} />
        </div>
        <RecentEventsPanel events={events} />
      </section>
    </div>
  );
}

export default DashboardPage;
