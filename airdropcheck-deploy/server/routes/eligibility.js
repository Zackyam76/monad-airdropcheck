import express from 'express';
import { checkNftEligibility } from '../lib/chain.js';
import { isDiscordBuilder, isWalletBuilder } from '../lib/db.js';

const router = express.Router();

/**
 * GET /api/session
 * Mengembalikan status sesi saat ini (wallet + discord)
 */
router.get('/session', (req, res) => {
  const walletAddress = req.session.walletAddress || null;
  const discord = req.session.discord || null;

  res.json({
    isLoggedIn: !!walletAddress,
    walletAddress,
    discord: discord
      ? { username: discord.username, discordId: discord.discordId }
      : null
  });
});

/**
 * GET /api/eligibility
 * Menilai kelayakan pada 3 track sesuai Bagian 5 PROTOTYPE_SPEC.md
 */
router.get('/eligibility', async (req, res) => {
  const walletAddress = req.session.walletAddress || null;
  const discord = req.session.discord || null;

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

  const tracks = [];

  // ── Track 1: Komunitas (Discord role) ──────────────────────────────────
  if (!discord) {
    tracks.push({
      id: 'community', name: 'Komunitas',
      status: 'needs_discord',
      reason: 'Hubungkan Discord untuk memeriksa track ini.'
    });
  } else {
    const userRoles = discord.roles || [];
    const hasEligibleRole = userRoles.some(r => eligibleRoleIds.includes(r));

    // Ambil pemetaan nama role tambahan (bisa dari ROLE_NAMES di .env atau dari session namedRoles)
    const envRoleNames = process.env.ROLE_NAMES || '';
    envRoleNames.split(',').forEach(item => {
      const [id, name] = item.split(':');
      if (id && name) roleNamesMap[id.trim()] = name.trim();
    });

    const namedRoles = discord.namedRoles || [];
    namedRoles.forEach(r => {
      if (r.id && r.name) roleNamesMap[r.id] = r.name;
    });

    // Format daftar role yang dimiliki pengguna
    const roleLabels = userRoles.map(rId => {
      const isEligible = eligibleRoleIds.includes(rId);
      const name = roleNamesMap[rId] || `Role #${rId.slice(0, 6)}...`;
      return isEligible ? `${name} (Eligible)` : name;
    });

    let communityReason = '';
    if (hasEligibleRole) {
      communityReason = `Role pengguna terdeteksi: [${roleLabels.join(', ')}] — Memenuhi syarat!`;
    } else if (userRoles.length > 0) {
      communityReason = `Role saat ini: [${roleLabels.join(', ')}] — Belum memiliki role yang disyaratkan di server uji`;
    } else {
      communityReason = 'Akun Discord belum memiliki role apapun di server uji';
    }

    tracks.push({
      id: 'community', name: 'Komunitas',
      status: hasEligibleRole ? 'eligible' : 'not_eligible',
      reason: communityReason,
      roles: userRoles,
      roleLabels: roleLabels
    });
  }

  // ── Track 2: Pengguna onchain (NFT balance) ─────────────────────────────
  if (!walletAddress) {
    tracks.push({
      id: 'onchain', name: 'Pengguna onchain',
      status: 'needs_wallet',
      reason: 'Hubungkan wallet untuk memeriksa track ini.'
    });
  } else {
    const nft = await checkNftEligibility(walletAddress);
    if (nft.error) {
      tracks.push({
        id: 'onchain', name: 'Pengguna onchain',
        status: 'error',
        reason: 'Jaringan uji tidak merespons. Coba lagi beberapa saat lagi.'
      });
    } else {
      tracks.push({
        id: 'onchain', name: 'Pengguna onchain',
        status: nft.eligible ? 'eligible' : 'not_eligible',
        reason: nft.reason
      });
    }
  }

  // ── Track 3: Builder (SQLite lookup) ────────────────────────────────────
  const discordMatch = discord?.discordId ? isDiscordBuilder(discord.discordId) : false;
  const walletMatch = walletAddress ? isWalletBuilder(walletAddress) : false;

  if (discordMatch || walletMatch) {
    const matched = [];
    if (walletMatch) matched.push('Wallet terdaftar di daftar builder');
    if (discordMatch) matched.push('Discord ID terdaftar di daftar builder');
    tracks.push({
      id: 'builder', name: 'Builder',
      status: 'eligible',
      reason: matched.join(' & '),
      walletMatch,
      discordMatch
    });
  } else if (!walletAddress && !discord) {
    tracks.push({
      id: 'builder', name: 'Builder',
      status: 'needs_wallet',
      reason: 'Hubungkan Discord atau wallet untuk memeriksa.'
    });
  } else if (!walletAddress) {
    tracks.push({
      id: 'builder', name: 'Builder',
      status: 'needs_wallet',
      reason: 'Hubungkan wallet untuk memeriksa track ini.'
    });
  } else if (!discord) {
    tracks.push({
      id: 'builder', name: 'Builder',
      status: 'needs_discord',
      reason: 'Hubungkan Discord untuk memeriksa track ini.'
    });
  } else {
    tracks.push({
      id: 'builder', name: 'Builder',
      status: 'not_eligible',
      reason: 'Tidak terdaftar dalam daftar builder'
    });
  }

  const eligibleCount = tracks.filter(t => t.status === 'eligible').length;
  res.json({ tracks, eligibleCount });
});

/**
 * POST /api/reset
 * Menghapus seluruh sesi — Langkah 6 alur pengguna
 */
router.post('/reset', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Gagal mereset sesi' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

export default router;
