const { prisma } = require('../utils/prisma');
const mqttClient = require('../config/mqtt'); // Import klien MQTT yang sudah terhubung

// Fungsi internal untuk mempublikasikan perintah ke MQTT dan memperbarui desired_state
const publishRelayCommand = async (deviceId, relayChannel, state) => {
    try {
        const topic = `${process.env.MQTT_TOPIC_PREFIX}/commands/device/${deviceId}/relay/${relayChannel}`; // Topik untuk ESP32 menerima perintah
        const payload = JSON.stringify({ state: state });
        mqttClient.publish(topic, payload, { qos: 1 }, (error) => { // QoS 1 untuk jaminan pengiriman
            if (error) {
                console.error(`❌ MQTT Publish error for device ${deviceId}, relay ${relayChannel}:`, error);
            } else {
                console.log(`Published command to ${topic}: ${payload}`);
            }
        });

        // Update desired_state di DB segera setelah publish perintah
        await prisma.relay.updateMany({
            where: { deviceId: deviceId, relayChannel: relayChannel },
            data: { desiredState: state, lastUpdated: new Date() } // Update lastUpdated juga
        });

    } catch (error) {
        console.error(`❌ Error publishing relay command for device ${deviceId}, relay ${relayChannel}:`, error.message);
    }
};

// Fungsi internal untuk memperbarui current_state (dipanggil oleh MQTT handler saat ESP32 melaporkan status)
const updateRelayCurrentState = async (deviceId, relayChannel, state) => {
    try {
        // Coba cari relay. Jika tidak ada, mungkin perlu dibuat atau log warning
        const existingRelay = await prisma.relay.findUnique({
            where: {
                uk_device_relay_channel: {
                    deviceId: deviceId,
                    relayChannel: parseInt(relayChannel)
                }
            }
        });

        if (existingRelay) {
            await prisma.relay.update({
                where: { id: existingRelay.id },
                data: { currentState: state, lastUpdated: new Date() }
            });
            console.log(`Updated current_state for device ${deviceId}, relay ${relayChannel} to ${state}`);
        } else {
            console.warn(`⚠️ Relay ${deviceId}/${relayChannel} not found in DB for current_state update. Creating it.`);
            // Opsional: Buat entri relay baru jika tidak ada saat laporan status pertama
            await prisma.relay.create({
                data: {
                    deviceId: deviceId,
                    relayChannel: parseInt(relayChannel),
                    desiredState: state, // Set desired state sama dengan current state awal
                    currentState: state,
                    name: `Relay ${relayChannel} on ${deviceId}`
                }
            });
        }
    } catch (error) {
        console.error(`❌ Error updating current_state for device ${deviceId}, relay ${relayChannel}:`, error.message);
    }
};

// API: Mendapatkan semua relay atau relay spesifik (dengan detail device)
const getAllRelays = async (req, res) => {
    try {
        const relays = await prisma.relay.findMany({
            include: { device: true } // Sertakan detail perangkat yang mengontrol relay
        });
        res.status(200).json(relays);
    } catch (error) {
        console.error('❌ Error fetching relays:', error.message);
        res.status(500).json({ error: 'Failed to fetch relays', details: error.message });
    }
};

// API: Mendapatkan relay berdasarkan deviceId dan channel
const getRelayByDeviceIdAndChannel = async (req, res) => {
    const { deviceId, relayChannel } = req.params;
    try {
        const relay = await prisma.relay.findUnique({
            where: {
                uk_device_relay_channel: { // Menggunakan unique key yang sudah kita definisikan di schema.prisma
                    deviceId: deviceId,
                    relayChannel: parseInt(relayChannel)
                }
            },
            include: { device: true }
        });
        if (!relay) {
            return res.status(404).json({ message: 'Relay not found' });
        }
        res.status(200).json(relay);
    } catch (error) {
        console.error(`❌ Error fetching relay ${deviceId}/${relayChannel}:`, error.message);
        res.status(500).json({ error: `Failed to fetch relay ${deviceId}/${relayChannel}`, details: error.message });
    }
};

// API: Mengontrol status relay secara manual (dari frontend)
const controlRelay = async (req, res) => {
    const { deviceId, relayChannel } = req.params;
    const { state } = req.body; // state: true/false

    if (typeof state !== 'boolean') {
        return res.status(400).json({ error: 'Invalid state value. Must be true or false.' });
    }

    try {
        // Coba cari dan update relay
        const updatedRelay = await prisma.relay.update({
            where: {
                uk_device_relay_channel: {
                    deviceId: deviceId,
                    relayChannel: parseInt(relayChannel)
                }
            },
            data: {
                desiredState: state,
                lastUpdated: new Date()
            }
        });

        await publishRelayCommand(deviceId, parseInt(relayChannel), state);
        res.status(200).json({ message: 'Relay command sent and desired state updated.' });
    } catch (error) {
        // Jika relay tidak ditemukan, buat baru (opsional)
        if (error.code === 'P2025') { // Prisma error code for record not found
            try {
                // Pastikan perangkatnya ada di tabel devices
                await prisma.device.upsert({
                    where: { deviceId: deviceId },
                    update: { lastSeen: new Date(), isActive: true },
                    create: { deviceId: deviceId, lastSeen: new Date(), name: `Device ${deviceId}` }
                });

                const newRelay = await prisma.relay.create({
                    data: {
                        deviceId: deviceId,
                        relayChannel: parseInt(relayChannel),
                        desiredState: state,
                        currentState: false, // Default awal, akan diupdate oleh ESP32
                        name: `Relay ${relayChannel} on ${deviceId}`
                    }
                });
                await publishRelayCommand(deviceId, parseInt(relayChannel), state);
                return res.status(201).json({ message: 'Relay created and command sent.' });
            } catch (createError) {
                console.error('Error creating new relay after not found:', createError.message);
                return res.status(500).json({ error: 'Failed to create new relay and send command.', details: createError.message });
            }
        }
        console.error('Error in controlRelay:', error.message);
        res.status(500).json({ error: 'Failed to send relay command.', details: error.message });
    }
};

module.exports = {
    publishRelayCommand,
    updateRelayCurrentState,
    getAllRelays,
    getRelayByDeviceIdAndChannel,
    controlRelay
};