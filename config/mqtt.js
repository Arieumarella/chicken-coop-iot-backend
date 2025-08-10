const mqtt = require('mqtt');

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX;

const mqttOptions = {};
if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
    mqttOptions.username = process.env.MQTT_USERNAME;
    mqttOptions.password = process.env.MQTT_PASSWORD;
}

const client = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

client.on('connect', () => {
    //  console.log(`✅ Connected to MQTT Broker: ${MQTT_BROKER_URL}`);
    client.subscribe(`${MQTT_TOPIC_PREFIX}/#`, { qos: 1 }, (err) => {
        if (!err) {
            //  console.log(`✅ Subscribed to topic: ${MQTT_TOPIC_PREFIX}/#`);
        } else {
            //  console.error('❌ MQTT Subscription error:', err);
        }
    });
});

client.on('error', (err) => {
    //  console.error('❌ MQTT Client error:', err);
});

client.on('offline', () => {
    //  console.warn('⚠️ MQTT Client is offline');
});

client.on('reconnect', () => {
    //  console.log('🔄 MQTT Client attempting to reconnect...');
});

module.exports = client;