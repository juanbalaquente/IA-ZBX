export async function callGroqProvider(config, payload) {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY nao configurada.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        { role: "system", content: payload.systemPrompt },
        { role: "user", content: payload.userPrompt },
      ],
      max_tokens: payload.maxTokens ?? config.groqMaxTokens,
      temperature: payload.temperature ?? config.groqTemperature,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Erro ao chamar Groq.");
  }

  return {
    content: json.choices?.[0]?.message?.content?.trim() || "",
    model: json.model || config.groqModel,
    provider: "groq",
  };
}
