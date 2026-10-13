const { startOfHotelToday } = require('../../src/utils/hotelDate');

/**
 * Tests ke liye aage ki tareekh "YYYY-MM-DD" (hotel ke aaj se `days` din baad).
 * Pehle tests me 2026-11-01 jaisi fixed tareekhein thin jo guzarte hi tests tod
 * deti (booking past date reject karti hai). Ab har tareekh aaj se relative hai.
 *
 * @param {number} days
 * @returns {string}
 */
const futureDay = (days) =>
  new Date(startOfHotelToday().getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

module.exports = { futureDay };
