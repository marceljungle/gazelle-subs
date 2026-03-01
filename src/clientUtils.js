import { XFetch } from './XFetch';

export const addTorrent = async (
  torrentUrl,
  clientUrl,
  username,
  password,
  client,
  path,
  category
) => {
  const implementations = {
    qbit: async () => {
      // Login first
      await XFetch.post(
        `${clientUrl}/api/v2/auth/login`,
        `username=${username}&password=${password}`,
        { 'content-type': 'application/x-www-form-urlencoded' }
      );
      
      const torData = new FormData();
      torData.append('urls', torrentUrl);
      if (path) {
        torData.append('savepath', path);
      }
      if (category) {
        torData.append('category', category);
      }
      
      const res = await XFetch.post(`${clientUrl}/api/v2/torrents/add`, torData);
      return res.ok;
    },

    trans: async (sessionId = null) => {
      const headers = {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/json',
      };
      
      if (sessionId) {
        headers['X-Transmission-Session-Id'] = sessionId;
      }
      
      const res = await XFetch.post(
        `${clientUrl}/transmission/rpc`,
        JSON.stringify({
          arguments: { filename: torrentUrl, 'download-dir': path },
          method: 'torrent-add',
        }),
        headers
      );
      
      if (res.raw.status === 409) {
        const responseHeaders = await res.headers();
        return implementations.trans(responseHeaders['X-Transmission-Session-Id']);
      }
      
      return res.ok;
    },

    flood: async () => {
      // Login
      await XFetch.post(
        `${clientUrl}/api/auth/authenticate`,
        JSON.stringify({ password, username }),
        { 'content-type': 'application/json' }
      );
      
      const res = await XFetch.post(
        `${clientUrl}/api/torrents/add-urls`,
        JSON.stringify({ urls: [torrentUrl], destination: path, start: true }),
        { 'content-type': 'application/json' }
      );
      
      return res.ok;
    },

    deluge: async () => {
      // Login
      await XFetch.post(
        `${clientUrl}/json`,
        JSON.stringify({
          method: 'auth.login',
          params: [password],
          id: 0,
        }),
        { 'content-type': 'application/json' }
      );
      
      // Download torrent to temp location
      const downloadRes = await XFetch.post(
        `${clientUrl}/json`,
        JSON.stringify({
          method: 'web.download_torrent_from_url',
          params: [torrentUrl],
          id: 1,
        }),
        { 'content-type': 'application/json' }
      );
      
      const tempPath = (await downloadRes.json()).result;
      
      // Add torrent
      const res = await XFetch.post(
        `${clientUrl}/json`,
        JSON.stringify({
          method: 'web.add_torrents',
          params: [
            [
              {
                path: tempPath,
                options: {
                  add_paused: false,
                  download_location: path,
                },
              },
            ],
          ],
          id: 2,
        }),
        { 'content-type': 'application/json' }
      );
      
      return res.ok;
    },

    rutorrent: async () => {
      const headers = {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      };
      
      // Fetch torrent file
      const response = await fetch(torrentUrl);
      const data = await response.blob();
      
      const form = new FormData();
      form.append('torrent_file[]', data, 'torrent.torrent');
      form.append('torrents_start_stopped', 'true');
      if (path) {
        form.append('dir_edit', path);
      }
      if (category) {
        form.append('label', category);
      }
      
      const res = await XFetch.post(
        `${clientUrl}/rutorrent/php/addtorrent.php?json=1`,
        form,
        headers
      );
      
      return res.ok;
    },
  };

  if (!implementations[client]) {
    console.error(`Unknown client type: ${client}`);
    return false;
  }

  try {
    return await implementations[client]();
  } catch (error) {
    console.error(`Failed to add torrent to ${client}:`, error);
    return false;
  }
};

export async function testClient(clientUrl, username, password, client) {
  const clients = {
    trans: async () => {
      const headers = {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/json',
        'X-Transmission-Session-Id': null,
      };
      const res = await XFetch.post(`${clientUrl}/transmission/rpc`, null, headers);
      return res.raw.status !== 401;
    },

    qbit: async () => {
      const res = await XFetch.post(
        `${clientUrl}/api/v2/auth/login`,
        `username=${username}&password=${password}`,
        { 'content-type': 'application/x-www-form-urlencoded', cookie: 'SID=' }
      );
      return (await res.text()) === 'Ok.';
    },

    deluge: async () => {
      const res = await XFetch.post(
        `${clientUrl}/json`,
        JSON.stringify({
          method: 'auth.login',
          params: [password],
          id: 0,
        }),
        { 'content-type': 'application/json' }
      );
      try {
        return (await res.json()).result === true;
      } catch {
        return false;
      }
    },

    flood: async () => {
      const res = await XFetch.post(
        `${clientUrl}/api/auth/authenticate`,
        JSON.stringify({ password, username }),
        { 'content-type': 'application/json' }
      );
      try {
        return (await res.json()).success === true;
      } catch {
        return false;
      }
    },

    rutorrent: async () => {
      const headers = {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/json',
      };
      const res = await XFetch.post(
        `${clientUrl}/rutorrent/php/addtorrent.php?json=1`,
        null,
        headers
      );
      return res.raw.status !== 401;
    },
  };

  if (!clients[client]) {
    return false;
  }

  try {
    return await clients[client]();
  } catch {
    return false;
  }
}

export const getCategories = async (clientUrl, username, password) => {
  await XFetch.post(
    `${clientUrl}/api/v2/auth/login`,
    `username=${username}&password=${password}`,
    { 'content-type': 'application/x-www-form-urlencoded' }
  );
  
  const res = await XFetch.get(`${clientUrl}/api/v2/torrents/categories`);
  try {
    return Object.keys(await res.json());
  } catch {
    return [];
  }
};

export async function detectClient(url) {
  try {
    const res = await XFetch.get(url);
    const body = await res.text();
    const headers = await res.headers();
    
    if (headers['WWW-Authenticate']?.includes('"Transmission"')) return 'trans';
    if (body.includes('<title>Deluge ')) return 'deluge';
    if (body.includes('<title>Flood</title>')) return 'flood';
    if (body.includes('<title>qBittorrent ')) return 'qbit';
    if (body.includes('ruTorrent ')) return 'rutorrent';
  } catch {
    // Ignore errors
  }
  return 'unknown';
}
