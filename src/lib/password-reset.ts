import crypto from "node:crypto";
import type { AccountLocale } from "@/lib/locale";

export const PASSWORD_RESET_TOKEN_MINUTES = 30;
export const PASSWORD_RESET_DELIVERY_FAILURE_SIGNAL =
  "PASSWORD_RESET_EMAIL_DELIVERY_FAILED";

const PASSWORD_RESET_TOKEN_BYTES = 32;

export type ActivePasswordResetUser = {
  id: string;
  email: string;
  locale: AccountLocale;
};

export type PasswordResetRepository = {
  findActiveUserByEmail(email: string): Promise<ActivePasswordResetUser | null>;
  createToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export type PasswordResetEmailSender = (input: {
  to: string;
  locale: AccountLocale;
  resetUrl: string;
}) => Promise<void>;

type PreparePasswordResetInput = {
  email: string;
  appUrl: string | undefined;
  exposeDevelopmentToken: boolean;
  repository: PasswordResetRepository;
  sendEmail: PasswordResetEmailSender;
  now?: () => Date;
  createRawToken?: () => string;
  reportDeliveryFailure?: () => void;
};

type PreparedPasswordResetRequest = {
  deliver?: () => Promise<void>;
  developmentToken?: string;
};

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export function buildPasswordResetUrl(appUrl: string | undefined, token: string) {
  if (!appUrl) {
    throw new Error("APP_URL is required for password-reset delivery");
  }

  const baseUrl = new URL(appUrl);

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("APP_URL must be an HTTPS origin without a path or credentials");
  }

  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
}

export function reportPasswordResetDeliveryFailure() {
  console.error(PASSWORD_RESET_DELIVERY_FAILURE_SIGNAL);
}

export async function preparePasswordResetRequest(
  input: PreparePasswordResetInput,
): Promise<PreparedPasswordResetRequest> {
  const user = await input.repository.findActiveUserByEmail(input.email);

  if (!user) {
    return {};
  }

  const now = input.now?.() ?? new Date();
  const token =
    input.createRawToken?.() ??
    crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000,
  );

  await input.repository.createToken({
    userId: user.id,
    tokenHash: hashPasswordResetToken(token),
    expiresAt,
  });

  const deliver = async () => {
    try {
      const resetUrl = buildPasswordResetUrl(input.appUrl, token);

      await input.sendEmail({
        to: user.email,
        locale: user.locale,
        resetUrl,
      });
    } catch {
      (input.reportDeliveryFailure ?? reportPasswordResetDeliveryFailure)();
    }
  };

  return {
    deliver,
    ...(input.exposeDevelopmentToken ? { developmentToken: token } : {}),
  };
}
