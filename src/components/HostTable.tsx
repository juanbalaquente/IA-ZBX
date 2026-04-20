import type { HostItem } from "../types";

interface Props {
  hosts: HostItem[];
  selectedHostId?: string | null;
  onSelectHost?: (hostId: string) => void;
}

const statusStyles = {
  Online: "bg-emerald-500/12 text-emerald-300",
  Offline: "bg-rose-500/12 text-rose-300",
  Degradado: "bg-amber-500/12 text-amber-300",
};

function HostTable({ hosts, selectedHostId, onSelectHost }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Hosts
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Inventario de dispositivos
          </h3>
        </div>
        <span className="text-sm text-slate-400">
          {hosts.length} hosts exibidos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">IP</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Ultimo check</th>
              <th className="px-3 py-3">Grupos</th>
              <th className="px-3 py-3">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {hosts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Nenhum host encontrado. Verifique a conexao com o Zabbix.
                </td>
              </tr>
            ) : (
              hosts.map((host) => (
                <tr
                  key={host.id}
                  className={`transition-colors hover:bg-slate-950/60 ${
                    selectedHostId === host.id ? "bg-slate-950/80" : ""
                  }`}
                >
                  <td className="px-3 py-4 font-semibold text-slate-100">
                    {host.name}
                  </td>
                  <td className="px-3 py-4">{host.ip}</td>
                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs ${statusStyles[host.status]}`}
                    >
                      {host.status}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">
                      {host.interfaceType ?? "Nao definido"}
                    </p>
                  </td>
                  <td className="px-3 py-4">{host.lastChecked}</td>
                  <td className="px-3 py-4">{host.location}</td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onSelectHost?.(host.id)}
                      className="rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                    >
                      Ver detalhe
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HostTable;
