import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("production Compose keeps PostgreSQL and Next.js off public host ports", () => {
  const compose = read("docker-compose.production.yml");

  assert.match(compose, /caddy:[\s\S]*?ports:[\s\S]*?"80:80"/);
  assert.match(compose, /database-network:\s*\n\s*internal: true/);
  const appBlock = compose.match(/^  app:[\s\S]*?(?=^  [a-z][a-z-]+:|^volumes:)/m)?.[0] ?? "";
  const postgresBlock = compose.match(/^  postgres:[\s\S]*?(?=^  [a-z][a-z-]+:|^volumes:)/m)?.[0] ?? "";
  assert.doesNotMatch(postgresBlock, /ports:/);
  assert.doesNotMatch(appBlock, /ports:/);
  assert.match(compose, /restart: unless-stopped/);
  assert.match(compose, /max-size: "10m"/);
});

test("health routes split public liveness from database-backed readiness", () => {
  const live = read("src/app/api/health/live/route.ts");
  const ready = read("src/app/api/health/ready/route.ts");

  assert.match(live, /status: "ok"/);
  assert.doesNotMatch(live, /prisma/);
  assert.match(ready, /prisma\.\$queryRaw`SELECT 1`/);
  assert.match(ready, /status: "not_ready"/);
  assert.match(ready, /status: 503/);
  assert.doesNotMatch(ready, /error\.message/);
});

test("deployment and recovery scripts protect migrations and backups", () => {
  const deploy = read("ops/deploy.sh");
  const rollback = read("ops/rollback-app.sh");
  const backup = read("ops/backup-postgres.sh");
  const restore = read("ops/restore-postgres.sh");

  assert.match(deploy, /backup-postgres\.sh" pre-deploy/);
  assert.match(deploy, /compose --profile operations run --rm migration/);
  assert.match(deploy, /never rolled back automatically/);
  assert.match(rollback, /does not reverse database migrations/);
  assert.match(backup, /pg_dump/);
  assert.match(backup, /pg_restore --list/);
  assert.match(backup, /sha256sum/);
  assert.match(backup, /rclone copyto/);
  assert.match(restore, /Refusing to restore over the production database/);
  assert.match(restore, /pg_restore/);
});

test("first-admin bootstrap is interactive, one-time, and does not echo passwords", () => {
  const bootstrap = read("ops/bootstrap-first-admin.mjs");
  const bootstrapWrapper = read("ops/bootstrap-first-admin.sh");
  const dockerfile = read("Dockerfile");

  assert.match(bootstrap, /terminal interativo/);
  assert.match(bootstrap, /password\.length < 12/);
  assert.match(bootstrap, /password !== confirmationPassword/);
  assert.match(bootstrap, /LOCK TABLE "User" IN ACCESS EXCLUSIVE MODE/);
  assert.match(bootstrap, /count\(\*\)::int AS count/);
  assert.match(bootstrap, /não pode ser executado novamente/);
  assert.match(bootstrap, /pbkdf2Sync/);
  assert.ok(
    bootstrap.indexOf("const currentUserCount") < bootstrap.indexOf("const password = await askPassword"),
    "an existing user must be detected before a password is requested",
  );
  assert.doesNotMatch(bootstrap, /console\.log\(.*password/i);
  assert.match(bootstrapWrapper, /current-migration-image/);
  assert.match(bootstrapWrapper, /--entrypoint node migration/);
  assert.match(dockerfile, /COPY ops\/bootstrap-first-admin\.mjs/);
});

test("production templates and operator automation do not contain real secrets", () => {
  const environment = read(".env.production.example");
  const workflow = read(".github/workflows/deploy.yml");
  const monitor = read("ops/monitor.sh");
  const PortugueseGuide = read("docs/guia-producao-pt-BR.md");

  assert.match(environment, /APP_DATABASE_USER/);
  assert.match(environment, /MIGRATION_DATABASE_URL/);
  assert.match(environment, /APP_URL=https:\/\//);
  assert.match(environment, /SMTP_HOST=smtp\.hostinger\.com/);
  assert.match(environment, /SMTP_PORT=465/);
  assert.match(environment, /SMTP_SECURE=true/);
  assert.match(environment, /SMTP_USER=replace-with-full-hostinger-mailbox/);
  assert.match(
    environment,
    /SMTP_PASSWORD='replace-with-hostinger-mailbox-password'/,
  );
  assert.match(environment, /SMTP_FROM=/);
  assert.doesNotMatch(environment, /password123/);
  assert.match(workflow, /environment:\s*\n\s*name: production/);
  assert.match(workflow, /PRODUCTION_SSH_PRIVATE_KEY/);
  assert.match(monitor, /docker stats/);
  assert.match(monitor, /disk usage/);
  assert.match(PortugueseGuide, /primeiro administrador/);
  assert.match(PortugueseGuide, /bootstrap-first-admin\.sh/);
  assert.match(PortugueseGuide, /Não usa terminal/);
});

test("production password reset passes protected SMTP configuration safely", () => {
  const compose = read("docker-compose.production.yml");
  const accountActions = read("src/app/actions/accounts.ts");
  const resetService = read("src/lib/password-reset.ts");
  const mailer = read("src/lib/password-reset-email.ts");

  for (const key of [
    "APP_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
  ]) {
    assert.ok(
      compose.includes(`${key}: ` + "${" + `${key}:?${key} is required}`),
      `${key} must be passed into the production app container`,
    );
  }

  assert.match(accountActions, /after\(request\.deliver\)/);
  assert.match(accountActions, /process\.env\.NODE_ENV === "production"/);
  assert.match(resetService, /PASSWORD_RESET_EMAIL_DELIVERY_FAILED/);
  assert.match(resetService, /PASSWORD_RESET_TOKEN_MINUTES = 30/);
  assert.doesNotMatch(resetService, /console\.error\([^)]*,/);
  assert.match(mailer, /requireTLS: !config\.secure/);
  assert.match(mailer, /disableFileAccess: true/);
  assert.match(mailer, /disableUrlAccess: true/);
});
