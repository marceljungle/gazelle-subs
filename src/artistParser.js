import { getCurrentSite, getSiteName } from './sites';
import { getAuthKey, getTorrentPass, parseQuality, MediaTypes } from './collageParser';

function getMediaTypeValues() {
  return Object.values(MediaTypes).filter(m => m !== MediaTypes.ANY);
}

function parseMediaFromText(text) {
  for (const media of getMediaTypeValues()) {
    if (text.includes(media)) return media;
  }
  return MediaTypes.CD;
}

function extractQualityFromRow(row, site) {
  if (site.id === 'red') {
    const qualityLink = row.querySelector('td a[href*="torrentid="]');
    if (qualityLink) {
      const text = qualityLink.textContent.trim();
      const bracketMatch = text.match(/\[([^\]]+)\]/);
      return bracketMatch ? bracketMatch[1].trim() : text;
    }
  }

  // OPS and fallback: regex on row text
  const rowText = row.textContent;
  const opsMatch = rowText.match(/▶\s*\[([^\]]+)\]/);
  if (opsMatch) return opsMatch[1].trim();

  const bracketMatch = rowText.match(/\[((?:CD|WEB|Vinyl|SACD|DVD|Blu-ray|Cassette|DAT|Soundboard)\s*\/\s*(?:FLAC|MP3)[^\]]*)\]/);
  if (bracketMatch) return bracketMatch[1].trim();

  const formatMatch = rowText.match(/((?:FLAC|MP3)\s*\/\s*(?:24bit\s+)?(?:Lossless|320|V0|V2)[^<\]]*)/i);
  if (formatMatch) return formatMatch[1].trim();

  return '';
}

function parseArtistTorrentRow(row, site, currentMedia) {
  const downloadLink = row.querySelector(site.selectors.downloadLink)
    || row.querySelector('a.button_dl')
    || row.querySelector('a[title="Download"]')
    || row.querySelector('a[href*="action=download"]');

  if (!downloadLink) return null;

  const downloadUrl = downloadLink.href;
  const torrentIdMatch = downloadUrl.match(/id=(\d+)/);
  if (!torrentIdMatch) return null;

  const qualityText = extractQualityFromRow(row, site);

  let torrentMedia = currentMedia || '';
  if (qualityText) {
    const hasMediaInQuality = getMediaTypeValues().some(m => qualityText.includes(m));
    if (hasMediaInQuality) torrentMedia = parseMediaFromText(qualityText);
  }
  if (!torrentMedia) torrentMedia = MediaTypes.CD;

  const cells = row.querySelectorAll(site.selectors.statCells);
  const size = cells[0]?.textContent.trim() || '';
  const snatches = parseInt(cells[1]?.textContent.trim() || '0', 10);
  const seeders = parseInt(cells[2]?.textContent.trim() || '0', 10);
  const leechers = parseInt(cells[3]?.textContent.trim() || '0', 10);

  const isSnatched = row.classList.contains('snatched_torrent');
  const isSeeding = row.classList.contains('seeding_torrent')
    || (row.querySelector('.tl_notice')?.textContent?.includes('Seeding') || false);

  return {
    id: torrentIdMatch[1],
    downloadUrl,
    quality: qualityText,
    qualityType: parseQuality(qualityText),
    mediaSource: torrentMedia,
    size,
    snatches,
    seeders,
    leechers,
    isSnatched,
    isSeeding,
  };
}

function parseArtistGroup(groupRow, table, site) {
  const groupInfo = groupRow.querySelector(site.selectors.groupInfo);
  if (!groupInfo) return null;

  const albumLink = groupInfo.querySelector(site.selectors.albumLink);
  const albumName = albumLink?.textContent.trim() || '';
  const albumUrl = albumLink?.href || '';
  const groupId = albumUrl.match(/id=(\d+)/)?.[1];
  if (!groupId) return null;

  // Year: in the strong element, format "2011 - Album" or "2011 – Album"
  const strongEl = groupInfo.querySelector('strong');
  const yearMatch = strongEl?.textContent.match(/(\d{4})\s*[-–]/);
  const year = yearMatch ? yearMatch[1] : '';

  const coverImg = groupRow.querySelector(site.selectors.coverImg);
  const coverUrl = coverImg?.src || '';

  const tagsDiv = groupInfo.querySelector(site.selectors.tagsDiv);
  const tags = tagsDiv
    ? Array.from(tagsDiv.querySelectorAll('a')).map(a => a.textContent.trim())
    : [];

  // Find torrent rows for this group using groupid_XXXXX class
  const allRows = table.querySelectorAll(`tr.groupid_${groupId}`);
  const torrents = [];
  let currentMedia = '';

  for (const row of allRows) {
    if (row.classList.contains('edition') || row.querySelector('.edition_info')) {
      const editionText = row.querySelector('.edition_info')?.textContent || '';
      currentMedia = parseMediaFromText(editionText);
    } else if (row.classList.contains('torrent_row')) {
      const torrent = parseArtistTorrentRow(row, site, currentMedia);
      if (torrent) torrents.push(torrent);
    }
  }

  if (torrents.length === 0) return null;

  return {
    id: groupId,
    artists: [], // Will be set to artist name at the section level
    artistDisplay: '',
    album: albumName,
    albumUrl,
    year,
    coverUrl,
    tags,
    torrents,
    selected: false,
  };
}

