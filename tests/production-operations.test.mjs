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

test("production templates and operator automation do not contain real secrets", () => {
  const environment = read(".env.production.example");
  const workflow = read(".github/workflows/deploy.yml");
  const monitor = read("ops/monitor.sh");

  assert.match(environment, /APP_DATABASE_USER/);
  assert.match(environment, /MIGRATION_DATABASE_URL/);
  assert.doesNotMatch(environment, /password123/);
  assert.match(workflow, /environment:\s*\n\s*name: production/);
  assert.match(workflow, /PRODUCTION_SSH_PRIVATE_KEY/);
  assert.match(monitor, /docker stats/);
  assert.match(monitor, /disk usage/);
});
