const { PrismaClient } = require('@prisma/client');

// Singleton instance
const prisma = new PrismaClient();

console.log('💎 Prisma Singleton Instance Initialized');

module.exports = prisma;
