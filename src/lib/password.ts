import crypto from "node:crypto";

const HASH_ALGORITHM = "sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const HASH_PREFIX = "pbkdf2_sha256";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_ALGORITHM)
    .toString("base64url");

  return `${HASH_PREFIX}$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, iterationsValue, salt, originalHash] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !iterationsValue || !salt || !originalHash) {
    return false;
  }

  const iterations = Number(iterationsValue);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const candidateHash = crypto
    .pbkdf2Sync(password, salt, iterations, HASH_KEY_LENGTH, HASH_ALGORITHM)
    .toString("base64url");

  const original = Buffer.from(originalHash);
  const candidate = Buffer.from(candidateHash);

  return (
    original.length === candidate.length &&
    crypto.timingSafeEqual(original, candidate)
  );
}
