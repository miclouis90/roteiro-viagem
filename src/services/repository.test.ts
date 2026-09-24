import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  get: vi.fn(),
  rows: vi.fn(),
  batch: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../lib/firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "editor" } },
  demoMode: false,
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  getDocFromServer: mock.get,
  getDocs: mock.rows,
  writeBatch: mock.batch,
  deleteDoc: mock.remove,
  updateDoc: mock.update,
  deleteField: () => "DELETE",
  serverTimestamp: () => "NOW",
}));
import { removeTrip, saveEvent } from "./repository";
import { demoEvents } from "../data/demo";
import { eventInput } from "../utils/inputs";
beforeEach(() => vi.clearAllMocks());
describe("proteção no repositório", () => {
  it("editor não apaga filhos ao tentar excluir uma viagem", async () => {
    mock.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ ownerId: "owner" }),
    });
    await expect(removeTrip("trip")).rejects.toThrow("Somente o proprietário");
    expect(mock.rows).not.toHaveBeenCalled();
    expect(mock.batch).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it("viagem legada exige propriedade antes de qualquer exclusão", async () => {
    mock.get.mockResolvedValue({ exists: () => true, data: () => ({}) });
    await expect(removeTrip("trip")).rejects.toThrow("Somente o proprietário");
    expect(mock.rows).not.toHaveBeenCalled();
  });
  it("edição envia só campos modificados e timestamp", async () => {
    const base = eventInput(demoEvents[0]);
    await saveEvent("trip", { ...base, location: "Novo café" }, "event", base);
    expect(mock.update).toHaveBeenCalledWith("event", {
      location: "Novo café",
      updatedAt: "NOW",
    });
  });
});
