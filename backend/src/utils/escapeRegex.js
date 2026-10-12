/**
 * User ke search text ko regex me "jaisa hai waisa" dhoondhne ke liye escape karta hai (H7).
 * Is ke baghair `.*`, `(a+)+` jaisa text regex ban kar ghalat nateeje ya server ko
 * slow (ReDoS) kar sakta tha, aur "BK-1(2)" jaisi reference kabhi match nahi hoti.
 *
 * @param {string} value - user input
 * @param {number} [maxLength=100] - lambi input kaat do (search ke liye kaafi)
 * @returns {string}
 */
const escapeRegex = (value, maxLength = 100) =>
  String(value ?? '')
    .trim()
    .slice(0, maxLength)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
