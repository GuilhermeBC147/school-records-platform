import crypto from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import pg from "pg";

const { Client } = pg;
const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const CONFIRMATION_WORD = "CRIAR";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_ALGORITHM)
    .toString("base64url");

  return `pbkdf2_sha256$${HASH_ITERATIONS}$${salt}$${hash}`;
}

async function ask(question) {
  const prompt = createInterface({ input: stdin, output: stdout });

  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

async function askPassword(question) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Este comando exige um terminal interativo para proteger a senha.");
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    function finish(callback, result) {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      callback(result);
    }

    function onData(chunk) {
      for (const character of chunk.toString("utf8")) {
        if (character === "\r" || character === "\n") {
          finish(resolve, value);
          return;
        }

        if (character === "\u0003") {
          finish(reject, new Error("Operação cancelada."));
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += character;
      }
    }

    stdin.on("data", onData);
  });
}

function validateInput({ name, email, password, confirmationPassword, confirmation }) {
  if (name.length < 2) {
    throw new Error("Informe o nome completo do primeiro administrador.");
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Informe um e-mail válido para o primeiro administrador.");
  }

  if (password.length < 12) {
    throw new Error("A senha inicial deve ter pelo menos 12 caracteres.");
  }

  if (password !== confirmationPassword) {
    throw new Error("As senhas não coincidem.");
  }

  if (confirmation !== CONFIRMATION_WORD) {
    throw new Error(`Operação cancelada. Digite ${CONFIRMATION_WORD} para confirmar.`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está configurada.");
  }

  const client = new Client({ connectionString: databaseUrl });
  let transactionStarted = false;

  try {
    await client.connect();
    const currentUserCount = await client.query('SELECT count(*)::int AS count FROM "User"');
    if (Number(currentUserCount.rows[0].count) !== 0) {
      throw new Error("O banco já possui usuário(s). Este comando não pode ser executado novamente.");
    }

    if (!stdin.isTTY || !stdout.isTTY) {
      throw new Error("Execute este comando manualmente em um terminal interativo.");
    }

    stdout.write("\nCriação do primeiro administrador de produção.\n");
    stdout.write("Este comando só funciona quando o banco não possui nenhum usuário.\n");
    stdout.write("A senha não será exibida nem salva no histórico do terminal.\n\n");

    const name = await ask("Nome completo: ");
    const email = (await ask("E-mail: ")).toLowerCase();
    const password = await askPassword("Senha (mínimo 12 caracteres): ");
    const confirmationPassword = await askPassword("Repita a senha: ");
    const confirmation = await ask(`Digite ${CONFIRMATION_WORD} para criar esta conta: `);

    validateInput({ name, email, password, confirmationPassword, confirmation });

    await client.query("BEGIN");
    transactionStarted = true;
    await client.query('LOCK TABLE "User" IN ACCESS EXCLUSIVE MODE');

    const userCount = await client.query('SELECT count(*)::int AS count FROM "User"');
    if (Number(userCount.rows[0].count) !== 0) {
      throw new Error("O banco já possui usuário(s). Este comando não pode ser executado novamente.");
    }

    await client.query(
      `INSERT INTO "User" (
        "id", "name", "email", "passwordHash", "role", "dateFormat", "locale", "theme", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'ADMIN', 'DD_MM_YY', 'PT_BR', 'LIGHT', true, NOW(), NOW()
      )`,
      [
        `admin_${crypto.randomUUID().replaceAll("-", "")}`,
        name,
        email,
        hashPassword(password),
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;
    stdout.write(`\nAdministrador inicial criado para ${email}. Agora faça login no site.\n`);
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha ao criar o primeiro administrador.");
  process.exitCode = 1;
});
