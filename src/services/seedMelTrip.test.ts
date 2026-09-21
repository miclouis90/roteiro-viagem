import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import { seedMelTrip } from "./seedMelTrip";
import { melTrip } from "../data/melTrip";
import { daysBetween } from "../utils/dates";
const mock = vi.hoisted(() => ({
  admin: vi.fn(),
  query: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, ...parts: string[]) => ({ id: parts.at(-1) })),
  query: vi.fn(),
  where: vi.fn(),
  getDocFromServer: mock.admin,
  getDocsFromServer: mock.query,
  serverTimestamp: () => "SERVER_TIMESTAMP",
  runTransaction: mock.transaction,
}));
const db = { app: { options: { projectId: "rumos-bsb" } } } as Firestore;
const auth = {
  app: { options: { projectId: "rumos-bsb" } },
  currentUser: { uid: "admin-uid" },
} as Auth;
const snapshot = (id: string, data?: object) => ({
  id,
  exists: () => !!data,
  data: () => data,
});
beforeEach(() => {
  vi.clearAllMocks();
  mock.admin.mockResolvedValue(snapshot("admin-uid", { active: true }));
  mock.query.mockResolvedValue({ docs: [] });
  mock.get.mockResolvedValue(snapshot("brasilia-da-mel-2026"));
  mock.transaction.mockImplementation(async (_db, callback) =>
    callback({ get: mock.get, set: mock.set }),
  );
});
describe("Cadastro seguro de Brasília da Mel", () => {
  it("grava somente a viagem privada com timestamps, sem dias armazenados", async () => {
    expect(await seedMelTrip(db, auth, false)).toEqual({
      id: "brasilia-da-mel-2026",
      created: true,
    });
    expect(mock.set).toHaveBeenCalledExactlyOnceWith(
      { id: "brasilia-da-mel-2026" },
      {
        ...melTrip,
        createdAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      },
    );
    expect(melTrip.isPublic).toBe(false);
    expect(daysBetween(melTrip.startDate, melTrip.endDate)).toBe(5);
    expect(melTrip).not.toHaveProperty("days");
  });
  it("bloqueia outro projeto e modo demonstração antes de acessar o banco", async () => {
    await expect(
      seedMelTrip(
        { app: { options: { projectId: "outro-projeto" } } } as Firestore,
        auth,
        false,
      ),
    ).rejects.toThrow("bloqueado");
    await expect(seedMelTrip(db, auth, true)).rejects.toThrow("bloqueado");
    await expect(
      seedMelTrip(
        db,
        { ...auth, app: { options: { projectId: "outro-projeto" } } } as Auth,
        false,
      ),
    ).rejects.toThrow("bloqueado");
    expect(mock.admin).not.toHaveBeenCalled();
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("exige login e autorização atuais", async () => {
    await expect(
      seedMelTrip(db, { ...auth, currentUser: null } as Auth, false),
    ).rejects.toThrow("Entre");
    mock.admin.mockResolvedValue(snapshot("admin-uid", { active: false }));
    await expect(seedMelTrip(db, auth, false)).rejects.toThrow("permissão");
    expect(mock.query).not.toHaveBeenCalled();
  });
  it("encontra viagem existente com outro ID sem modificar seus campos", async () => {
    mock.query.mockResolvedValue({
      docs: [snapshot("id-manual", { ...melTrip, isPublic: true })],
    });
    expect(await seedMelTrip(db, auth, false)).toEqual({
      id: "id-manual",
      created: false,
    });
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("não duplica na repetição ou quando outro seed vence a corrida", async () => {
    mock.get.mockResolvedValue(snapshot("brasilia-da-mel-2026", melTrip));
    expect((await seedMelTrip(db, auth, false)).created).toBe(false);
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("preserva documento cujo ID esteja ocupado por outra viagem", async () => {
    mock.get.mockResolvedValue(
      snapshot("brasilia-da-mel-2026", {
        title: "Outra viagem",
        startDate: melTrip.startDate,
      }),
    );
    await expect(seedMelTrip(db, auth, false)).rejects.toThrow("outra viagem");
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("aborta quando a leitura falha, sem presumir que não existe", async () => {
    mock.query.mockRejectedValue(new Error("offline"));
    await expect(seedMelTrip(db, auth, false)).rejects.toThrow("offline");
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("não confunde mesmo título em outra data", async () => {
    mock.query.mockResolvedValue({
      docs: [snapshot("outra-data", { ...melTrip, startDate: "2027-10-29" })],
    });
    expect((await seedMelTrip(db, auth, false)).created).toBe(true);
  });
});
