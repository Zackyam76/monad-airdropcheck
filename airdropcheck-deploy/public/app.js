// ==========================================================================
// AirdropCheck Lab - Frontend Logic
// Alur: Connect wallet (sign) → Connect Discord (OAuth2) → Periksa kelayakan
// ==========================================================================

const state = {
  walletAddress: null,
  discord: null
};

// DOM Elements
const screenSignIn = document.getElementById('screenSignIn');
const screenDashboard = document.getElementById('screenDashboard');
const btnHeroSignIn = document.getElementById('btnHeroSignIn');
const signInBtnText = document.getElementById('signInBtnText');

const claimWalletAddressText = document.getElementById('claimWalletAddressText');
const btnDisconnectWallet = document.getElementById('btnDisconnectWallet');

const evmWalletSub = document.getElementById('evmWalletSub');
const btnEvmDisconnect = document.getElementById('btnEvmDisconnect');
const evmBadge = document.getElementById('evmBadge');

const discordNameText = document.getElementById('discordNameText');
const discordSubText = document.getElementById('discordSubText');
const btnConnectDiscord = document.getElementById('btnConnectDiscord');
const btnDisconnectDiscord = document.getElementById('btnDisconnectDiscord');
const discordBadge = document.getElementById('discordBadge');

const btnCheckEligibility = document.getElementById('btnCheckEligibility');
const topStagePill = document.getElementById('topStagePill');
const neonRingArc = document.getElementById('neonRingArc');
const stageClaimStatus = document.getElementById('stageClaimStatus');
const stageSubNote = document.getElementById('stageSubNote');
const btnSharePortal = document.getElementById('btnSharePortal');

const badgeCommunity = document.getElementById('badgeCommunity');
const badgeOnchain = document.getElementById('badgeOnchain');
const badgeBuilder = document.getElementById('badgeBuilder');
const reasonCommunity = document.getElementById('reasonCommunity');
const reasonOnchain = document.getElementById('reasonOnchain');
const reasonBuilder = document.getElementById('reasonBuilder');

const toastContainer = document.getElementById('toastContainer');

// Helper: Format wallet address (0x1234...5678)
function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Toast Notifikasi
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showScreen(screen) {
  if (screen === 'signin') {
    screenSignIn?.classList.remove('hidden');
    screenDashboard?.classList.add('hidden');
  } else {
    screenSignIn?.classList.add('hidden');
    screenDashboard?.classList.remove('hidden');
  }
}

// 1. Memeriksa status sesi saat halaman dimuat
async function loadSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();

    if (data.isLoggedIn && data.walletAddress) {
      state.walletAddress = data.walletAddress;
      state.discord = data.discord;
      showScreen('dashboard');
      updateWalletUI();
      updateDiscordUI();
      resetCheckUI();
    } else {
      showScreen('signin');
    }
  } catch (err) {
    console.error('Gagal memuat sesi:', err);
    showScreen('signin');
  }
}

