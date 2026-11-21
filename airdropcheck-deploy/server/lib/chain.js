import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const ERC721_MINIMAL_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

/**
 * Membaca NFT_CONTRACT_ADDRESS secara langsung dari file .env.
 * Mendukung 1 alamat ATAU banyak alamat kontrak dipisah koma (,).
 * Contoh: NFT_CONTRACT_ADDRESS=0xAlamat1,0xAlamat2,0xAlamat3
 */
function getContractAddresses() {
  let raw = process.env.NFT_CONTRACT_ADDRESS || '';
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
      if (parsed.NFT_CONTRACT_ADDRESS) {
        raw = parsed.NFT_CONTRACT_ADDRESS;
      }
    }
  } catch {}

  return raw
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');
}

/**
 * Mendapatkan provider RPC testnet dari konfigurasi .env
 */
function getProvider() {
  const rpcUrl = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Memeriksa kepemilikan NFT uji pada wallet address.
 * Mendukung multi-koleksi: jika wallet memegang NFT di salah satu kontrak, maka ELIGIBLE.
 * 
 * @param {string} walletAddress 
 * @returns {Promise<{ eligible: boolean, count: number, error?: boolean, reason: string }>}
 */
export async function checkNftEligibility(walletAddress) {
  if (!walletAddress) {
    return { eligible: false, count: 0, reason: 'Alamat wallet tidak valid' };
  }

  const contractAddresses = getContractAddresses();

  // Jika kontrak belum diisi di .env, beri pesan jelas tanpa crash
  if (contractAddresses.length === 0) {
    return {
      eligible: false,
      count: 0,
      reason: 'Kontrak NFT uji belum dikonfigurasi. Isi NFT_CONTRACT_ADDRESS di .env setelah deploy kontrak.'
    };
  }

  try {
    const provider = getProvider();

    // Periksa saldo dan nama NFT di setiap kontrak secara paralel
    const balancePromises = contractAddresses.map(async (addr) => {
      try {
        const contract = new ethers.Contract(addr, ERC721_MINIMAL_ABI, provider);
        const bal = await contract.balanceOf(walletAddress);
        const balanceBigInt = BigInt(bal.toString());
        
        let nftName = 'NFT Uji';
        let nftSymbol = '';

        if (balanceBigInt > 0n) {
          try {
            nftName = await contract.name();
          } catch {}
          try {
            nftSymbol = await contract.symbol();
          } catch {}
        }

        return {
          address: addr,
          balance: balanceBigInt,
          name: nftName,
          symbol: nftSymbol
        };
      } catch (err) {
        return { address: addr, balance: 0n, name: 'NFT Uji', symbol: '' };
      }
    });

    const results = await Promise.all(balancePromises);
    let totalNftCount = 0;
    const collectionsHolding = [];
    const heldItems = [];

    for (const res of results) {
      if (res.balance > 0n) {
        const count = Number(res.balance);
        totalNftCount += count;
        const tag = res.symbol ? `${res.name} (${res.symbol})` : res.name;
        collectionsHolding.push(`${count} NFT "${tag}"`);
        heldItems.push({
          name: res.name,
          symbol: res.symbol,
          count,
          address: res.address
        });
      }
    }

    if (totalNftCount > 0) {
      return {
        eligible: true,
        count: totalNftCount,
        items: heldItems,
        reason: `Wallet memegang ${collectionsHolding.join(', ')} di Monad Testnet`
      };
    } else {
      return {
        eligible: false,
        count: 0,
        items: [],
        reason: contractAddresses.length > 1
          ? `Wallet tidak memegang NFT dari ${contractAddresses.length} koleksi yang disyaratkan`
          : 'Wallet tidak memegang NFT uji'
      };
    }
  } catch (error) {
    console.error('[Chain RPC Error]:', error.message || error);
    return {
      eligible: false,
      count: 0,
      error: true,
      reason: 'Jaringan uji tidak merespons. Coba lagi beberapa saat lagi.'
    };
  }
}
