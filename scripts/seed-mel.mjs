import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";
import { createServer, loadEnv } from "vite";
const root = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...loadEnv("development", root, "VITE_"),
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("VITE_")),
  ),
};
const required = [
  "API_KEY",
  "AUTH_DOMAIN",
  "PROJECT_ID",
  "STORAGE_BUCKET",
  "MESSAGING_SENDER_ID",
  "APP_ID",
];
if (
  env.VITE_FIREBASE_PROJECT_ID !== "rumos-bsb" ||
  env.VITE_DEMO_MODE !== "false" ||
  required.some((key) => !env[`VITE_FIREBASE_${key}`]?.trim())
) {
  console.error(
    "Cadastro bloqueado. Preencha as seis variáveis VITE_FIREBASE_* no .env para rumos-bsb e defina VITE_DEMO_MODE=false. Nenhum dado foi gravado.",
  );
  process.exitCode = 1;
} else {
  const server = await createServer({
    root,
    configLoader: "runner",
    server: { host: "127.0.0.1", open: "/#/admin/seed-mel" },
  });
  await server.listen();
  server.printUrls();
  console.log(
    "Abra /#/admin/seed-mel, entre com Google e clique em Cadastrar viagem privada no Firestore. Ctrl+C encerra.",
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
}
