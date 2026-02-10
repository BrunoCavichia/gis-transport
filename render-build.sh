#!/usr/bin/env bash
set -e

echo "=== [1/6] Installing pnpm ==="
npm install -g pnpm@10

echo "=== [2/6] Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== [3/6] Generating Prisma Client ==="
cd packages/database && pnpm exec prisma generate && cd ../..

echo "=== [4/6] Building packages/shared ==="
cd packages/shared && npx tsc && cd ../..

echo "=== [5/6] Building packages/database ==="
cd packages/database && npx tsc && cd ../..

echo "=== [6/6] Building apps/api ==="
cd apps/api && npx tsc && cd ../..

echo "=== Verifying build output ==="
ls -la apps/api/dist/
echo "=== Build complete ==="
