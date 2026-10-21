import { expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { eventSaveFailure } from "./eventSaveError";

it.each([
  ["permission-denied", "permissão"], ["firestore/unauthenticated", "sessão"],
  ["unavailable", "conexão"], ["deadline-exceeded", "conexão"],
  ["invalid-argument", "dados inválidos"], ["not-found", "não está mais disponível"],
])("diferencia o erro %s", (code, text) => {
  expect(eventSaveFailure(new FirebaseError(code, "PRIVATE-CODE https://example.com/SECRET"), true).message.toLowerCase()).toContain(text);
});
it("orienta publicação de regras sem sugerir acesso público a reservas", () => {
  const failure = eventSaveFailure(new FirebaseError("permission-denied", "Missing or insufficient permissions."), true);
  expect(failure.message).toContain("regras publicadas");
  expect(failure.diagnostic).toEqual({ code: "permission-denied", message: "Missing or insufficient permissions." });
});
it("preserva o diagnóstico de undefined sem registrar caminho ou conteúdo privado", () => {
  const failure = eventSaveFailure(new FirebaseError("invalid-argument", "Unsupported field value: undefined (found in PRIVATE-CODE /trips/SECRET)"));
  expect(failure.diagnostic.message).toBe("Unsupported field value: undefined");
  expect(JSON.stringify(failure)).not.toMatch(/PRIVATE-CODE|SECRET|\/trips\//);
});
it.each([new Error("PRIVATE-CODE"), {code:"SECRET",message:"PRIVATE-CODE"}, null, "PRIVATE-CODE"])("não registra dados de erros desconhecidos", cause => {
  expect(JSON.stringify(eventSaveFailure(cause))).not.toMatch(/PRIVATE-CODE|SECRET/);
});
