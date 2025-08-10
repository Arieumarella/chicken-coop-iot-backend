const { prisma } = require('../utils/prisma');

// Fungsi internal yang dipanggil oleh MQTT handler saat data sensor masuk
const saveSensorReading = async (data) => {
    try {
        const { device_id, temperature, humidity, timestamp } = data;
        await prisma.sensorReading.create({
            data: {
                deviceId: device_id,
                temperature: parseFloat(temperature),
                humidity: parseFloat(humidity),
                recordedAt: timestamp ? new Date(timestamp) : new Date() // Gunakan timestamp dari ESP32 jika ada, atau waktu server
            }
        });
        //  console.log(`Saved reading for ${device_id}: Temp=${temperature}°C, Hum=${humidity}%`); // Bisa diaktifkan
    } catch (error) {
        //  console.error('❌ Error saving sensor reading:', error.message, 'Payload:', data);
    }
};

const getAllReadings = async (req, res) => {
    try {
        const { limit = 100 } = req.query; // Batasi jumlah data untuk performa
        const readings = await prisma.sensorReading.findMany({
            take: parseInt(limit),
            orderBy: { recordedAt: 'desc' }
        });
        res.status(200).json(readings);
    } catch (error) {
        //  console.error('❌ Error fetching all readings:', error.message);
        res.status(500).json({ error: 'Failed to fetch all readings', details: error.message });
    }
};

const getReadingsByDeviceId = async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100 } = req.query; // Batasi jumlah data untuk performa
    try {
        const readings = await prisma.sensorReading.findMany({
            where: { deviceId: deviceId },
            take: parseInt(limit),
            orderBy: { recordedAt: 'desc' }
        });
        res.status(200).json(readings);
    } catch (error) {
        //  console.error(`❌ Error fetching readings for device ${deviceId}:`, error.message);
        res.status(500).json({ error: `Failed to fetch readings for device ${deviceId}`, details: error.message });
    }
};

const getLatestReadings = async (req, res) => {
    try {
        // Query mentah untuk mendapatkan pembacaan terakhir dari setiap perangkat
        const readings = await prisma.$queryRaw`
            SELECT sr.*
            FROM sensor_readings sr
            INNER JOIN (
                SELECT device_id, MAX(recorded_at) AS max_recorded_at
                FROM sensor_readings
                GROUP BY device_id
            ) AS latest_readings
            ON sr.device_id = latest_readings.device_id AND sr.recorded_at = latest_readings.max_recorded_at
            ORDER BY sr.recorded_at DESC;
        `;
        res.status(200).json(readings);
    } catch (error) {
        //  console.error('❌ Error fetching latest readings:', error.message);
        res.status(500).json({ error: 'Failed to fetch latest readings', details: error.message });
    }
};

module.exports = {
    saveSensorReading,
    getAllReadings,
    getReadingsByDeviceId,
    getLatestReadings
};