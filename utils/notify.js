// utils/notify.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const twilioLib = require('twilio');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';

let mailer = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
} else {
  console.warn('Nodemailer not configured. Email notifications disabled.');
}

let twilio = null;
console.log("Twilio SID:", process.env.TWILIO_ACCOUNT_SID);
console.log("Twilio Token:", process.env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET");
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilio = twilioLib(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio not configured. SMS notifications disabled.');
}

async function sendEmail(to, subject, text, html) {
  if (!mailer) {
    console.log('Email skipped (mailer not configured).', { to, subject });
    return false;
  }
  const info = await mailer.sendMail({ from: EMAIL_FROM, to, subject, text, html });
  return info;
}

async function sendSMS(to, body) {
  if (!twilio || !process.env.TWILIO_FROM) {
    console.log('SMS skipped (twilio not configured).', { to, body });
    return false;
  }
  const msg = await twilio.messages.create({ from: process.env.TWILIO_FROM, to, body });
  return msg;
}

module.exports = { sendEmail, sendSMS };
