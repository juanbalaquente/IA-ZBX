import {
  Activity,
  AlertTriangle,
  ListChecks,
  MessageCircle,
  Server,
  Settings2,
  Wifi,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: Activity, to: "/dashboard" },
  { label: "Hosts", icon: Server, to: "/hosts" },
  { label: "Problemas", icon: AlertTriangle, to: "/problems" },
  { label: "Enlaces", icon: Wifi, to: "/links" },
  { label: "Consultas IA", icon: MessageCircle, to: "/ia" },
  { label: "Logs", icon: ListChecks, to: "/logs" },
  { label: "Configurações", icon: Settings2, to: "/settings" },
];

function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-noc-surface2 px-4 py-6 md:flex md:flex-col">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-noc-accent/10 text-noc-accent shadow-lg shadow-cyan-500/10">
          <Activity size={24} />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            NOC IA
          </p>
          <h1 className="text-lg font-semibold text-slate-100">
            Controle de Rede
          </h1>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-noc-accent/10 text-slate-100 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-slate-300">Visão operacional</p>
        <p className="mt-2 text-xs leading-5">
          Painel inicial com dados mockados para evolução futura com Zabbix e
          MCP.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
