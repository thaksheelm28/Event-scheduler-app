// services/scheduler.js
const cron = require('node-cron');
const Event = require('../models/Event');
const { sendEmail, sendSMS } = require('../utils/notify');

const REMINDER_MINUTES_BEFORE = Number(process.env.REMINDER_MINUTES_BEFORE || 10);
const ARCHIVE_AFTER_DAYS = Number(process.env.ARCHIVE_AFTER_DAYS || 0);

function computeReminderTime(ev) {
  if (ev.reminderAt) return new Date(ev.reminderAt);
  return new Date(ev.eventDate.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);
}

function startReminderCron() {
  // every minute
  const task = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // find candidate events: not canceled, not archived, not yet notified, eventDate >= some past guard
      const candidates = await Event.find({ canceled: false, archived: false, notified: false });

      for (const ev of candidates) {
        const reminderTime = computeReminderTime(ev);
        // Allow small grace window (<= now)
        if (reminderTime <= now) {
          const subject = `Reminder: ${ev.title}`;
          const text = `Reminder for event "${ev.title}" scheduled at ${ev.eventDate.toISOString()}.\n\n${ev.description || ''}`;
          try {
            if (ev.notifyEmail) {
              await sendEmail(ev.notifyEmail, subject, text, `<p>${text.replace(/\n/g, '<br>')}</p>`);
              console.log(`Email sent to ${ev.notifyEmail} for event ${ev._id}`);
            }
            if (ev.notifyPhone) {
              await sendSMS(ev.notifyPhone, `Reminder: ${ev.title} at ${ev.eventDate.toISOString()}`);
              console.log(`SMS sent to ${ev.notifyPhone} for event ${ev._id}`);
            }
            // mark notified true
            ev.notified = true;
            await ev.save();
          } catch (err) {
            console.error('Failed to send notifications for event', ev._id, err);
            // leave ev.notified = false so it will retry next minute
          }
        }
      }
    } catch (err) {
      console.error('Reminder cron error:', err);
    }
  }, { timezone: process.env.TZ || undefined });

  return task;
}

function startArchiveCron() {
  // run daily at 00:05
  const task = cron.schedule('5 0 * * *', async () => {
    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
      const res = await Event.updateMany({ archived: false, eventDate: { $lte: threshold } }, { $set: { archived: true } });
      if (res.modifiedCount) console.log(`Archived ${res.modifiedCount} events.`);
    } catch (err) {
      console.error('Archive cron error:', err);
    }
  }, { timezone: process.env.TZ || undefined });

  return task;
}

async function runImmediateArchiveCheck() {
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const res = await Event.updateMany({ archived: false, eventDate: { $lte: threshold } }, { $set: { archived: true } });
    if (res.modifiedCount) console.log(`Startup archive: archived ${res.modifiedCount} events.`);
  } catch (err) {
    console.error('Startup archive check error:', err);
  }
}

module.exports = { startReminderCron, startArchiveCron, runImmediateArchiveCheck };
