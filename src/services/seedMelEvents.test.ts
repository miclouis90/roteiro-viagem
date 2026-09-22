import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { melEvents } from "../data/melEvents";
import { melTrip, melTripId } from "../data/melTrip";
import { seedMelEvents, inspectMelTrip } from "./seedMelEvents";
import { eventPriceLabel } from "../utils/eventPrice";
import { categories } from "../data/categories";

const mock = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  get: vi.fn(),
  set: vi.fn(),
  transaction: vi.fn(),
  read: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  serverTimestamp: () => "SERVER_TIMESTAMP",
  getDocFromServer: (...args: unknown[]) => mock.read(...args),
  runTransaction: (...args: unknown[]) => mock.transaction(...args),
}));
const db = { app: { options: { projectId: "rumos-bsb" } } } as Firestore;
const auth = { app: db.app, currentUser: { uid: "admin" } } as Auth;
const tripPath = `trips/${melTripId}`;
const eventPath = (id: string) => `${tripPath}/events/${id}`;
const snapshot = (path: string) => ({
  exists: () => mock.docs.has(path),
  data: () => mock.docs.get(path),
});
beforeEach(() => {
  vi.clearAllMocks();
  mock.docs.clear();
  mock.docs.set("platformAdmins/admin", { active: true });
  mock.docs.set(tripPath, { ...melTrip, isPublic: true });
  mock.get.mockImplementation(async (path: string) => snapshot(path));
  mock.read.mockImplementation(async (path: string) => snapshot(path));
  mock.transaction.mockImplementation(async (_db, callback) => {
    const pending = new Map<string, Record<string, unknown>>();
    mock.set.mockImplementation((path: string, data: Record<string, unknown>) =>
      pending.set(path, data),
    );
    const result = await callback({ get: mock.get, set: mock.set });
    pending.forEach((data, path) => mock.docs.set(path, data));
    return result;
  });
});

describe("dados do roteiro da Mel", () => {
  it("contém os 12 IDs determinísticos e nenhum programa em 02/11", () => {
    expect(melEvents.map((e) => e.id)).toEqual([
      "2026-10-29-parque-olhos-dagua",
      "2026-10-29-iracema",
      "2026-10-30-memorial-jk",
      "2026-10-30-nippon",
      "2026-10-30-museu-nacional",
      "2026-10-30-torre-tv",
      "2026-10-31-feira-216",
      "2026-10-31-espaco-lucio-costa",
      "2026-10-31-ponte-jk",
      "2026-10-31-ccbb",
      "2026-11-01-cambui",
      "2026-11-01-ermida-dom-bosco",
    ]);
    for (const event of melEvents) {
      expect(event.date >= "2026-10-29" && event.date <= "2026-11-01").toBe(
        true,
      );
      expect(event.date).not.toBe("2026-11-02");
      expect(event.id.startsWith(event.date)).toBe(true);
    }
  });
  it("respeita exatamente os campos exigidos nas rules e os valores do schema", () => {
    const rules = readFileSync(
      new URL("../../firestore.rules", import.meta.url),
      "utf8",
    );
    const fields = [
      ...rules
        .split("function validEvent")[1]
        .split("hasOnly([")[1]
        .split("])")[0]
        .matchAll(/'([^']+)'/g),
    ]
      .map((m) => m[1])
      .filter((key) => !["createdAt", "updatedAt", "details"].includes(key));
    for (const { id, ...event } of melEvents) {
      expect(id).toBeTruthy();
      expect(Object.keys(event).sort()).toEqual(fields.sort());
      expect([
        "ideia",
        "reservado",
        "confirmado",
        "realizado",
        "cancelado",
      ]).toContain(event.status);
      expect(["imperdível", "gostaria de ir", "opcional"]).toContain(
        event.priority,
      );
      expect(categories.map((c) => c.name)).toContain(event.category);
      expect(event.startTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(event.endTime >= event.startTime).toBe(true);
      expect(event.peopleCount).toBe(2);
      if (event.isFree) expect(event.pricePerPerson).toBe(0);
    }
    expect(melEvents[5].status).toBe("ideia");
    expect(melEvents[2].pricePerPerson).toBe(10);
  });
  it("todos possuem Maps Search e links opcionais aceitam vazio", () => {
    for (const event of melEvents) {
      const maps = new URL(event.mapsUrl);
      expect(maps.origin + maps.pathname).toBe(
        "https://www.google.com/maps/search/",
      );
      expect(maps.searchParams.get("api")).toBe("1");
      expect(maps.searchParams.get("query")).toContain("Brasília");
      for (const key of ["websiteUrl", "instagramUrl", "genericUrl"] as const) {
        expect(
          event[key] === "" || new URL(event[key]).protocol === "https:",
        ).toBe(true);
      }
    }
    expect(new URL(melEvents[0].mapsUrl).searchParams.get("query")).toBe(
      "Parque Olhos d'Água Brasília DF",
    );
    expect(melEvents[0].websiteUrl).toBe("");
  });
  it("distingue grátis, preço indefinido e estimativa conhecida", () => {
    expect(eventPriceLabel(melEvents[0], "BRL")).toBe("Grátis");
    expect(eventPriceLabel(melEvents[1], "BRL")).toBe("Valor a definir");
    expect(eventPriceLabel(melEvents[2], "BRL").replace(/\s/g, " ")).toBe(
      "R$ 20,00",
    );
  });
});

