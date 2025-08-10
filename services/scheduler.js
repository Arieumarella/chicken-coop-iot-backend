const cron = require('node-cron');
const { prisma } = require('../utils/prisma');
const { publishRelayCommand } = require('../controllers/relayController');
const mqttClient = require('../config/mqtt');
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX;

const checkAndExecuteSchedules = async () => {
    try {
        console.log("masuk checkAndExecuteSchedules...");
        const now = new Date();
        const currentMillis = now.getTime();

        const activeSchedules = await prisma.relaySchedule.findMany({
            where: { isActive: true },
            include: { relay: true }
        });

        for (const schedule of activeSchedules) {
            const { relay, startTime, durationMinutes, daysOfWeek } = schedule;
            // Log nilai asli dari Prisma
            //  console.log(`[DEBUG RAW] Jadwal ID: ${schedule.id}, startTime (raw): ${startTime}`);

            if (!relay || !relay.deviceId || typeof relay.relayChannel === 'undefined') {
                //  console.warn(`[SCHEDULE] Skipping schedule ID: ${schedule.id}. Associated relay data is incomplete or missing.`);
                continue;
            }

            const { deviceId, relayChannel, desiredState } = relay;

            const currentDayOfWeek = (now.getDay() === 0 ? 6 : now.getDay() - 1); // 0=Senin, ..., 6=Minggu
            if (daysOfWeek && daysOfWeek.length === 7 && daysOfWeek[currentDayOfWeek] === '1') {

                // Ambil jam dari startTime (Date object) sebagai string "HH:MM:SS"
                const startTimeStr = startTime ? startTime.toISOString().substring(11, 19) : null;
                // Parse jam, menit, detik dari string
                let scheduleStartHour = 0, scheduleStartMinute = 0, scheduleStartSecond = 0;
                if (startTimeStr) {
                    const [h, m, s] = startTimeStr.split(':');
                    scheduleStartHour = parseInt(h, 10);
                    scheduleStartMinute = parseInt(m, 10);
                    scheduleStartSecond = parseInt(s, 10);
                }

                // Buat objek Date untuk waktu mulai jadwal PADA HARI INI
                const scheduleStartTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), scheduleStartHour, scheduleStartMinute, scheduleStartSecond);
                const scheduleStartMillis = scheduleStartTimeToday.getTime();

                // Hitung waktu selesai jadwal
                const scheduleEndTimeToday = new Date(scheduleStartTimeToday.getTime() + durationMinutes * 60 * 1000);
                const scheduleEndMillis = scheduleEndTimeToday.getTime();

                

                // Logika menyalakan relay SELAMA MASIH DALAM RENTANG WAKTU
                if (currentMillis >= scheduleStartMillis && currentMillis < scheduleEndMillis) {
                    await publishRelayCommand(deviceId, relayChannel, true);

                    // Publish ke topic request/relays agar handler di mqttHandler terpicu
                    console.log("nyala relay ");
                    mqttClient.publish(
                        `${MQTT_TOPIC_PREFIX}/request/relays/${deviceId}`,
                        '', // payload kosong, handler hanya butuh deviceId dari topic
                        { qos: 1 }
                    );
                }
                // Logika mematikan relay SETELAH RENTANG WAKTU BERAKHIR
                else if (currentMillis >= scheduleEndMillis) {
                    if (now.getDate() === scheduleStartTimeToday.getDate() ||
                        (now.getDate() === (scheduleStartTimeToday.getDate() + 1) % 31 && scheduleEndTimeToday.getDate() === now.getDate())) {
                        await publishRelayCommand(deviceId, relayChannel, false);

                        // Publish ke topic request/relays agar handler di mqttHandler terpicu
                        console.log("mati relay ");
                        mqttClient.publish(
                            `${MQTT_TOPIC_PREFIX}/request/relays/${deviceId}`,
                            '', // payload kosong
                            { qos: 1 }
                        );
                    }
                }
            } else {
                //  console.log(`[SCHEDULE DEBUG] Jadwal ID: ${schedule.id} tidak aktif di hari ini.`);
            }
        }
    } catch (error) {
        //  console.error('❌ Error in scheduler:', error.message);
    }
};

module.exports = {
    checkAndExecuteSchedules
};