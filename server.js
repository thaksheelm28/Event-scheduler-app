// server.js (entry point) - NOT app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const connectDB = require('./config/db');
const eventsRouter = require('./routes/events');
const scheduler = require('./services/scheduler');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// mount routes (you can later import app into other tools if needed)
app.use('/api/events', eventsRouter);
app.get('/', (req, res) => res.json({ message: 'Event Scheduler (server.js) running' }));

(async () => {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in environment. See .env.example');
    process.exit(1);
  }

  // connect DB
  await connectDB(MONGODB_URI);

  // start crons
  scheduler.startReminderCron();
  scheduler.startArchiveCron();
  await scheduler.runImmediateArchiveCheck();

  // start HTTP server on localhost
  app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
  });
})();
