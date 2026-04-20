interface Props {
  message: string;
}

function stripMarkdownBold(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

function normalizeAssistantText(message: string) {
  return message
    .replace(/\r\n/g, "\n")
    .replace(/(\*\*[^*]+:\*\*)/g, "\n$1\n")
    .replace(/(\d+\.\s+\*\*)/g, "\n$1")
    .replace(/(\*\s+\*\*)/g, "\n$1")
    .replace(/(\n){3,}/g, "\n\n")
    .trim();
}

function AssistantMessage({ message }: Props) {
  const normalized = normalizeAssistantText(message);
  const blocks = normalized.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length === 1) {
          const line = lines[0];
          const heading = line.match(/^\*\*(.+?)\*\*:?$/);

          if (heading) {
            return (
              <h3
                key={`${blockIndex}-${line}`}
                className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200"
              >
                {stripMarkdownBold(heading[1])}
              </h3>
            );
          }

          return <p key={`${blockIndex}-${line}`}>{stripMarkdownBold(line)}</p>;
        }

        return (
          <div key={`${blockIndex}-${lines[0]}`} className="space-y-2">
            {lines.map((line, lineIndex) => {
              const cleaned = stripMarkdownBold(line).replace(/^\*\s*/, "");

              if (/^\d+\.\s+/.test(cleaned) || line.startsWith("*")) {
                return (
                  <div
                    key={`${blockIndex}-${lineIndex}-${line}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                  >
                    {cleaned}
                  </div>
                );
              }

              return (
                <p key={`${blockIndex}-${lineIndex}-${line}`}>
                  {cleaned}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default AssistantMessage;