// Reset UI hasil pemeriksaan ke kondisi awal (belum diperiksa)
function resetCheckUI() {
  if (topStagePill) {
    topStagePill.className = 'badge-status badge-neutral';
    topStagePill.textContent = 'BELUM DIPERIKSA';
  }
  if (stageClaimStatus) {
    stageClaimStatus.textContent = 'Siap memeriksa';
    stageClaimStatus.style.color = '';
  }
  if (stageSubNote) {
    stageSubNote.textContent = 'Hubungkan akun di sebelah kiri, lalu tekan Periksa kelayakan untuk melihat hasilnya.';
  }
  btnSharePortal?.classList.add('hidden');

  // Reset Track 1 Komunitas
  if (badgeCommunity) {
    badgeCommunity.className = 'badge-status badge-neutral';
    badgeCommunity.textContent = state.discord ? 'SIAP DIPERIKSA' : 'BUTUH DISCORD';
  }
  if (reasonCommunity) {
    reasonCommunity.textContent = state.discord
      ? 'Discord terhubung. Tekan "Periksa kelayakan" untuk melihat status.'
      : 'Hubungkan Discord untuk memeriksa track ini.';
  }
  const itemCommunity = badgeCommunity?.closest('.track-item');
  if (itemCommunity) itemCommunity.className = 'track-item';

  // Reset Track 2 Pengguna Onchain
  if (badgeOnchain) {
    badgeOnchain.className = 'badge-status badge-neutral';
    badgeOnchain.textContent = state.walletAddress ? 'SIAP DIPERIKSA' : 'BUTUH WALLET';
  }
  if (reasonOnchain) {
    reasonOnchain.textContent = state.walletAddress
      ? 'Wallet terhubung. Tekan "Periksa kelayakan" untuk memeriksa saldo NFT.'
      : 'Hubungkan wallet untuk memeriksa track ini.';
  }
  const itemOnchain = badgeOnchain?.closest('.track-item');
  if (itemOnchain) itemOnchain.className = 'track-item';

  // Reset Track 3 Builder
  if (badgeBuilder) {
    badgeBuilder.className = 'badge-status badge-neutral';
    badgeBuilder.textContent = 'BELUM DIPERIKSA';
  }
  if (reasonBuilder) {
    reasonBuilder.textContent = 'Tekan "Periksa kelayakan" untuk memeriksa direktori builder.';
  }
  const itemBuilder = badgeBuilder?.closest('.track-item');
  if (itemBuilder) itemBuilder.className = 'track-item';
}

// Update UI Wallet
function updateWalletUI() {
  if (!state.walletAddress) return;
  const short = formatAddress(state.walletAddress);
  if (claimWalletAddressText) claimWalletAddressText.textContent = `Wallet: ${short}`;
  if (evmWalletSub) evmWalletSub.textContent = short;
  if (evmBadge) {
    evmBadge.className = 'badge-status badge-neutral';
    evmBadge.textContent = 'TERHUBUNG';
  }
}

// Update UI Discord
function updateDiscordUI() {
  if (state.discord) {
    if (discordNameText) discordNameText.textContent = `@${state.discord.username}`;
    discordSubText?.classList.add('hidden');
    btnConnectDiscord?.classList.add('hidden');
    btnDisconnectDiscord?.classList.remove('hidden');
    if (discordBadge) {
      discordBadge.className = 'badge-status badge-neutral';
      discordBadge.textContent = 'TERHUBUNG';
    }
  } else {
    if (discordNameText) discordNameText.textContent = 'Discord';
    discordSubText?.classList.remove('hidden');
    if (discordSubText) discordSubText.textContent = 'Belum terhubung';
    btnConnectDiscord?.classList.remove('hidden');
    btnDisconnectDiscord?.classList.add('hidden');
    if (discordBadge) {
      discordBadge.className = 'badge-status badge-neutral';
      discordBadge.textContent = 'BELUM TERHUBUNG';
    }
  }
}

// 2. Alur "Sign in" dengan Wallet (EIP-191 personal_sign)
async function handleWalletSignIn() {
  if (!window.ethereum) {
    showToast('Ekstensi wallet browser (Rabby / MetaMask) tidak ditemukan. Silakan pasang terlebih dahulu.', 'error');
    return;
  }

  try {
    if (signInBtnText) signInBtnText.textContent = 'Menghubungkan...';
    if (btnHeroSignIn) btnHeroSignIn.disabled = true;

    // A. Minta akses wallet
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      showToast('Koneksi wallet dibatalkan oleh pengguna.', 'error');
      return;
    }
    const selectedAddress = accounts[0];

    // B. Minta nonce sekali pakai dari server
    const nonceRes = await fetch('/api/nonce');
    if (!nonceRes.ok) throw new Error('Gagal mendapatkan nonce');
    const { message } = await nonceRes.json();

    showToast('Tanda tangani pesan untuk membuat sesi akun. Tidak ada biaya gas.', 'info');

    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, selectedAddress]
      });
    } catch (signErr) {
      console.warn('Sign error:', signErr);
      showToast('Tanda tangan dibatalkan. Hubungkan wallet lagi untuk melanjutkan.', 'error');
      return;
    }

    // C. Verifikasi tanda tangan di backend
    const verifyRes = await fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: selectedAddress, signature })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      showToast(verifyData.error || 'Verifikasi tanda tangan gagal.', 'error');
      return;
    }

    state.walletAddress = verifyData.address;
    showScreen('dashboard');
    updateWalletUI();
    updateDiscordUI();
    resetCheckUI();
    showToast(`Berhasil terhubung: ${formatAddress(state.walletAddress)}`, 'success');
  } catch (err) {
    console.error('Sign in error:', err);
    showToast('Terjadi kesalahan saat masuk dengan wallet.', 'error');
  } finally {
    if (signInBtnText) signInBtnText.textContent = 'Hubungkan wallet';
    if (btnHeroSignIn) btnHeroSignIn.disabled = false;
  }
}

