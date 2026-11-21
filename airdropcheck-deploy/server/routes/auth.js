import express from 'express';
import crypto from 'crypto';
import { getDiscordAuthUrl, exchangeCodeAndFetchRoles } from '../lib/discord.js';
import { isDiscordBuilder } from '../lib/db.js';

const router = express.Router();

/**
 * Halaman UI Simulasi Otorisasi Discord
 * Ditampilkan jika DISCORD_CLIENT_ID belum diisi atau bernilai 'mock_discord_client_id'.
 * Memungkinkan penguji menguji skenario UJ-01 s/d UJ-04 & UJ-09 tanpa perlu bot Discord asli.
 */
function renderMockAuthPage() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulasi Otorisasi Discord — AirdropCheck Lab</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #1e1f22;
      color: #dbdee1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    .auth-card {
      background-color: #2b2d31;
      width: 100%;
      max-width: 460px;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      padding: 28px;
    }
    .app-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .discord-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #5865F2;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }
    .app-title {
      color: #f2f3f5;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .app-desc {
      color: #949ba4;
      font-size: 13px;
      line-height: 1.4;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      color: #b5bac1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 10px 0;
    }
    .persona-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #313338;
      border: 2px solid transparent;
      padding: 12px 14px;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .persona-option:hover {
      background: #383a40;
    }
    .persona-option input[type="radio"] {
      margin-top: 3px;
      accent-color: #5865F2;
    }
    .persona-info {
      flex: 1;
    }
    .persona-name {
      font-size: 14px;
      font-weight: 600;
      color: #f2f3f5;
    }
    .persona-meta {
      font-size: 12px;
      color: #949ba4;
      margin-top: 2px;
    }
    .tag-eligible {
      color: #57F287;
      font-weight: 600;
    }
    .tag-not-eligible {
      color: #ED4245;
      font-weight: 600;
    }
    .custom-input {
      width: 100%;
      background: #1e1f22;
      border: 1px solid #3f4147;
      border-radius: 6px;
      color: #f2f3f5;
      font-size: 13px;
      padding: 8px 12px;
      margin-top: 8px;
      outline: none;
    }
    .custom-input:focus {
      border-color: #5865F2;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      text-align: center;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-cancel {
      background: #4e5058;
      color: #fff;
    }
    .btn-cancel:hover {
      background: #6d6f78;
    }
    .btn-authorize {
      background: #5865F2;
      color: #fff;
    }
    .btn-authorize:hover {
      background: #4752c4;
    }
    .footer-note {
      text-align: center;
      margin-top: 16px;
      font-size: 11px;
      color: #80848e;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="app-header">
      <div class="discord-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        SIMULASI AKADEMIK
      </div>
      <h2 class="app-title">Otorisasi Akun Discord</h2>
      <p class="app-desc"><strong>AirdropCheck Lab</strong> meminta izin membaca profil dan status role Discord Anda.</p>
    </div>

    <form action="/auth/discord/mock-submit" method="POST">
      <div class="section-label">Pilih Akun Uji Skenario:</div>

      <label class="persona-option">
        <input type="radio" name="persona" value="community_eligible" checked>
        <div class="persona-info">
          <div class="persona-name">@nads_community <span class="tag-eligible">✓ Eligible</span></div>
          <div class="persona-meta">Memegang role komunitas 'Localnads' (UJ-03)</div>
        </div>
      </label>

      <label class="persona-option">
        <input type="radio" name="persona" value="community_not_eligible">
        <div class="persona-info">
          <div class="persona-name">@newbie_nad <span class="tag-not-eligible">✗ Not Eligible</span></div>
          <div class="persona-meta">Tidak memiliki role yang memenuhi syarat (UJ-04)</div>
        </div>
      </label>

      <label class="persona-option">
        <input type="radio" name="persona" value="builder_eligible">
        <div class="persona-info">
          <div class="persona-name">@core_builder <span class="tag-eligible">✓ Builder Eligible</span></div>
          <div class="persona-meta">ID terdaftar di SQLite tabel builders (UJ-09)</div>
        </div>
      </label>

      <label class="persona-option">
        <input type="radio" name="persona" value="custom">
        <div class="persona-info">
          <div class="persona-name">Kustom Sendiri</div>
          <div class="persona-meta">Tentukan username & status role secara bebas</div>
          <input type="text" name="custom_username" class="custom-input" placeholder="Contoh: @nama_kamu">
          <label style="display:flex; align-items:center; gap:6px; margin-top:8px; font-size:12px; color:#dbdee1;">
            <input type="checkbox" name="custom_has_role" value="true" checked> Berikan Role Komunitas 'Localnads'
          </label>
        </div>
      </label>

      <div class="action-buttons">
        <a href="/?error=discord_cancelled" class="btn btn-cancel">Batal (Tolak)</a>
        <button type="submit" class="btn btn-authorize">Authorize</button>
      </div>
    </form>

    <div class="footer-note">
      Sesuai PROTOTYPE_SPEC.md Bagian 11 (Black Box Testing UJ-01 s/d UJ-04 & UJ-09).
    </div>
  </div>
</body>
</html>`;
}

/**
 * GET /auth/discord
 * Memulai alur Discord OAuth2
 * Jika kredensial belum ada / default mock, otomatis membuka halaman simulasi otorisasi
 */
router.get('/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;

  // Jika masih mock_discord_client_id atau belum diisi, buka dialog simulasi
  if (!clientId || clientId === 'mock_discord_client_id' || clientId.trim() === '') {
    return res.send(renderMockAuthPage());
  }

  // Jika kredensial asli tersedia, redirect ke Discord.com resmi
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const authUrl = getDiscordAuthUrl(state);
  res.redirect(authUrl);
});

/**
 * POST /auth/discord/mock-submit
 * Memproses otorisasi dari dialog simulasi Discord
 */
router.post('/discord/mock-submit', (req, res) => {
  const { persona, custom_username, custom_has_role } = req.body;

  let discordId = '999888777666555444';
  let username = 'nads_community';
  let roles = ['111222333']; // ID role eligible default (Localnads)

  if (persona === 'community_not_eligible') {
    discordId = '888777666555444333';
    username = 'newbie_nad';
    roles = [];
  } else if (persona === 'builder_eligible') {
    discordId = '123456789012345678'; // ID yang ada di seed/builders.sample.csv
    username = 'core_builder';
    roles = [];
  } else if (persona === 'custom') {
    discordId = '777666555444333222';
    username = (custom_username || 'kustom_nad').replace('@', '').trim();
    roles = custom_has_role === 'true' ? ['111222333'] : [];
  }

  const eligibleRoleEnv = process.env.ROLE_IDS_ELIGIBLE || '111222333';
  const eligibleRoleIds = eligibleRoleEnv
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  const hasRole = roles.some(r => eligibleRoleIds.includes(r));
  const isBuilder = isDiscordBuilder(discordId);
  const isEligible = hasRole || isBuilder;

  let reason = 'Tidak memiliki role yang memenuhi syarat di server uji';
  if (hasRole) {
    reason = 'Memiliki role komunitas yang memenuhi syarat (Localnads)';
  } else if (isBuilder) {
    reason = 'Discord ID terdaftar dalam daftar builder';
  }

  let namedRoles = roles.map(rId => ({
    id: rId,
    name: rId === '111222333' ? 'Localnads' : `Role #${rId.slice(0, 6)}...`
  }));

  req.session.discord = {
    discordId,
    username,
    roles,
    namedRoles,
    isEligible,
    reason
  };

  res.redirect('/?discord=connected');
});

