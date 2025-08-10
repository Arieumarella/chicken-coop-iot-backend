const mqttClient = require('./mqtt');
const { upsertDevice } = require('../controllers/deviceController');
const { saveSensorReading } = require('../controllers/readingController');
const { updateRelayCurrentState } = require('../controllers/relayController');
const { prisma } = require('../utils/prisma'); // Tambahkan ini
const ONLINE_THRESHOLD_MS = 60 * 1000;
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX;

mqttClient.on('message', async (topic, message) => {
    try {
        let payload = {};
        if (message && message.length > 0) {
            payload = JSON.parse(message.toString());
        }
        const { device_id, deviceId, temperature, humidity, timestamp, relay_channel, state } = payload;
        const id = device_id || deviceId;

        if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/data`)) {
            if (!id || typeof temperature === 'undefined' || typeof humidity === 'undefined') {
                //  console.warn('⚠️ Invalid sensor payload received, missing required fields:', payload);
                return;
            }
           
            
            await upsertDevice(id); // Fungsi ini harus update lastSeen di tabel Device
            await saveSensorReading({ device_id: id, temperature, humidity, timestamp });
        }
        else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/status/relay`)) {
            // Ignore payloads that contain a relays array (these are relay status responses, not commands)
            if (Array.isArray(payload.relays)) {
                // This is a relay status response, not a command to update relay state
                return;
            }
            if (!device_id || typeof relay_channel === 'undefined' || typeof state === 'undefined') {
                //  console.warn('⚠️ Invalid relay status payload received, missing required fields:', payload);
                return;
            }
            await updateRelayCurrentState(device_id, relay_channel, state);
        }
         // Handler untuk cek status device via MQTT
        else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/request/status/`)) {
            const deviceId = topic.split('/').pop();
            try {
                // Ambil data sensor terakhir untuk deviceId
                const device = await prisma.device.findUnique({
                    where: { deviceId }
                });

                const lastSeenTime = device?.lastSeen ? new Date(device.lastSeen).getTime() : null;
                const now = Date.now();
                const timeDifference = lastSeenTime ? now - lastSeenTime : null;
                const isOnline = lastSeenTime && (timeDifference < ONLINE_THRESHOLD_MS);

                const responsePayload = JSON.stringify({
                    deviceId,
                    isOnline,
                    lastSeen: device?.lastSeen ?? null
                });

                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/response/status/${deviceId}`, responsePayload, { qos: 1 });
                //  console.log(`✅ Status response sent for device ${deviceId}:`, responsePayload);
            } catch (error) {
                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/response/status/${deviceId}`, JSON.stringify({ error: error.message }), { qos: 1 });
                //  console.error(`❌ Error fetching status for device ${deviceId}:`, error.message);
            }
        }

       

        else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/request/data/`)) {
            const deviceId = topic.split('/').pop();
            try {

                 const lastSensor = await prisma.sensorReading.findFirst({
                    where: { deviceId },
                    orderBy: { recordedAt: 'desc' }
                });

                const responsePayload = JSON.stringify({
                    deviceId,
                    temperature: lastSensor?.temperature ?? null,
                    humidity: lastSensor?.humidity ?? null,
                    timestamp: lastSensor?.recordedAt ?? null
                });

                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/publish/data/${deviceId}`, responsePayload, { qos: 1 });
            
            } catch (error) {
                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/data/${deviceId}`, JSON.stringify({ error: error.message }), { qos: 1 });
                //  console.error(`❌ Error fetching sensor data for device ${deviceId}:`, error.message);
            }
        }

        

        // Handler untuk request relay status
        else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/request/relays/`)) {
            console.log(`masuk kedalam hendler status relay`)
            const deviceId = topic.split('/').pop();
            try {
                const relays = await prisma.relay.findMany({
                    where: { deviceId }
                });

                const responsePayload = JSON.stringify({
                    deviceId,
                    relays: relays
                });
                
                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/status/relay/${deviceId}`, responsePayload, { qos: 1 });
                 console.log(`✅ Relay status sent for device ${deviceId}:`);
            } catch (error) {
                mqttClient.publish(`${MQTT_TOPIC_PREFIX}/status/relay/${deviceId}`, JSON.stringify({ error: error.message }), { qos: 1 });
                 console.error(`❌ Error fetching relay status for device ${deviceId}:`, error.message);
            }
        }

        else {
            //  console.log(`Received unhandled message on topic: ${topic} with payload: ${message.toString()}`);
        }
    } catch (error) {
        //  console.error('❌ Error processing MQTT message:', error.message, 'Raw Message:', message.toString());
    }
});