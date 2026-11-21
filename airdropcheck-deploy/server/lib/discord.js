const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Menghasilkan URL OAuth2 Discord
 * @param {string} state 
 * @returns {string}
 */
export function getDiscordAuthUrl(state) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback');
  const scope = encodeURIComponent('identify guilds.members.read');

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${encodeURIComponent(state)}`;
}

/**
 * Menukar code OAuth2 dengan data pengguna dan role di guild uji
 * Sesuai aturan: access token langsung dibuang setelah request selesai
 * @param {string} code 
 * @returns {Promise<{ discordId: string, username: string, roles: string[] }>}
 */
export async function exchangeCodeAndFetchRoles(code) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!clientId || !clientSecret) {
    throw new Error('Kredensial Discord OAuth2 belum diisi di .env');
  }

  // 1. Tukar authorization code dengan access token
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });

  if (!tokenRes.ok) {
    const errorData = await tokenRes.text();
    throw new Error(`Gagal menukar kode Discord: ${errorData}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  try {
    // 2. Ambil informasi akun pengguna (@me)
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userRes.ok) {
      throw new Error('Gagal mengambil profil pengguna Discord');
    }

    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    // 3. Ambil data role pada server uji (guild)
    let roles = [];
    if (guildId) {
      const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (memberRes.ok) {
        const memberData = await memberRes.json();
        roles = Array.isArray(memberData.roles) ? memberData.roles : [];
      } else {
        console.warn(`[Discord] Pengguna tidak ditemukan di server guild ${guildId} atau izin ditolak.`);
      }
    }

    // 4. Ambil nama-nama role (dari Bot Token jika ada, atau dari ROLE_NAMES di .env)
    const roleNamesMap = {};
    const envRoleNames = process.env.ROLE_NAMES || '';
    envRoleNames.split(',').forEach(item => {
      const [id, name] = item.split(':');
      if (id && name) roleNamesMap[id.trim()] = name.trim();
    });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && guildId) {
      try {
        const guildRolesRes = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
          headers: { Authorization: `Bot ${botToken}` }
        });
        if (guildRolesRes.ok) {
          const guildRoles = await guildRolesRes.json();
          guildRoles.forEach(r => { roleNamesMap[r.id] = r.name; });
        }
      } catch (e) {
        console.warn('[Discord] Gagal mengambil daftar nama role via Bot Token:', e.message);
      }
    }

    const namedRoles = roles.map(rId => ({
      id: rId,
      name: roleNamesMap[rId] || `Role #${rId.slice(0, 6)}...`
    }));

    // Kembalikan HANYA id, username, dan roles (token dibuang dari memori)
    return {
      discordId,
      username,
      roles,
      namedRoles
    };
  } finally {
    // Memastikan token tidak tersimpan
  }
}
