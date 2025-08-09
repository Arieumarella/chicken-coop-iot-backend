require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors'); // Optional: For cross-origin requests from frontend
const { connectPrisma } = require('./utils/prisma'); // Prisma utility
const mqttClient = require('./config/mqtt'); // MQTT client configuration and listener
const { checkAndExecuteSchedules } = require('./services/scheduler'); // Scheduler for relay schedules
const cron = require('node-cron'); // Import node-cron here for scheduling in index.js
require('./config/mqttHandler');

// Set timezone to Jakarta/WIB
process.env.TZ = 'Asia/Jakarta';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Optional: Enable CORS for all routes (adjust as needed for security)

// --- IoT Specific Routes ---
const deviceRoutes = require('./routes/deviceRoutes');
const readingRoutes = require('./routes/readingRoutes');
const relayRoutes = require('./routes/relayRoutes');
const relayScheduleRoutes = require('./routes/relayScheduleRoutes');
const userRoutes = require('./routes/userLogin');

app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/relays', relayRoutes);
app.use('/api/schedules', relayScheduleRoutes);
app.use('/api', userRoutes);

// --- Your Existing Routes (Example) ---
// Example: If you have an existing 'homeController.js' and 'homeRoutes.js'
// const homeRoutes = require('./routes/homeRoutes');
// app.use('/', homeRoutes); // Or wherever your existing routes start

// Example: If you have other controllers/routes like 'artikelController.js'
// const artikelRoutes = require('./routes/artikelRoutes'); // Assume you have this
// app.use('/api/artikel', artikelRoutes);
// Add all your other routes here, matching your existing structure.

// Default route for API root
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the Chicken Coop IoT API!' });
});

// Start the application
async function startApplication() {
    try {
        // Connect to MySQL database via Prisma
        await connectPrisma();
        
        // MQTT client is initialized when imported by 'config/mqtt.js'
        // No explicit 'connect' call needed here for the client itself,
        // as `mqtt.connect` already handles it on import.

        // Initialize and run the scheduler for relay schedules
        checkAndExecuteSchedules(); // Run once on startup
        cron.schedule('* * * * *', () => { // Run every minute
            console.log('Running scheduled relay checks...');
            checkAndExecuteSchedules();
        });

        // Start the Express server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Fatal error during application startup:', error.message);
        process.exit(1); // Exit the process if startup fails
    }
}

startApplication();