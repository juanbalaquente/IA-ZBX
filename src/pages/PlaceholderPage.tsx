interface Props {
  title: string;
  description: string;
}

function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-noc-surface3/95 p-8 shadow-soft">
      <div className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          {title}
        </p>
        <h3 className="text-3xl font-semibold text-slate-100">
          Página em desenvolvimento
        </h3>
        <p className="max-w-2xl text-sm leading-7 text-slate-400">
          {description} Esta área foi preparada para receber os componentes de
          análise, filtros e visualização necessários no fluxo operacional.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;