// 3. Periksa Kelayakan (3 Track)
async function checkEligibility() {
  if (btnCheckEligibility) {
    btnCheckEligibility.disabled = true;
    btnCheckEligibility.textContent = 'Memeriksa...';
  }

  // Efek putaran cincin saat memeriksa
  if (neonRingArc) {
    neonRingArc.classList.remove('spinning');
    void neonRingArc.offsetWidth;
    neonRingArc.classList.add('spinning');
  }

  try {
    const res = await fetch('/api/eligibility');
    if (!res.ok) throw new Error('Gagal mengambil data kelayakan');
    const data = await res.json();

    renderTrackResults(data.tracks);
    triggerRingReveal(data.eligibleCount);
  } catch (err) {
    console.error('Eligibility check error:', err);
    showToast('Jaringan uji tidak merespons. Coba lagi beberapa saat lagi.', 'error');
  } finally {
    if (btnCheckEligibility) {
      btnCheckEligibility.disabled = false;
      btnCheckEligibility.textContent = 'Periksa kelayakan';
    }
  }
}

// 4. Render 3 Track Hasil
const BADGE_MAP = {
  eligible:      { cls: 'badge-eligible',     text: '✓ ELIGIBLE' },
  not_eligible:  { cls: 'badge-not-eligible', text: 'NOT ELIGIBLE' },
  needs_discord: { cls: 'badge-action',       text: 'BUTUH DISCORD' },
  needs_wallet:  { cls: 'badge-action',       text: 'BUTUH WALLET' },
  error:         { cls: 'badge-error',        text: 'KESALAHAN RPC' }
};

function renderTrackResults(tracks) {
  if (!tracks) return;

  const map = {
    community: [badgeCommunity, reasonCommunity],
    onchain:   [badgeOnchain, reasonOnchain],
    builder:   [badgeBuilder, reasonBuilder]
  };

  tracks.forEach(track => {
    const [badge, reason] = map[track.id] || [];
    if (!badge) return;

    const b = BADGE_MAP[track.status] || { cls: 'badge-neutral', text: track.status };
    badge.className = `badge-status ${b.cls}`;
    badge.textContent = b.text;
    if (reason) reason.textContent = track.reason;

    const item = badge.closest('.track-item');
    if (item) {
      item.className = `track-item status-${track.status}`;
    }
  });

  // Update EVM card badge dari track onchain dan builder
  const onchainTrack = tracks.find(t => t.id === 'onchain');
  const communityTrack = tracks.find(t => t.id === 'community');
  const builderTrack = tracks.find(t => t.id === 'builder');

  const walletEligible = (onchainTrack && onchainTrack.status === 'eligible') || !!builderTrack?.walletMatch;
  if (evmBadge) {
    if (walletEligible) {
      evmBadge.className = 'badge-status badge-eligible';
      evmBadge.textContent = '✓ ELIGIBLE';
    } else {
      evmBadge.className = 'badge-status badge-not-eligible';
      evmBadge.textContent = 'NOT ELIGIBLE';
    }
  }

  // Update Discord card badge dari track community dan builder
  const discordEligible = (communityTrack && communityTrack.status === 'eligible') || !!builderTrack?.discordMatch;
  if (state.discord && discordBadge) {
    if (discordEligible) {
      discordBadge.className = 'badge-status badge-eligible';
      discordBadge.textContent = '✓ ELIGIBLE';
    } else {
      discordBadge.className = 'badge-status badge-not-eligible';
      discordBadge.textContent = 'NOT ELIGIBLE';
    }
  }
}

