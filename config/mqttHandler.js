const mqttClient = require('./mqtt');
const { upsertDevice } = require('../controllers/deviceController');
const { saveSensorReading } = require('../controllers/readingController');
const { updateRelayCurrentState } = require('../controllers/relayController');

const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX;

mqttClient.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        const { device_id, temperature, humidity, timestamp, relay_channel, state } = payload;

        if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/data`)) {
            if (!device_id || typeof temperature === 'undefined' || typeof humidity === 'undefined') {
                console.warn('⚠️ Invalid sensor payload received, missing required fields:', payload);
                return;
            }
            await upsertDevice(device_id);
            await saveSensorReading({ device_id, temperature, humidity, timestamp });
        }
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