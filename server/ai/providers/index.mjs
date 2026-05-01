import { callGroqProvider } from "./groqProvider.mjs";
import { callOpenRouterProvider } from "./openRouterProvider.mjs";

function getSelectedProvider(config) {
  return (config.aiProvider || "groq").toLowerCase();
}

export function getConfiguredProviderName(config) {
  const selectedProvider = getSelectedProvider(config);

  if (selectedProvider === "openrouter") {
    return config.openRouterApiKey ? "openrouter" : "unavailable";
  }

  return config.groqApiKey ? "groq" : "unavailable";
}

export async function callAIProvider(config, payload) {
  const selectedProvider = getSelectedProvider(config);

  if (selectedProvider === "openrouter") {
    if (!config.openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY nao configurada.");
    }

    return await callOpenRouterProvider(config, payload);
  }

  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY nao configurada.");
  }

  return await callGroqProvider(config, payload);
}
