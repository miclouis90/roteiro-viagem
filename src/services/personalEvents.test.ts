import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ uid: "alice", anonymous: false, callback: null as null | ((snapshot: unknown) => void), stop: vi.fn() }));
vi.mock("../lib/firebase", () => ({ db: {}, demoMode: false, auth: { get currentUser() { return state.uid ? { uid: state.uid, isAnonymous: state.anonymous } : null; } } }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...parts: string[]) => parts.join("/")), doc: vi.fn((_db, ...parts: string[]) => parts.join("/")),
  query: vi.fn((...parts) => parts), where: vi.fn((...args) => args),
  addDoc: vi.fn().mockResolvedValue({ id: "new-event" }), updateDoc: vi.fn().mockResolvedValue(undefined), deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: () => "SERVER_TIME", deleteField: () => "DELETE_FIELD",
  onSnapshot: vi.fn((_query, callback) => { state.callback = callback; return state.stop; }),
}));
import { addDoc, collection, deleteDoc, updateDoc, where } from "firebase/firestore";
import { removePersonalEvent, savePersonalEvent, watchPersonalEvents } from "./personalEvents";
import type { PersonalEventInput } from "../utils/personalEvents";
const input: PersonalEventInput = { title: "Show", category: "show", date: "2026-11-20", startTime: "20:30", city: "Brasília", location: "Teatro", priceCents: 15050 };
beforeEach(() => { vi.clearAllMocks(); state.uid = "alice"; state.anonymous = false; state.callback = null; });
it("persiste em coleção própria com usuário real e centavos, sem documentos de viagem", async () => {
  expect(await savePersonalEvent("alice", input)).toBe("new-event");
  expect(addDoc).toHaveBeenCalledExactlyOnceWith("personalEvents", { ...input, ownerId: "alice", createdAt: "SERVER_TIME", updatedAt: "SERVER_TIME" });
  expect(collection).toHaveBeenCalledExactlyOnceWith(expect.anything(), "personalEvents");
});
it("editar substitui valores e remove opcionais sem duplicar nem alterar dono/data de criação", async () => {
  await savePersonalEvent("alice", { ...input, priceCents: undefined }, "old-event");
  expect(updateDoc).toHaveBeenCalledExactlyOnceWith("personalEvents/old-event", { ...input, endTime: "DELETE_FIELD", priceCents: "DELETE_FIELD", ticketUrl: "DELETE_FIELD", notes: "DELETE_FIELD", updatedAt: "SERVER_TIME" });
  expect(addDoc).not.toHaveBeenCalled();
});
it("assina somente eventos do usuário, ordena e ignora notificações depois de sair", () => {
  const next = vi.fn(), error = vi.fn(); const stop = watchPersonalEvents("alice", next, error);
  expect(where).toHaveBeenCalledWith("ownerId", "==", "alice");
  const snapshot = { docs: [{ id: "b", data: () => ({ ...input, ownerId: "alice", date: "2027-01-01" }) }, { id: "a", data: () => ({ ...input, ownerId: "alice" }) }] };
  state.callback!(snapshot); expect(next.mock.calls[0][0].map((row: { id: string }) => row.id)).toEqual(["a", "b"]);
  stop(); state.callback!(snapshot); expect(next).toHaveBeenCalledTimes(1); expect(state.stop).toHaveBeenCalledOnce();
});
it("rejeita troca de usuário, anonimato, sessão ausente e dados inválidos antes de gravar", async () => {
  await expect(savePersonalEvent("bob", input)).rejects.toMatchObject({ code: "unauthenticated" });
  state.anonymous = true; await expect(savePersonalEvent("alice", input)).rejects.toMatchObject({ code: "unauthenticated" });
  state.uid = ""; await expect(removePersonalEvent("alice", "x")).rejects.toMatchObject({ code: "unauthenticated" });
  state.uid = "alice"; state.anonymous = false; await expect(savePersonalEvent("alice", { ...input, date: "2026-02-30" })).rejects.toMatchObject({ code: "invalid-argument" });
  expect(addDoc).not.toHaveBeenCalled(); expect(deleteDoc).not.toHaveBeenCalled();
});
it("não emite payloads de outro dono nem notificações privadas após troca de conta", () => {
  const next = vi.fn(), error = vi.fn(); watchPersonalEvents("alice", next, error);
  state.callback!({ docs: [{ id: "b", data: () => ({ ...input, ownerId: "bob" }) }] }); expect(next).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledOnce();
  state.uid = "bob"; state.callback!({ docs: [{ id: "a", data: () => ({ ...input, ownerId: "alice" }) }] }); expect(next).not.toHaveBeenCalled();
});
it("exclui somente o documento escolhido e propaga falha de permissão", async () => {
  await removePersonalEvent("alice", "old-event"); expect(deleteDoc).toHaveBeenCalledExactlyOnceWith("personalEvents/old-event");
  vi.mocked(deleteDoc).mockRejectedValueOnce(Object.assign(new Error("blocked"), { code: "permission-denied" }));
  await expect(removePersonalEvent("alice", "not-owned")).rejects.toMatchObject({ code: "permission-denied" });
});
