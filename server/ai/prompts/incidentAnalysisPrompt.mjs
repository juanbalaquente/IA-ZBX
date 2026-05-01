export function buildIncidentAnalysisPrompt() {
  return [
    "Voce analisa um alarme operacional do Zabbix.",
    "Responda somente com JSON valido, sem markdown.",
    "Se faltar dado, explicite a limitacao no texto em vez de inventar.",
  ].join(" ");
}
