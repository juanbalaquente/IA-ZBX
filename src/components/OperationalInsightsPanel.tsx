import {
  AlertTriangle,
  Building2,
  Clipboard,
  RadioTower,
} from "lucide-react";
import {
  buildGroupHealth,
  buildProblemInsight,
  buildTopOffenders,
} from "../domain/operationalInsights";
import type { HostItem, Issue } from "../types";

interface Props {
  hosts: HostItem[];
  issues: Issue[];
}

function OperationalInsightsPanel({ hosts, issues }: Props) {
  const topOffenders = buildTopOffenders(issues, 4);
  const groupHealth = buildGroupHealth(hosts, 4);
  const priorityInsight = issues
    .map(buildProblemInsight)
    .sort((left, right) => right.priorityScore - left.priorityScore)[0];

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Triagem CGR
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Prioridade operacional
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Consolidacao automatica de ofensores, grupos degradados e proxima
            acao sugerida para reduzir tempo de triagem N1/N2.
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          High + Disaster
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <AlertTriangle size={16} className="text-rose-300" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Alarme prioritario
            </p>
          </div>

          {!priorityInsight ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhum alarme High/Disaster ativo no momento.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-100">
                {priorityInsight.issue.host}
              </p>
              <p className="text-sm leading-6 text-slate-300">
                {priorityInsight.issue.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-200">
                  {priorityInsight.issue.severity}
                </span>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">
                  {priorityInsight.impact}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">
                  Score {priorityInsight.priorityScore}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Proxima acao
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {priorityInsight.nextActions[0]}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center gap-2">
            <RadioTower size={16} className="text-amber-300" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Top ofensores
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {topOffenders.length === 0 ? (
              <p className="text-sm text-slate-400">Sem ofensores ativos.</p>
            ) : (
              topOffenders.map((item) => (
                <div
                  key={item.host}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">
                      {item.host}
                    </p>
                    <span className="rounded-full bg-slate-950 px-2 py-1 text-xs text-slate-300">
                      {item.total}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Disaster {item.disaster} | High {item.high} | Score{" "}
                    {item.priorityScore}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-emerald-300" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Grupos em risco
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {groupHealth.length === 0 ? (
              <p className="text-sm text-slate-400">Sem grupos carregados.</p>
            ) : (
              groupHealth.map((item) => (
                <div
                  key={item.group}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">
                      {item.group}
                    </p>
                    <span className="rounded-full bg-slate-950 px-2 py-1 text-xs text-slate-300">
                      {item.availability.toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Total {item.total} | Offline {item.offline} | Degradado{" "}
                    {item.degraded}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {priorityInsight ? (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
            <Clipboard size={14} />
            Mensagem de escalonamento
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {priorityInsight.escalationMessage}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default OperationalInsightsPanel;
