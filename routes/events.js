// routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Validate and parse date helper
function parseISODate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

// Create event
// Body: { title, description, eventDate (ISO), reminderAt (optional ISO), notifyEmail, notifyPhone }
router.post('/', async (req, res) => {
  try {
    const { title, description, eventDate, reminderAt, notifyEmail, notifyPhone } = req.body;
    if (!title || !eventDate) return res.status(400).json({ error: 'title and eventDate are required' });

    const ed = parseISODate(eventDate);
    if (!ed) return res.status(400).json({ error: 'Invalid eventDate' });

    const ra = reminderAt ? parseISODate(reminderAt) : null;
    if (reminderAt && !ra) return res.status(400).json({ error: 'Invalid reminderAt' });

    const ev = new Event({
      title,
      description,
      eventDate: ed,
      reminderAt: ra,
      notifyEmail,
      notifyPhone
    });

    await ev.save();
    res.status(201).json(ev);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all (optional ?includeArchived=true)
router.get('/', async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = includeArchived ? {} : { archived: false };
    const events = await Event.find(filter).sort({ eventDate: 1 });
    res.json(events);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single
router.get('/:id', async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    res.json(ev);
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event (PUT) - fields allowed: title, description, eventDate, reminderAt, notifyEmail, notifyPhone
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.eventDate) {
      const d = parseISODate(updates.eventDate);
      if (!d) return res.status(400).json({ error: 'Invalid eventDate' });
      updates.eventDate = d;
    }
    if (updates.reminderAt) {
      const r = parseISODate(updates.reminderAt);
      if (!r) return res.status(400).json({ error: 'Invalid reminderAt' });
      updates.reminderAt = r;
    }

    const ev = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    // Reset notified flag if date/reminder changed
    if (req.body.eventDate || req.body.reminderAt) {
      ev.notified = false;
      await ev.save();
    }

    res.json(ev);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel event
router.post('/:id/cancel', async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    ev.canceled = true;
    await ev.save();
    res.json({ message: 'Event canceled', event: ev });
  } catch (err) {
    console.error('Cancel event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive event manually
router.post('/:id/archive', async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    ev.archived = true;
    await ev.save();
    res.json({ message: 'Event archived', event: ev });
  } catch (err) {
    console.error('Archive event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
