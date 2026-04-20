import { Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import HostTable from "../components/HostTable";
import { useHosts } from "../hooks/useHosts";

const filters = ["Todos", "Online", "Offline", "Degradado"] as const;

function HostsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("Todos");
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const { hosts, loading, error, retry } = useHosts();

  const filteredHosts = useMemo(() => {
    return hosts.filter((host) => {
      const matchesSearch = [host.name, host.ip, host.location].some((value) =>
        value.toLowerCase().includes(search.toLowerCase()),
      );
      const matchesStatus = status === "Todos" || host.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [hosts, search, status]);

  useEffect(() => {
    if (filteredHosts.length === 0) {
      setSelectedHostId(null);
      return;
    }

    if (!selectedHostId) {
      setSelectedHostId(filteredHosts[0].id);
      return;
    }

    if (!filteredHosts.some((host) => host.id === selectedHostId)) {
      setSelectedHostId(filteredHosts[0].id);
    }
  }, [filteredHosts, selectedHostId]);

  const selectedHost = filteredHosts.find((host) => host.id === selectedHostId);
  const onlineCount = hosts.filter((host) => host.status === "Online").length;
  const offlineCount = hosts.filter((host) => host.status === "Offline").length;
  const degradedCount = hosts.filter(
    (host) => host.status === "Degradado",
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Hosts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Inventario operacional de dispositivos
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Estado real dos hosts monitorados com base na disponibilidade da
              interface principal, busca por nome ou IP e painel de contexto
              para triagem.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {hosts.length}
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                Online
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-100">
                {onlineCount}
              </p>
            </div>
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">
                Offline
              </p>
              <p className="mt-3 text-3xl font-semibold text-rose-100">
                {offlineCount}
              </p>
            </div>
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                Degradado
              </p>
              <p className="mt-3 text-3xl font-semibold text-amber-100">
                {degradedCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full max-w-xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar host, IP ou grupo"
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </label>

            <div className="text-sm text-slate-400">
              {filteredHosts.length} de {hosts.length} hosts exibidos
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatus(filter)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  status === filter
                    ? "bg-noc-accent text-slate-950"
                    : "border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} />
              <p>Falha ao carregar a base de hosts.</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-rose-500 bg-rose-500/20 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/30"
            >
              Recarregar
            </button>
          </div>
          <p className="mt-3 text-xs text-rose-200">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-400">
              Carregando hosts reais...
            </div>
          ) : (
            <HostTable
              hosts={filteredHosts}
              selectedHostId={selectedHostId}
              onSelectHost={setSelectedHostId}
            />
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-noc-surface3 p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Detalhe
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            Contexto do host
          </h3>

          {!selectedHost ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
              Selecione um host para visualizar o contexto operacional.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Host
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedHost.name}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  IP
                </p>
                <p className="mt-2 text-sm text-slate-200">{selectedHost.ip}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Status operacional
                </p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  {selectedHost.status}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {selectedHost.statusReason ?? "Sem detalhe adicional."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Interface
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {selectedHost.interfaceType ?? "Nao definido"}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Monitoramento
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {selectedHost.monitoringMode ?? "Monitorado"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Ultimo check
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedHost.lastChecked}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Grupos
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {selectedHost.location}
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default HostsPage;