/**
 * GET /auth/discord/callback
 * Menerima callback dari Discord OAuth2 resmi
 */
router.get('/discord/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Skenario UJ-02: Pengguna menolak izin di halaman Discord
  if (error) {
    console.warn('[Discord Auth] Izin ditolak pengguna:', error, error_description);
    return res.redirect('/?error=discord_cancelled');
  }

  // Validasi parameter state untuk mencegah CSRF
  if (!state || state !== req.session.oauthState) {
    console.error('[Discord Auth] State parameter mismatch');
    return res.redirect('/?error=invalid_state');
  }

  delete req.session.oauthState;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const { discordId, username, roles } = await exchangeCodeAndFetchRoles(code);

    const rawEligibleEnv = (process.env.ROLE_IDS_ELIGIBLE || '')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    const eligibleRoleIds = [];
    const roleNamesMap = {};

    rawEligibleEnv.forEach(item => {
      if (item.includes(':')) {
        const [id, name] = item.split(':');
        if (id) {
          const cleanId = id.trim();
          eligibleRoleIds.push(cleanId);
          if (name) roleNamesMap[cleanId] = name.trim();
        }
      } else {
        eligibleRoleIds.push(item);
      }
    });

    // Cek apakah memiliki role eligible atau terdaftar di builder
    const hasRole = roles.some(r => eligibleRoleIds.includes(r));
    const isBuilder = isDiscordBuilder(discordId);
    const isEligible = hasRole || isBuilder;

    let reason = 'Tidak memiliki role yang memenuhi syarat di server uji';
    if (hasRole) {
      reason = 'Memiliki role komunitas yang memenuhi syarat';
    } else if (isBuilder) {
      reason = 'Discord ID terdaftar dalam daftar builder';
    }

    let namedRoles = roles.map(rId => ({
      id: rId,
      name: roleNamesMap[rId] || (rId === '111222333' ? 'Localnads' : `Role #${rId.slice(0, 6)}...`)
    }));

    req.session.discord = {
      discordId,
      username,
      roles,
      namedRoles,
      isEligible,
      reason
    };

    res.redirect('/?discord=connected');
  } catch (err) {
    console.error('[Discord Auth Error]:', err.message || err);
    res.redirect(`/?error=discord_auth_failed&msg=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /auth/discord/disconnect
 * Memutuskan sambungan Discord
 */
router.post('/discord/disconnect', (req, res) => {
  req.session.discord = null;
  res.json({ success: true });
});

export default router;
