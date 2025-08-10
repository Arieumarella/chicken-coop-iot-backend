const { prisma } = require('../utils/prisma');

// Fungsi util untuk konversi HH:MM:SS ke ISO-8601 dengan tanggal dummy
function timeToISO(timeStr) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${timeStr}.000Z`;
}

const getAllSchedules = async (req, res) => {
    try {
        const { relayId, deviceId } = req.query;
        const where = {};

        if (relayId) {
            where.relayId = parseInt(relayId);
        }
        if (deviceId) {
            // Filter berdasarkan relay.deviceId
            where.relay = { deviceId: deviceId };
        } 

        const schedules = await prisma.relaySchedule.findMany({
            where,
            include: { relay: true } // Sertakan informasi relay terkait
        });

        // Ubah startTime ke format "HH:MM:SS"
        const schedulesFormatted = schedules.map(sch => ({
            ...sch,
            startTime: sch.startTime
                ? sch.startTime.toISOString().substring(11, 19)
                : null
        }));

        res.status(200).json(schedulesFormatted);
    } catch (error) {
        //  console.error('❌ Error fetching schedules:', error.message);
        res.status(500).json({ error: 'Failed to fetch schedules', details: error.message });
    }
};

const createSchedule = async (req, res) => {
    const { relayId, scheduleName, startTime, durationMinutes, daysOfWeek, isActive } = req.body;
    try {
        if (!relayId || !startTime || typeof durationMinutes === 'undefined') {
            return res.status(400).json({ error: 'Missing required fields: relayId, startTime, durationMinutes' });
        }
        // Pastikan relayId ada
        const existingRelay = await prisma.relay.findUnique({ where: { id: parseInt(relayId) } });
        if (!existingRelay) {
            return res.status(404).json({ error: 'Relay not found.' });
        }
        if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
            return res.status(400).json({ error: 'durationMinutes must be a positive number.' });
        }
        // Validasi format startTime (HH:MM:SS) dan daysOfWeek (7 digit biner) bisa ditambahkan
        if (!/^\d{2}:\d{2}:\d{2}$/.test(startTime)) {
            return res.status(400).json({ error: 'Invalid startTime format. Must be HH:MM:SS' });
        }
        if (daysOfWeek && !/^[01]{7}$/.test(daysOfWeek)) {
             return res.status(400).json({ error: 'Invalid daysOfWeek format. Must be 7 binary digits (e.g., "1111111").' });
        }


        const newSchedule = await prisma.relaySchedule.create({
            data: {
                relayId: parseInt(relayId),
                scheduleName,
                startTime: timeToISO(startTime), // Konversi ke ISO-8601
                durationMinutes: parseInt(durationMinutes),
                daysOfWeek: daysOfWeek || '1111111', // Default setiap hari
                isActive: typeof isActive === 'boolean' ? isActive : true
            }
        });
        res.status(201).json(newSchedule);
    } catch (error) {
        //  console.error('❌ Error creating schedule:', error.message);
        // Error P2002 adalah unique constraint violation
        if (error.code === 'P2002' && error.meta?.target?.includes('uk_relay_schedule_time')) {
             return res.status(409).json({ error: 'Schedule conflict: A schedule for this relay at this time and day already exists.' });
        }
        res.status(500).json({ error: 'Failed to create schedule', details: error.message });
        //  console.error('❌ Error creating schedule:', error.message);
    }
};

const updateSchedule = async (req, res) => {
    const { id } = req.params;
    const { relayId, scheduleName, startTime, durationMinutes, daysOfWeek, isActive } = req.body; // relayId juga bisa diupdate
    try {
        if (typeof durationMinutes !== 'undefined' && (typeof durationMinutes !== 'number' || durationMinutes <= 0)) {
            return res.status(400).json({ error: 'durationMinutes must be a positive number.' });
        }
        if (startTime && !/^\d{2}:\d{2}:\d{2}$/.test(startTime)) {
            return res.status(400).json({ error: 'Invalid startTime format. Must be HH:MM:SS' });
        }
        if (daysOfWeek && !/^[01]{7}$/.test(daysOfWeek)) {
             return res.status(400).json({ error: 'Invalid daysOfWeek format. Must be 7 binary digits (e.g., "1111111").' });
        }
        let startTimeISO;
        if (startTime) {
            if (!/^\d{2}:\d{2}:\d{2}$/.test(startTime)) {
                return res.status(400).json({ error: 'Invalid startTime format. Must be HH:MM:SS' });
            }
            startTimeISO = timeToISO(startTime);
        }

        const updatedSchedule = await prisma.relaySchedule.update({
            where: { id: parseInt(id) },
            data: {
                relayId: relayId ? parseInt(relayId) : undefined, // Opsional update relayId
                scheduleName,
                startTime: startTimeISO,
                durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : undefined,
                daysOfWeek,
                isActive
            }
        });
        res.status(200).json(updatedSchedule);
    } catch (error) {
        //  console.error('❌ Error updating schedule:', error.message);
        if (error.code === 'P2002' && error.meta?.target?.includes('uk_relay_schedule_time')) {
             return res.status(409).json({ error: 'Schedule conflict: A schedule for this relay at this time and day already exists.' });
        }
        if (error.code === 'P2025') { // Not found
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        res.status(500).json({ error: 'Failed to update schedule', details: error.message });
    }
};

const deleteSchedule = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.relaySchedule.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send(); // No Content
    } catch (error) {
        //  console.error('❌ Error deleting schedule:', error.message);
        if (error.code === 'P2025') { // Not found
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        res.status(500).json({ error: 'Failed to delete schedule', details: error.message });
    }
};

module.exports = {
    getAllSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
};