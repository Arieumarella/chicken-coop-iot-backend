const { prisma } = require('../utils/prisma');
const ONLINE_THRESHOLD_MS = 60 * 1000;

const getAllDevices = async (req, res) => {
    try {
        const devices = await prisma.device.findMany();
        res.status(200).json(devices);
    } catch (error) {
        //  console.error('❌ Error fetching devices:', error.message);
        res.status(500).json({ error: 'Failed to fetch devices', details: error.message });
    }
};

const getDeviceById = async (req, res) => {
    const { deviceId } = req.params;
    try {
        const device = await prisma.device.findUnique({
            where: { deviceId: deviceId }
        });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }
        res.status(200).json(device);
    } catch (error) {
        //  console.error(`❌ Error fetching device ${deviceId}:`, error.message);
        res.status(500).json({ error: `Failed to fetch device ${deviceId}`, details: error.message });
    }
};

// Fungsi internal yang dipanggil oleh MQTT handler saat data sensor masuk
const upsertDevice = async (deviceId) => {
    try {
        await prisma.device.upsert({
            where: { deviceId: deviceId },
            update: { lastSeen: new Date(), isActive: true },
            create: { deviceId: deviceId, lastSeen: new Date(), name: `Device ${deviceId}` }
        });
        // //  console.log(`Updated/Created device: ${deviceId}`); // Bisa diaktifkan untuk debugging
    } catch (error) {
        //  console.error(`❌ Error upserting device ${deviceId}:`, error.message);
    }
};

const checkDeviceStatus = async (req, res) => {
    const { deviceId } = req.params;
    try {
        const device = await prisma.device.findUnique({
            where: { deviceId }
        });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }
        const now = Date.now();
        const isOnline = device.lastSeen && (now - new Date(device.lastSeen).getTime() < ONLINE_THRESHOLD_MS);
        res.status(200).json({ deviceId, isOnline, lastSeen: device.lastSeen });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check device status', details: error.message });
    }
};

module.exports = {
    getAllDevices,
    getDeviceById,
    upsertDevice,
    checkDeviceStatus
};