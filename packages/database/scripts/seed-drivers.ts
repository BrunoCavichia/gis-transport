#!/usr/bin/env node
/**
 * Script to seed initial drivers in the database
 * Run with: npx ts-node packages/database/scripts/seed-drivers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDrivers() {
  try {
    console.log("🚗 Seeding drivers into database...");

    const drivers = [
      {
        name: "Juan García",
        licenseType: "C",
        licenseNumber: "12345ABC",
        onTimeDeliveryRate: 98,
        isAvailable: true,
        imageUrl: null,
        currentVehicleId: null,
      },
      {
        name: "María López",
        licenseType: "C",
        licenseNumber: "67890DEF",
        onTimeDeliveryRate: 95,
        isAvailable: true,
        imageUrl: null,
        currentVehicleId: null,
      },
      {
        name: "Carlos Martínez",
        licenseType: "C+E",
        licenseNumber: "11111GHI",
        onTimeDeliveryRate: 92,
        isAvailable: true,
        imageUrl: null,
        currentVehicleId: null,
      },
      {
        name: "Ana Rodríguez",
        licenseType: "C",
        licenseNumber: "22222JKL",
        onTimeDeliveryRate: 99,
        isAvailable: true,
        imageUrl: null,
        currentVehicleId: null,
      },
      {
        name: "Pedro Sánchez",
        licenseType: "C",
        licenseNumber: "33333MNO",
        onTimeDeliveryRate: 96,
        isAvailable: false,
        imageUrl: null,
        currentVehicleId: "vehicle-1",
      },
    ];

    for (const driver of drivers) {
      await prisma.driver.create({ data: driver });
      console.log(`  ✓ Created driver: ${driver.name}`);
    }

    console.log("✅ Drivers seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding drivers:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDrivers();
