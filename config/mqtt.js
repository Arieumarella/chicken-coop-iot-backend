const mqtt = require('mqtt');
const { upsertDevice } = require('../controllers/deviceController');
const { saveSensorReading } = require('../controllers/readingController');
const { updateRelayCurrentState } = require('../controllers/relayController');

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX; // e.g., kandang/ayam

const mqttOptions = {};
if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
    mqttOptions.username = process.env.MQTT_USERNAME;
    mqttOptions.password = process.env.MQTT_PASSWORD;
}

const client = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

client.on('connect', () => {
    console.log(`✅ Connected to MQTT Broker: ${MQTT_BROKER_URL}`);
    // Subscribe ke semua topik data sensor dan status relay dari perangkat
    // Menggunakan QoS 1 untuk jaminan pengiriman pesan, penting untuk data sensor/status
    client.subscribe(`${MQTT_TOPIC_PREFIX}/#`, { qos: 1 }, (err) => {
        if (!err) {
            console.log(`✅ Subscribed to topic: ${MQTT_TOPIC_PREFIX}/#`);
        } else {
            console.error('❌ MQTT Subscription error:', err);
        }
    });
});

client.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        const { device_id, temperature, humidity, timestamp, relay_channel, state } = payload;

        // --- Penanganan Data Sensor ---
        // Contoh topik: kandang/ayam/data (dari ESP32)
        if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/data`)) {
            if (!device_id || typeof temperature === 'undefined' || typeof humidity === 'undefined') {
                console.warn('⚠️ Invalid sensor payload received, missing required fields:', payload);
                return;
            }
            await upsertDevice(device_id); // Pastikan perangkat terdaftar/update last_seen
            await saveSensorReading({ device_id, temperature, humidity, timestamp });
        }
        // --- Penanganan Status Relay (dari ESP32 ke Backend) ---
        // Contoh topik: kandang/ayam/status/relay (dari ESP32 setelah mengeksekusi perintah)
        else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/status/relay`)) {
            if (!device_id || typeof relay_channel === 'undefined' || typeof state === 'undefined') {
                console.warn('⚠️ Invalid relay status payload received, missing required fields:', payload);
                return;
            }
            await updateRelayCurrentState(device_id, relay_channel, state);
        }
        else {
            console.log(`Received unhandled message on topic: ${topic} with payload: ${message.toString()}`);
        }

    } catch (error) {
        console.error('❌ Error processing MQTT message:', error.message, 'Raw Message:', message.toString());
    }
});

client.on('error', (err) => {
    console.error('❌ MQTT Client error:', err);
});

client.on('offline', () => {
    console.warn('⚠️ MQTT Client is offline');
});

client.on('reconnect', () => {
    console.log('🔄 MQTT Client attempting to reconnect...');
});

module.exports = client;