// 5. Animasi Cincin Reveal
function triggerRingReveal(eligibleCount) {
  setTimeout(() => {
    if (eligibleCount > 0) {
      if (topStagePill) {
        topStagePill.className = 'badge-status badge-eligible';
        topStagePill.textContent = 'ELIGIBLE';
      }
      if (stageClaimStatus) {
        stageClaimStatus.textContent = `Lolos di ${eligibleCount} dari 3 Track`;
        stageClaimStatus.style.color = 'var(--color-mint)';
      }
      if (stageSubNote) {
        stageSubNote.textContent = `Selamat! Akun & wallet kamu terdeteksi memenuhi syarat pada ${eligibleCount} track.`;
      }
      btnSharePortal?.classList.remove('hidden');
    } else {
      if (topStagePill) {
        topStagePill.className = 'badge-status badge-not-eligible';
        topStagePill.textContent = 'TIDAK ELIGIBLE';
      }
      if (stageClaimStatus) {
        stageClaimStatus.textContent = '0 dari 3 Track Eligible';
        stageClaimStatus.style.color = '';
      }
      if (stageSubNote) {
        stageSubNote.textContent = 'Akun atau wallet kamu saat ini belum memenuhi kriteria pada ketiga track yang diuji.';
      }
      btnSharePortal?.classList.add('hidden');
    }
  }, 1200);
}

// 6. Reset & Putuskan Sambungan
async function resetAndGoBack() {
  try {
    await fetch('/api/reset', { method: 'POST' });
    state.walletAddress = null;
    state.discord = null;
    showScreen('signin');
    showToast('Sesi telah direset.', 'info');
  } catch (err) {
    console.error('Reset error:', err);
  }
}

async function disconnectDiscord() {
  try {
    await fetch('/auth/discord/disconnect', { method: 'POST' });
    state.discord = null;
    updateDiscordUI();
    resetCheckUI();
    showToast('Sambungan Discord diputuskan.', 'info');
  } catch (err) {
    console.error('Discord disconnect error:', err);
  }
}

// Event Listeners
btnHeroSignIn?.addEventListener('click', handleWalletSignIn);
btnDisconnectWallet?.addEventListener('click', resetAndGoBack);
btnEvmDisconnect?.addEventListener('click', resetAndGoBack);

btnConnectDiscord?.addEventListener('click', () => {
  window.location.href = '/auth/discord';
});
btnDisconnectDiscord?.addEventListener('click', disconnectDiscord);

btnCheckEligibility?.addEventListener('click', checkEligibility);

btnSharePortal?.addEventListener('click', () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`Saya telah memeriksa status di AirdropCheck Lab! ${stageClaimStatus?.textContent || ''}`);
    showToast('Hasil disalin ke clipboard!', 'success');
  }
});

// Periksa Parameter URL (setelah redirect Discord)
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('discord') === 'connected') {
    showToast('Akun Discord berhasil terhubung!', 'success');
  } else if (params.get('error') === 'discord_cancelled') {
    showToast('Izin Discord dibatalkan oleh pengguna.', 'info');
  } else if (params.get('error') === 'discord_env_missing') {
    showToast('DISCORD_CLIENT_ID belum diisi di file .env server.', 'error');
  } else if (params.get('error')) {
    showToast(`Pemberitahuan: ${params.get('error')}`, 'error');
  }
  if (params.toString()) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Inisialisasi awal
loadSession();
checkUrlParams();
