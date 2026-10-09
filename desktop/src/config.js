const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

/**
 * ============================================================================
 * DESKTOP CONFIG STORE (Hub Connection Settings)
 * ============================================================================
 *
 * Hub ka address har PC par `userData/config.json` me save hota hai, taake app
 * har dafa khulne par usi Hub se connect ho.
 */

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');

/**
 * Normalizes user input into a Hub base URL like `http://192.168.1.10:5000`.
 * Accepts values with or without scheme, trailing slash, or `/api/v1` suffix.
 *
 * @param {string} input
 * @returns {string} Normalized Hub URL
 * @throws {Error} When the input is not a valid http(s) URL
 */
const normalizeHubUrl = (input) => {
  let value = String(input || '').trim();
  if (!value) {
    throw new Error('Hub address is required.');
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Hub address must start with http:// or https://');
  }

  const pathname = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  return `${url.protocol}//${url.host}${pathname}`;
};

/**
 * @returns {{ hubUrl: string | null }}
 */
const loadConfig = () => {
  try {
    const raw = fs.readFileSync(CONFIG_FILE(), 'utf8');
    const parsed = JSON.parse(raw);
    return { hubUrl: parsed.hubUrl ? normalizeHubUrl(parsed.hubUrl) : null };
  } catch {
    return { hubUrl: null };
  }
};

/**
 * @param {{ hubUrl: string }} config
 */
const saveConfig = (config) => {
  const file = CONFIG_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ hubUrl: normalizeHubUrl(config.hubUrl) }, null, 2));
};

module.exports = {
  normalizeHubUrl,
  loadConfig,
  saveConfig,
};
