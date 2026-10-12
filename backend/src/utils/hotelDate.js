const config = require('../config/env');

/**
 * ============================================================================
 * HOTEL KI TAREEKH (timezone-safe "aaj" aur din ki hadein)
 * ============================================================================
 *
 * Booking ki tareekhein (checkInDate / checkOutDate) browser se "YYYY-MM-DD" aati
 * hain aur UTC midnight par save hoti hain. Pehle "aaj" server ki apni local
 * midnight (setHours(0,0,0,0)) se nikalta tha — Vercel (UTC) aur Pakistan wale hub
 * par alag nateeje, aur negative timezone wale server par arrivals ek din khisak
 * jate. Ab "aaj" hamesha hotel ke timezone (HOTEL_TIMEZONE) se:
 *
 *  - date-only fields ke liye: hotel ki aaj ki tareekh, UTC midnight par
 *  - asal waqt (payment createdAt) ke liye: hotel ki local midnight ka instant
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const timeZone = () => config.hotelTimeZone;

/** Hotel timezone me "YYYY-MM-DD" */
const hotelDateString = (at = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);

/** Hotel ki aaj ki tareekh, booking fields ki tarah UTC midnight par */
const startOfHotelToday = (at = new Date()) => new Date(`${hotelDateString(at)}T00:00:00.000Z`);

/** Date-only value (string ya Date) ko uske UTC din ki shuruat par lao */
const toUtcDay = (value) => {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * checkInDate / checkOutDate jaise date-only fields ke liye ek din ki window.
 * @param {string|Date} [date] - na ho to hotel ka aaj
 * @returns {{ start: Date, end: Date }} end = us din ka aakhri millisecond
 */
const dateOnlyDayWindow = (date) => {
  const start = date ? toUtcDay(date) : startOfHotelToday();
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
};

/** Is instant par hotel timezone UTC se kitna aage hai (ms) */
const zoneOffsetMs = (at) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone(),
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
};

/** "YYYY-MM-DD" (ya Date) ke hotel-local midnight ka asal instant */
const hotelMidnightInstant = (date) => {
  const ymd = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : hotelDateString(new Date(date));
  const utcMidnight = new Date(`${ymd}T00:00:00.000Z`);
  return new Date(utcMidnight.getTime() - zoneOffsetMs(utcMidnight));
};

module.exports = {
  DAY_MS,
  hotelDateString,
  startOfHotelToday,
  toUtcDay,
  dateOnlyDayWindow,
  hotelMidnightInstant,
};
