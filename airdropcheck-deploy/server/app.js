import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import walletRouter from './routes/wallet.js';
import eligibilityRouter from './routes/eligibility.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Vercel, Cloudflare, nginx)
app.set('trust proxy', 1);

// Keamanan: Helmet dengan Content Security Policy yang fleksibel & aman
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  })
);

// Pembatasan laju permintaan (rate limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, silakan coba lagi nanti.' }
});

app.use('/auth', limiter);
app.use('/api', limiter);

// Parsing body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi Sesi
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'airdropcheck-academic-secret-key-default',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Lokasi folder public (mendukung lokal maupun Vercel lambda)
const publicDir = [
  path.join(process.cwd(), 'public'),
  path.resolve(__dirname, '../public')
].find(p => fs.existsSync(p)) || path.resolve(__dirname, '../public');

app.use(express.static(publicDir));

// Route eksplisit untuk root halaman utama
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('AirdropCheck Lab is active.');
});

// Mount router API
app.use('/auth', authRouter);
app.use('/api', walletRouter);
app.use('/api', eligibilityRouter);

// Fallback jika route tidak ditemukan
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

export default app;
