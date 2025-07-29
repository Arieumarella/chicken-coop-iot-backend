const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectPrisma() {
    try {
        await prisma.$connect();
        console.log('✅ Connected successfully to Prisma database!');
    } catch (error) {
        console.error('❌ Error connecting to Prisma database:', error.message);
        process.exit(1); // Keluar dari aplikasi jika koneksi database gagal
    }
}

module.exports = {
    prisma,
    connectPrisma
};