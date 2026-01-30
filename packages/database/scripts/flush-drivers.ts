#!/usr/bin/env node
/**
 * Script to flush all drivers from the database
 * Run with: npx ts-node packages/database/scripts/flush-drivers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function flushDrivers() {
  try {
    console.log("🗑️  Flushing all drivers from database...");

    // Delete all speeding events first (foreign key constraint)
    const speedingDeleted = await prisma.speedingEvent.deleteMany({});
    console.log(`  ✓ Deleted ${speedingDeleted.count} speeding events`);

    // Delete all drivers
    const driversDeleted = await prisma.driver.deleteMany({});
    console.log(`  ✓ Deleted ${driversDeleted.count} drivers`);

    console.log("✅ All drivers flushed successfully!");
  } catch (error) {
    console.error("❌ Error flushing drivers:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

flushDrivers();
