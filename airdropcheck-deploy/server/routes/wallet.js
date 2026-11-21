import express from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * Format pesan tanda tangan sesuai Bagian 10 PROTOTYPE_SPEC.md
 */
export function constructSignMessage(nonce) {
  return `AirdropCheck Lab (simulasi akademik)\nBukti kepemilikan wallet. Tidak ada transaksi.\nNonce: ${nonce}`;
}

/**
 * GET /api/nonce
 * Menghasilkan nonce acak sekali pakai
 */
router.get('/nonce', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  req.session.walletNonce = nonce;
  res.json({ nonce, message: constructSignMessage(nonce) });
});

/**
 * POST /api/wallet/verify
 * Memverifikasi tanda tangan wallet (EIP-191 personal_sign)
 * dan menyimpan alamat terverifikasi ke sesi
 */
router.post('/wallet/verify', async (req, res) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: 'Alamat wallet dan signature diperlukan' });
  }

  const nonce = req.session.walletNonce;
  if (!nonce) {
    return res.status(400).json({ error: 'Nonce kedaluwarsa atau belum diminta. Muat ulang halaman.' });
  }

  try {
    const expectedMessage = constructSignMessage(nonce);
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Tanda tangan tidak cocok dengan alamat wallet' });
    }

    // Nonce sekali pakai — hapus setelah dipakai
    delete req.session.walletNonce;

    // Simpan alamat terverifikasi ke sesi
    req.session.walletAddress = recoveredAddress.toLowerCase();

    res.json({
      success: true,
      address: req.session.walletAddress
    });
  } catch (err) {
    console.error('[Wallet Verify Error]:', err.message || err);
    res.status(400).json({ error: 'Verifikasi tanda tangan gagal' });
  }
});

/**
 * POST /api/wallet/disconnect
 * Memutuskan sambungan wallet dari sesi
 */
router.post('/wallet/disconnect', (req, res) => {
  req.session.walletAddress = null;
  res.json({ success: true });
});

export default router;
