import nodemailer from "nodemailer";
import type { AccountLocale } from "@/lib/locale";

export type PasswordResetMailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  disableFileAccess: true;
  disableUrlAccess: true;
};

export type PasswordResetMailTransport = {
  sendMail(message: PasswordResetMailMessage): Promise<unknown>;
};

type SmtpEnvironment = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
  [key: string]: string | undefined;
};

type SmtpConfig = {
  host: string;
  port: 465 | 587;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

type PasswordResetEmailInput = {
  to: string;
  locale: AccountLocale;
  resetUrl: string;
};

type PasswordResetEmailDependencies = {
  transport?: PasswordResetMailTransport;
  from?: string;
  environment?: SmtpEnvironment;
};

const passwordResetEmailCopy = {
  EN: {
    subject: "Reset your School Records password",
    greeting: "Hello,",
    requestCopy:
      "We received a request to reset the password for your School Records account.",
    actionCopy: "Use this secure link to choose a new password:",
    linkLabel: "Reset password",
    expiryCopy: "This link expires in 30 minutes and can be used only once.",
    ignoreCopy:
      "If you did not request this change, you can ignore this email. Your password will remain unchanged.",
  },
  PT_BR: {
    subject: "Redefina sua senha dos Registros Escolares",
    greeting: "Olá,",
    requestCopy:
      "Recebemos uma solicitação para redefinir a senha da sua conta nos Registros Escolares.",
    actionCopy: "Use este link seguro para escolher uma nova senha:",
    linkLabel: "Redefinir senha",
    expiryCopy:
      "Este link expira em 30 minutos e pode ser usado apenas uma vez.",
    ignoreCopy:
      "Se você não solicitou esta alteração, ignore este e-mail. Sua senha continuará a mesma.",
  },
} as const;

function readRequiredEnvironmentValue(
  environment: SmtpEnvironment,
  key: keyof SmtpEnvironment,
) {
  const value = environment[key]?.trim();

  if (!value) {
    throw new Error(`Missing required SMTP configuration: ${key}`);
  }

  return value;
}

export function readSmtpConfig(environment: SmtpEnvironment = process.env) {
  const host = readRequiredEnvironmentValue(environment, "SMTP_HOST");
  const portValue = readRequiredEnvironmentValue(environment, "SMTP_PORT");
  const secureValue = readRequiredEnvironmentValue(environment, "SMTP_SECURE");
  const user = readRequiredEnvironmentValue(environment, "SMTP_USER");
  const password = readRequiredEnvironmentValue(environment, "SMTP_PASSWORD");
  const from = readRequiredEnvironmentValue(environment, "SMTP_FROM");
  const port = Number(portValue);

  if (port !== 465 && port !== 587) {
    throw new Error("SMTP_PORT must be 465 or 587");
  }

  if (secureValue !== "true" && secureValue !== "false") {
    throw new Error("SMTP_SECURE must be true or false");
  }

  const secure = secureValue === "true";

  if ((port === 465 && !secure) || (port === 587 && secure)) {
    throw new Error(
      "SMTP_SECURE must be true for port 465 and false for port 587",
    );
  }

  if (!user.includes("@")) {
    throw new Error("SMTP_USER must be the full mailbox address");
  }

  return { host, port, secure, user, password, from } satisfies SmtpConfig;
}

export function createSmtpTransport(config: SmtpConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return {
    sendMail(message: PasswordResetMailMessage) {
      return transporter.sendMail(message);
    },
  } satisfies PasswordResetMailTransport;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
  dependencies: PasswordResetEmailDependencies = {},
) {
  const config = dependencies.transport
    ? null
    : readSmtpConfig(dependencies.environment);
  const transport = dependencies.transport ?? createSmtpTransport(config!);
  const from = dependencies.from ?? config?.from;

  if (!from) {
    throw new Error("SMTP_FROM is required when injecting a mail transport");
  }

  const copy = passwordResetEmailCopy[input.locale];
  const safeResetUrl = escapeHtml(input.resetUrl);
  const text = [
    copy.greeting,
    "",
    copy.requestCopy,
    copy.actionCopy,
    input.resetUrl,
    "",
    copy.expiryCopy,
    copy.ignoreCopy,
  ].join("\n");
  const html = [
    `<p>${copy.greeting}</p>`,
    `<p>${copy.requestCopy}</p>`,
    `<p>${copy.actionCopy}</p>`,
    `<p><a href="${safeResetUrl}">${copy.linkLabel}</a></p>`,
    `<p>${copy.expiryCopy}</p>`,
    `<p>${copy.ignoreCopy}</p>`,
  ].join("");

  await transport.sendMail({
    from,
    to: input.to,
    subject: copy.subject,
    text,
    html,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
