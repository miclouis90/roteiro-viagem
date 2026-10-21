const diagnostics = {
  "permission-denied": "Missing or insufficient permissions.",
  unauthenticated: "The request does not have valid authentication credentials.",
  unavailable: "The service is currently unavailable.",
  "deadline-exceeded": "Deadline exceeded.",
  "invalid-argument": "Invalid data supplied to Firestore.",
  "failed-precondition": "The operation requires a valid configuration or state.",
  "not-found": "The requested document was not found.",
  "resource-exhausted": "Resource exhausted.",
  unknown: "Unexpected save failure; original message omitted to protect reservation data.",
} as const;

// Never log an error object, payload, document path, reservation URL or stack.
// Firebase messages for invalid arguments can contain submitted private values.
export function eventSaveFailure(error: unknown, lodging = false) {
  const raw = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  const candidate = typeof raw.code === "string" ? raw.code.replace(/^firestore\//, "") : "";
  const code = Object.hasOwn(diagnostics, candidate) ? candidate as keyof typeof diagnostics : "unknown";
  let message: string;
  switch (code) {
    case "permission-denied":
      message = "O Firestore recusou o salvamento por permissão (permission-denied). Confira seu acesso à viagem." +
        (lodging ? " Se você é proprietário ou colaborador, as regras publicadas precisam aceitar Hospedagem e suas reservas privadas." : "");
      break;
    case "unauthenticated": message = "Sua sessão expirou. Entre novamente antes de salvar (unauthenticated)."; break;
    case "unavailable":
    case "deadline-exceeded": message = `Não foi possível conectar ao Firebase. Confira sua conexão e tente novamente (${code}).`; break;
    case "invalid-argument": message = "Há dados inválidos para salvar. Revise datas, horários, hóspedes e valores (invalid-argument)."; break;
    case "not-found": message = "Este registro não está mais disponível. Atualize a viagem antes de tentar novamente (not-found)."; break;
    case "failed-precondition": message = "O Firebase não está pronto para salvar. Confira a configuração do aplicativo (failed-precondition)."; break;
    case "resource-exhausted": message = "O serviço atingiu um limite temporário. Tente novamente mais tarde (resource-exhausted)."; break;
    default: message = "Não foi possível concluir o salvamento. Seus dados continuam no formulário. Tente novamente.";
  }
  const undefinedValue = code === "invalid-argument" && typeof raw.message === "string" && raw.message.includes("Unsupported field value: undefined");
  return {
    message,
    diagnostic: { code, message: undefinedValue ? "Unsupported field value: undefined" : diagnostics[code] },
  };
}
