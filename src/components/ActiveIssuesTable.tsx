import { Link } from "react-router-dom";
import type { Issue } from "../types";

interface Props {
  issues: Issue[];
}

function ActiveIssuesTable({ issues }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Problemas ativos
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Fila de incidentes
          </h3>
        </div>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Dados em tempo real
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-3 py-3">Severidade</th>
              <th className="px-3 py-3">Host</th>
              <th className="px-3 py-3">Problema</th>
              <th className="px-3 py-3">Horario</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {issues.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Nenhum problema ativo encontrado no Zabbix.
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr
                  key={issue.id}
                  className="transition-colors hover:bg-slate-950/60"
                >
                  <td className="px-3 py-4 font-semibold text-slate-100">
                    {issue.severity}
                  </td>
                  <td className="px-3 py-4">{issue.host}</td>
                  <td className="px-3 py-4 text-slate-300">
                    {issue.description}
                  </td>
                  <td className="px-3 py-4">{issue.time}</td>
                  <td className="px-3 py-4">
                    <span className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <Link
                      to={`/problems?host=${encodeURIComponent(issue.host)}`}
                      className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ActiveIssuesTable;