function findReleaseTables(site) {
  const sections = [];

  if (site.id === 'red') {
    // RED: each section is a separate <table id="torrents_album">, etc.
    const tables = document.querySelectorAll('table.torrent_table.release_table');
    for (const table of tables) {
      const headerRow = table.querySelector('tr.colhead_dark');
      const nameEl = headerRow?.querySelector('strong');
      const name = nameEl?.textContent.trim() || 'Unknown';
      sections.push({ name, table });
    }
  } else {
    // OPS: single or multiple <table class="torrent_table">, with <tr id="torrents_album"> headers
    const tables = document.querySelectorAll('table.torrent_table.release_table, table.torrent_table.m_table');
    for (const table of tables) {
      const headerRows = table.querySelectorAll('tr.colhead_dark');
      if (headerRows.length === 0) continue;

      // OPS may have multiple sections in one table, or one table per section
      // Each colhead_dark with a <strong> starts a new section
      for (const headerRow of headerRows) {
        const nameEl = headerRow.querySelector('strong');
        if (!nameEl) continue;
        const name = nameEl.textContent.trim();
        // Collect rows between this header and the next colhead_dark
        sections.push({ name, table, headerRow });
      }
    }
  }

  return sections;
}

function getGroupRowsForSection(section, site) {
  const { table, headerRow } = section;

  if (site.id === 'red') {
    // RED: one table per section, all group rows in it
    return Array.from(table.querySelectorAll('tr.group.discog'));
  }

  // OPS: groups belong to a section identified by releases_N class
  // Extract releases_N from the headerRow's id attribute or from group rows  
  const headerId = headerRow?.id || '';
  // headerId is like "torrents_album" -> find releases_N from group rows
  // The View/Toggle link targets .releases_N
  const toggleLink = headerRow?.querySelector('a[onclick*="releases_"]');
  const toggleMatch = toggleLink?.getAttribute('onclick')?.match(/releases_(\d+)/);
  
  if (toggleMatch) {
    const releasesClass = `releases_${toggleMatch[1]}`;
    return Array.from(table.querySelectorAll(`tr.${releasesClass}.group.discog, tr.${releasesClass}.group[class*="_header"]`));
  }

  return [];
}

function getArtistName() {
  // Both sites: artist name is in <h2> or similar heading
  const h2 = document.querySelector('h2');
  if (h2) {
    // May contain extra elements, just get the main text
    const nameEl = h2.querySelector('a') || h2;
    return nameEl.textContent.trim();
  }
  return 'Unknown Artist';
}

export function isArtistPage() {
  return location.href.includes('artist.php') && new URL(location.href).searchParams.has('id');
}

export function getArtistIdFromUrl() {
  const url = new URL(location.href);
  if (url.pathname.includes('artist.php')) {
    return url.searchParams.get('id');
  }
  return null;
}

export function parseArtistPage() {
  const site = getCurrentSite();
  const siteName = getSiteName();

  if (!site) {
    return { collages: [], siteName: 'Unknown', error: 'Unsupported site' };
  }

  const authKey = getAuthKey();
  const torrentPass = getTorrentPass();
  const artistName = getArtistName();

  const sections = findReleaseTables(site);
  const collages = [];

  for (const section of sections) {
    const groupRows = getGroupRowsForSection(section, site);
    const groups = [];

    for (const groupRow of groupRows) {
      const group = parseArtistGroup(groupRow, section.table, site);
      if (group) {
        group.artists = [artistName];
        group.artistDisplay = artistName;
        groups.push(group);
      }
    }

    if (groups.length === 0) continue;

    collages.push({
      id: `artist_${section.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${section.name} (${groups.length})`,
      groups,
      expanded: false,
      catchup: false,
    });
  }

  // Expand first section by default
  if (collages.length > 0) {
    collages[0].expanded = true;
  }

  const totalGroups = collages.reduce((sum, c) => sum + c.groups.length, 0);
  const totalTorrents = collages.reduce(
    (sum, c) => sum + c.groups.reduce((gSum, g) => gSum + g.torrents.length, 0),
    0
  );

  return {
    authKey,
    torrentPass,
    collages,
    totalCollages: collages.length,
    totalGroups,
    totalTorrents,
    siteName,
    artistName,
    hideCatchup: true,
  };
}
