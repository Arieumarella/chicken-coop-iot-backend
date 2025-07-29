const cron = require('node-cron');
const { prisma } = require('../utils/prisma');
const { publishRelayCommand } = require('../controllers/relayController'); // Mengimpor fungsi publish

const checkAndExecuteSchedules = async () => {
    try {
        const now = new Date();
        const currentMillis = now.getTime(); // Waktu saat ini dalam milidetik

        const activeSchedules = await prisma.relaySchedule.findMany({
            where: { isActive: true },
            include: { relay: true }
        });

        for (const schedule of activeSchedules) {
            const { relay, startTime, durationMinutes, daysOfWeek } = schedule; // startTime sekarang adalah Date object
            if (!relay || !relay.deviceId || typeof relay.relayChannel === 'undefined') {
                console.warn(`[SCHEDULE] Skipping schedule ID: ${schedule.id}. Associated relay data is incomplete or missing.`);
                continue;
            }

            const { deviceId, relayChannel, desiredState } = relay;

            const currentDayOfWeek = (now.getDay() === 0 ? 6 : now.getDay() - 1); // 0=Senin, ..., 6=Minggu
            if (daysOfWeek && daysOfWeek.length === 7 && daysOfWeek[currentDayOfWeek] === '1') {

                // startTime adalah objek Date, kita hanya butuh jam dan menitnya
                const scheduleStartHour = startTime.getHours();
                const scheduleStartMinute = startTime.getMinutes();
                const scheduleStartSecond = startTime.getSeconds();

                // Buat objek Date untuk waktu mulai jadwal PADA HARI INI
                const scheduleStartTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), scheduleStartHour, scheduleStartMinute, scheduleStartSecond);
                const scheduleStartMillis = scheduleStartTimeToday.getTime();

                // Hitung waktu selesai jadwal
                const scheduleEndTimeToday = new Date(scheduleStartTimeToday.getTime() + durationMinutes * 60 * 1000);
                const scheduleEndMillis = scheduleEndTimeToday.getTime();

                // Logika menyalakan relay
                if (currentMillis >= scheduleStartMillis && currentMillis < scheduleEndMillis && !desiredState) {
                    console.log(`[SCHEDULE] Activating relay ${relayChannel} on device ${deviceId} at ${now.toLocaleTimeString('id-ID')}`);
                    await publishRelayCommand(deviceId, relayChannel, true);
                }
                // Logika mematikan relay
                else if (currentMillis >= scheduleEndMillis && desiredState) {
                    // Pastikan yang dimatikan adalah jadwal yang dimulai hari ini
                    // Ini penting untuk menghindari mematikan jadwal dari hari sebelumnya jika durasi melewati midnight
                    // atau jika scheduler baru saja di-restart.
                    // Jika durasi bisa melewati tengah malam, logika ini perlu diadaptasi lebih lanjut.
                    if (now.getDate() === scheduleStartTimeToday.getDate() ||
                        // Tambahan: jika jadwal dimulai kemarin dan berakhir hari ini
                        (now.getDate() === (scheduleStartTimeToday.getDate() + 1) % 31 && scheduleEndTimeToday.getDate() === now.getDate())) {
                        console.log(`[SCHEDULE] Deactivating relay ${relayChannel} on device ${deviceId} at ${now.toLocaleTimeString('id-ID')}`);
                        await publishRelayCommand(deviceId, relayChannel, false);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error in scheduler:', error.message);
    }
};

module.exports = {
    checkAndExecuteSchedules
};