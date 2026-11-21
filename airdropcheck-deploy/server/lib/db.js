import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqliteDb = null;

// Coba gunakan node:sqlite jika runtime mendukung (Node 22+)
try {
  const sqlite = await import('node:sqlite');
  if (sqlite && sqlite.DatabaseSync) {
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'airdropcheck.db'),
      path.resolve(__dirname, '../../data/airdropcheck.db'),
      path.resolve(__dirname, '../data/airdropcheck.db')
    ];
    const dbPath = possiblePaths.find(p => fs.existsSync(p));
    if (dbPath) {
      sqliteDb = new sqlite.DatabaseSync(dbPath);
    }
  }
} catch (e) {
  // node:sqlite tidak tersedia di Node < 22 atau serverless Vercel (abaikan secara aman)
}

// Fallback membaca data builders dari JSON jika SQLite tidak aktif
function getJsonBuilders() {
  try {
    const jsonPaths = [
      path.join(process.cwd(), 'data', 'builders.json'),
      path.resolve(__dirname, '../../data/builders.json'),
      path.resolve(__dirname, '../data/builders.json')
    ];
    const jsonPath = jsonPaths.find(p => fs.existsSync(p));
    if (jsonPath) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch {}
  return [];
}

/**
 * Cek apakah discordId terdaftar di tabel builders
 * @param {string} discordId 
 * @returns {boolean}
 */
export function isDiscordBuilder(discordId) {
  if (!discordId) return false;
  const cleanId = String(discordId).trim();

  if (sqliteDb) {
    try {
      const stmt = sqliteDb.prepare('SELECT id FROM builders WHERE discord_id = ? LIMIT 1');
      const res = stmt.get(cleanId);
      if (res) return true;
    } catch {}
  }

  // Fallback JSON
  const builders = getJsonBuilders();
  return builders.some(b => b.discord_id && String(b.discord_id).trim() === cleanId);
}

/**
 * Cek apakah wallet address terdaftar di tabel builders (huruf kecil)
 * @param {string} walletAddress 
 * @returns {boolean}
 */
export function isWalletBuilder(walletAddress) {
  if (!walletAddress) return false;
  const cleanWallet = String(walletAddress).trim().toLowerCase();

  if (sqliteDb) {
    try {
      const stmt = sqliteDb.prepare('SELECT id FROM builders WHERE lower(wallet) = ? LIMIT 1');
      const res = stmt.get(cleanWallet);
      if (res) return true;
    } catch {}
  }

  // Fallback JSON
  const builders = getJsonBuilders();
  return builders.some(b => b.wallet && String(b.wallet).trim().toLowerCase() === cleanWallet);
}

export function getDb() {
  return sqliteDb;
}
