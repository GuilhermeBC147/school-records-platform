import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_RESET_DELIVERY_FAILURE_SIGNAL,
  buildPasswordResetUrl,
  hashPasswordResetToken,
  preparePasswordResetRequest,
  type ActivePasswordResetUser,
  type PasswordResetRepository,
} from "../src/lib/password-reset";
import {
  readSmtpConfig,
  sendPasswordResetEmail,
  type PasswordResetMailMessage,
  type PasswordResetMailTransport,
} from "../src/lib/password-reset-email";

const fixedNow = new Date("2026-07-12T18:00:00.000Z");
const fixedToken = "raw-reset-token-that-must-stay-private";

function createRepository(user: ActivePasswordResetUser | null) {
  const createdTokens: Array<{
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }> = [];

  const repository: PasswordResetRepository = {
    async findActiveUserByEmail() {
      return user;
    },
    async createToken(input) {
      createdTokens.push(input);
    },
  };

  return { repository, createdTokens };
}

function createTransport() {
  const messages: PasswordResetMailMessage[] = [];
  const transport: PasswordResetMailTransport = {
    async sendMail(message) {
      messages.push(message);
      return { accepted: [message.to] };
    },
  };

  return { transport, messages };
}

async function prepareLocalizedRequest(locale: "EN" | "PT_BR") {
  const { repository, createdTokens } = createRepository({
    id: `user-${locale}`,
    email: `${locale.toLowerCase()}@example.edu.br`,
    locale,
  });
  const { transport, messages } = createTransport();
  const request = await preparePasswordResetRequest({
    email: `${locale.toLowerCase()}@example.edu.br`,
    appUrl: "https://records.example.edu.br",
    exposeDevelopmentToken: false,
    repository,
    sendEmail: (input) =>
      sendPasswordResetEmail(input, {
        transport,
        from: "School Records <no-reply@example.edu.br>",
      }),
    now: () => fixedNow,
    createRawToken: () => fixedToken,
  });

  await request.deliver?.();

  return { request, createdTokens, messages };
}

test("active English account receives a reset message through the injected transport", async () => {
  const { request, createdTokens, messages } = await prepareLocalizedRequest("EN");

  assert.equal(request.developmentToken, undefined);
  assert.equal(createdTokens.length, 1);
  assert.equal(createdTokens[0].tokenHash, hashPasswordResetToken(fixedToken));
  assert.notEqual(createdTokens[0].tokenHash, fixedToken);
  assert.equal(
    createdTokens[0].expiresAt.toISOString(),
    "2026-07-12T18:30:00.000Z",
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, "en@example.edu.br");
  assert.equal(messages[0].subject, "Reset your School Records password");
  assert.match(messages[0].text, /expires in 30 minutes/);
  assert.match(
    messages[0].text,
    /https:\/\/records\.example\.edu\.br\/reset-password\?token=/,
  );
  assert.equal(messages[0].disableFileAccess, true);
  assert.equal(messages[0].disableUrlAccess, true);
});

test("active Brazilian Portuguese account receives localized reset copy", async () => {
  const { messages } = await prepareLocalizedRequest("PT_BR");

  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, "pt_br@example.edu.br");
  assert.equal(
    messages[0].subject,
    "Redefina sua senha dos Registros Escolares",
  );
  assert.match(messages[0].text, /expira em 30 minutos/);
  assert.match(messages[0].text, /Se você não solicitou esta alteração/);
});

test("unknown or inactive account stays generic and creates or sends nothing", async () => {
  const { repository, createdTokens } = createRepository(null);
  let sendCount = 0;
  const request = await preparePasswordResetRequest({
    email: "unknown@example.edu.br",
    appUrl: "https://records.example.edu.br",
    exposeDevelopmentToken: false,
    repository,
    sendEmail: async () => {
      sendCount += 1;
    },
    createRawToken: () => fixedToken,
  });

  await request.deliver?.();

  assert.deepEqual(request, {});
  assert.equal(createdTokens.length, 0);
  assert.equal(sendCount, 0);
});

test("production preparation never returns the raw reset token", async () => {
  const { repository } = createRepository({
    id: "user-production",
    email: "production@example.edu.br",
    locale: "EN",
  });
  const request = await preparePasswordResetRequest({
    email: "production@example.edu.br",
    appUrl: "https://records.example.edu.br",
    exposeDevelopmentToken: false,
    repository,
    sendEmail: async () => undefined,
    createRawToken: () => fixedToken,
  });

  assert.equal(request.developmentToken, undefined);
  assert.equal(JSON.stringify(request).includes(fixedToken), false);
});

test("development preparation keeps the existing test-safe token seam", async () => {
  const { repository } = createRepository({
    id: "user-development",
    email: "development@example.edu.br",
    locale: "EN",
  });
  const request = await preparePasswordResetRequest({
    email: "development@example.edu.br",
    appUrl: undefined,
    exposeDevelopmentToken: true,
    repository,
    sendEmail: async () => undefined,
    createRawToken: () => fixedToken,
  });

  assert.equal(request.developmentToken, fixedToken);
});

test("delivery failures emit only the fixed safe operational signal", async () => {
  const { repository } = createRepository({
    id: "user-failure",
    email: "failure@example.edu.br",
    locale: "EN",
  });
  const loggedValues: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...values: unknown[]) => {
    loggedValues.push(values);
  };

  try {
    const request = await preparePasswordResetRequest({
      email: "failure@example.edu.br",
      appUrl: "https://records.example.edu.br",
      exposeDevelopmentToken: false,
      repository,
      sendEmail: async () => {
        throw new Error(
          `smtp-password=secret recipient=failure@example.edu.br token=${fixedToken}`,
        );
      },
      createRawToken: () => fixedToken,
    });

    await request.deliver?.();
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(loggedValues, [[PASSWORD_RESET_DELIVERY_FAILURE_SIGNAL]]);
  const serializedLogs = JSON.stringify(loggedValues);
  assert.equal(serializedLogs.includes("smtp-password"), false);
  assert.equal(serializedLogs.includes("failure@example.edu.br"), false);
  assert.equal(serializedLogs.includes(fixedToken), false);
});

test("reset URL uses only the explicit HTTPS APP_URL origin", () => {
  assert.equal(
    buildPasswordResetUrl("https://records.example.edu.br", "token-value"),
    "https://records.example.edu.br/reset-password?token=token-value",
  );
  assert.throws(() =>
    buildPasswordResetUrl("http://records.example.edu.br", "token-value"),
  );
  assert.throws(() =>
    buildPasswordResetUrl(
      "https://records.example.edu.br/untrusted-path",
      "token-value",
    ),
  );
});

test("SMTP configuration enforces Hostinger TLS port combinations", () => {
  const baseEnvironment = {
    SMTP_HOST: "smtp.hostinger.com",
    SMTP_USER: "no-reply@example.edu.br",
    SMTP_PASSWORD: "placeholder-secret",
    SMTP_FROM: "School Records <no-reply@example.edu.br>",
  };

  assert.deepEqual(
    readSmtpConfig({
      ...baseEnvironment,
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
    }),
    {
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      user: "no-reply@example.edu.br",
      password: "placeholder-secret",
      from: "School Records <no-reply@example.edu.br>",
    },
  );
  assert.equal(
    readSmtpConfig({
      ...baseEnvironment,
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    }).secure,
    false,
  );
  assert.throws(() =>
    readSmtpConfig({
      ...baseEnvironment,
      SMTP_PORT: "587",
      SMTP_SECURE: "true",
    }),
  );
});
