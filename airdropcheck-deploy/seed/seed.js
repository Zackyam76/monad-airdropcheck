import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../server/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runSeed() {
  const db = getDb();

  const customCsvPath = path.join(__dirname, 'builders.csv');
  const sampleCsvPath = path.join(__dirname, 'builders.sample.csv');
  const csvFileToUse = fs.existsSync(customCsvPath) ? customCsvPath : sampleCsvPath;

  console.log(`[Seed] Membaca data builder dari: ${csvFileToUse}`);

  if (!fs.existsSync(csvFileToUse)) {
    console.error(`[Seed] File CSV tidak ditemukan di ${csvFileToUse}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvFileToUse, 'utf-8');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Bersihkan tabel sebelum memasukkan data baru
  db.exec('DELETE FROM builders');
  db.exec("DELETE FROM sqlite_sequence WHERE name='builders'");

  const insertStmt = db.prepare(`
    INSERT INTO builders (discord_id, wallet, label)
    VALUES (?, ?, ?)
  `);

  let count = 0;
  // Lewati header (baris index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    const discordId = parts[0]?.trim() || null;
    const wallet = parts[1]?.trim() ? parts[1].trim().toLowerCase() : null;
    const label = parts.slice(2).join(',').trim() || null;

    if (discordId || wallet) {
      insertStmt.run(discordId, wallet, label);
      count++;
    }
  }

  console.log(`[Seed] Berhasil memasukkan ${count} data builder ke database.`);
}

runSeed();
