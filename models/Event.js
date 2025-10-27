// models/Event.js
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  reminderAt: { type: Date }, // optional explicit reminder time
  createdAt: { type: Date, default: Date.now },
  notified: { type: Boolean, default: false },
  canceled: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  notifyEmail: { type: String },
  notifyPhone: { type: String } // E.164 recommended
});

// Index for efficient queries on eventDate and archived
EventSchema.index({ eventDate: 1 });
EventSchema.index({ archived: 1 });

module.exports = mongoose.model('Event', EventSchema);