describe("seed transacional", () => {
  it("cria somente os 12 eventos e mantém viagem e eventos alheios intactos", async () => {
    const trip = mock.docs.get(tripPath);
    const manual = { title: "Manual" };
    mock.docs.set(eventPath("manual"), manual);
    const result = await seedMelEvents(db, auth, false);
    expect(result.created).toHaveLength(12);
    expect(result.existing).toEqual([]);
    expect(mock.set).toHaveBeenCalledTimes(12);
    expect(mock.docs.get(tripPath)).toBe(trip);
    expect(mock.docs.get(eventPath("manual"))).toBe(manual);
    expect(Math.max(...mock.get.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...mock.set.mock.invocationCallOrder),
    );
    for (const { id, ...event } of melEvents) {
      expect(mock.docs.get(eventPath(id))).toEqual({
        ...event,
        createdAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      });
    }
  });
  it("segunda execução não duplica nem sobrescreve edições manuais", async () => {
    await seedMelEvents(db, auth, false);
    const edited = {
      ...mock.docs.get(eventPath(melEvents[0].id)),
      title: "Editado",
      pricePerPerson: 55,
      updatedAt: "MANUAL",
    };
    mock.docs.set(eventPath(melEvents[0].id), edited);
    mock.set.mockClear();
    const result = await seedMelEvents(db, auth, false);
    expect(result.created).toEqual([]);
    expect(result.existing).toHaveLength(12);
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.docs.get(eventPath(melEvents[0].id))).toBe(edited);
  });
  it("complementa apenas IDs ausentes", async () => {
    mock.docs.set(eventPath(melEvents[2].id), { title: "Meu Memorial" });
    const result = await seedMelEvents(db, auth, false);
    expect(result.created).toHaveLength(11);
    expect(result.existing).toEqual([melEvents[2].id]);
    expect(mock.docs.get(eventPath(melEvents[2].id))).toEqual({
      title: "Meu Memorial",
    });
  });
  it("bloqueia projeto errado em Firestore ou Auth e modo demo antes de ler", async () => {
    const other = { app: { options: { projectId: "app-michel-e-bella" } } };
    await expect(
      seedMelEvents(other as Firestore, auth, false),
    ).rejects.toThrow("bloqueado");
    await expect(
      seedMelEvents(db, { ...auth, app: other.app } as Auth, false),
    ).rejects.toThrow("bloqueado");
    await expect(seedMelEvents(db, auth, true)).rejects.toThrow("bloqueado");
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("exige usuário autenticado", async () => {
    await expect(
      seedMelEvents(db, { ...auth, currentUser: null } as Auth, false),
    ).rejects.toThrow("Entre");
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it.each([undefined, { active: false }, { active: "true" }])(
    "exige platformAdmin ativo: %j",
    async (data) => {
      if (data) mock.docs.set("platformAdmins/admin", data);
      else mock.docs.delete("platformAdmins/admin");
      await expect(seedMelEvents(db, auth, false)).rejects.toThrow("permissão");
      expect(mock.set).not.toHaveBeenCalled();
    },
  );
  it("aborta se a viagem não existe, sem recriá-la", async () => {
    mock.docs.delete(tripPath);
    await expect(seedMelEvents(db, auth, false)).rejects.toThrow("não existe");
    expect(mock.set).not.toHaveBeenCalled();
  });
  it.each([
    { title: "Outra" },
    { startDate: "2026-10-30" },
    { endDate: "2026-11-01" },
  ])("rejeita identidade ou período divergente: %j", async (change) => {
    mock.docs.set(tripPath, { ...melTrip, ...change });
    await expect(seedMelEvents(db, auth, false)).rejects.toThrow(
      "não corresponde",
    );
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("falha de leitura não é interpretada como ausência", async () => {
    mock.get.mockRejectedValueOnce(new Error("offline"));
    await expect(seedMelEvents(db, auth, false)).rejects.toThrow("offline");
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("não informa sucesso se o commit falhar", async () => {
    mock.transaction.mockRejectedValueOnce(new Error("permission-denied"));
    await expect(seedMelEvents(db, auth, false)).rejects.toThrow(
      "permission-denied",
    );
  });
  it("inspeção administrativa usa leitura do servidor sem gravação", async () => {
    expect(await inspectMelTrip(db, auth, false)).toBe(true);
    mock.docs.delete(tripPath);
    expect(await inspectMelTrip(db, auth, false)).toBe(false);
    expect(mock.transaction).not.toHaveBeenCalled();
    expect(mock.set).not.toHaveBeenCalled();
  });
});
