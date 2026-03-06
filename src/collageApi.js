import { getCurrentSite, getSiteName } from './sites';
import { getAuthKey, getTorrentPass, parseQuality } from './collageParser';

export async function fetchCollageFromApi(collageId) {
  const site = getCurrentSite();
  if (!site) throw new Error('Unsupported site');

  const { profileManager } = await import('./profileManager');
  const apiToken = profileManager.getApiToken(site.id);
  if (!apiToken) throw new Error(`API token is required for ${site.name}. Configure it via the GazelleSubs Settings menu.`);

  const apiUrl = `${location.origin}/${site.api.baseEndpoint}?action=${site.api.collageAction}&id=${collageId}`;

  const headers = {
    'Authorization': `${apiToken}`,
  };

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(`API error: ${data.status}`);
  }

  return transformApiResponse(data.response, site);
}

function transformApiResponse(response, site) {
  const authKey = getAuthKey();
  const torrentPass = getTorrentPass();
  const siteName = getSiteName();

  const groups = (response.torrentgroups || []).map(entry => {
    // OPS nests group info under entry.group, RED has it flat
    const group = entry.group || entry;
    const torrentsRaw = entry.torrents || group.torrents || [];

    // Build artist display from musicInfo
    const artists = group.musicInfo?.artists || [];
    let artistDisplay;
    if (artists.length === 0) {
      artistDisplay = 'Unknown';
    } else if (artists.length > 2) {
      artistDisplay = 'Various Artists';
    } else {
      artistDisplay = artists.map(a => a.name).join(' & ');
    }

    // Transform torrents
    const torrents = torrentsRaw.map(t => {
      // Build quality string: "format / encoding" e.g. "FLAC / Lossless", "MP3 / 320"
      const quality = `${t.format} / ${t.encoding}`;

      // torrentid (RED) or id (OPS)
      const torrentId = t.torrentid || t.id;

      // Build download URL using site-specific pattern
      const downloadUrl = site.api.downloadUrlPattern(torrentId, authKey, torrentPass);

      return {
        id: String(torrentId),
        quality,
        qualityType: parseQuality(quality),
        mediaSource: t.media || 'CD',
        downloadUrl,
        size: formatSize(t.size),
        snatches: t.snatched || 0,
        seeders: t.seeders || 0,
        leechers: t.leechers || 0,
        isSnatched: t.has_snatched || false,
        isSeeding: false,
      };
    });

    // Tags: OPS returns array in group.tags, RED returns tagList string
    let tags;
    if (Array.isArray(group.tags)) {
      tags = group.tags;
    } else {
      const tagList = group.tagList || '';
      tags = tagList.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
    }

    return {
      id: String(group.id),
      artists,
      artistDisplay,
      album: group.name,
      year: group.year || '',
      coverUrl: group.wikiImage || '',
      tags,
      torrents,
      selected: false,
    };
  });

  return {
    collages: [{
      id: String(response.id),
      name: response.name,
      groups,
      expanded: true, // Start expanded since it's a single collage
      catchup: false,
    }],
    authKey,
    torrentPass,
    totalCollages: 1,
    totalGroups: groups.length,
    totalTorrents: groups.reduce((sum, g) => sum + g.torrents.length, 0),
    siteName,
    hideCatchup: true,
  };
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, exp)).toFixed(2);
  return `${size} ${units[exp]}`;
}

export function getCollageIdFromUrl() {
  const url = new URL(location.href);
  if (url.pathname.includes('collages.php') || url.pathname.includes('collage.php')) {
    return url.searchParams.get('id');
  }
  return null;
}

export function isCollageViewPage() {
  const url = new URL(location.href);
  const isCollagePage = url.pathname.includes('collages.php') || url.pathname.includes('collage.php');
  const hasId = url.searchParams.has('id');
  const hasAction = url.searchParams.has('action');
  // Must be collages.php?id=<number> without other actions like edit, manage, etc.
  return isCollagePage && hasId && !hasAction;
}
