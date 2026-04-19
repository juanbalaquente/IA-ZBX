import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  aiQuerySuggestions,
  resolveAIQuery,
} from "../services/aiQueryService";

function QueryConsole() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string>(
    "Use uma consulta operacional para buscar hosts por nome, grupo, IP ou status, e cruzar isso com alarmes e eventos do Zabbix.",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery || loading) return;

    setLoading(true);

    try {
      const answer = await resolveAIQuery(nextQuery);
      setResponse(answer);
      setQuery("");
    } catch (error) {
      setResponse(`Falha ao consultar dados: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExample = (value: string) => {
    setQuery(value);
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Consulta IA
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-100">
            Pergunte em linguagem natural
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Esta consulta usa a camada MCP local e retorna dados reais do
            ambiente, incluindo filtros compostos para hosts, alarmes e eventos.
          </p>
        </div>
        <div className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
          Assistente operacional
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <textarea
          rows={4}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: hosts com olt no nome e offline, hosts do grupo speednet, alarmes do host X"
          className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {aiQuerySuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleExample(suggestion)}
                className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 transition hover:border-slate-700 hover:bg-slate-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 rounded-3xl bg-noc-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Consultando" : "Consultar"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300 shadow-inner">
        <div className="mb-4 flex items-center gap-2 text-slate-400">
          <Sparkles size={16} />
          <span>Resposta operacional</span>
        </div>
        <p>{response}</p>
      </div>
    </section>
  );
}

export default QueryConsole;
