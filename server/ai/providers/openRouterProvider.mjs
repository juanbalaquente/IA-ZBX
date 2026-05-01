export async function callOpenRouterProvider(config, payload) {
  if (!config.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY nao configurada.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.openRouterSiteUrl,
      "X-Title": config.openRouterAppName,
    },
    body: JSON.stringify({
      model: config.openRouterModel,
      messages: [
        { role: "system", content: payload.systemPrompt },
        { role: "user", content: payload.userPrompt },
      ],
      temperature: payload.temperature ?? config.openRouterTemperature ?? 0.2,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Erro ao chamar OpenRouter.");
  }

  return {
    content: json.choices?.[0]?.message?.content?.trim() || "",
    model: json.model || config.openRouterModel,
    provider: "openrouter",
  };
}
