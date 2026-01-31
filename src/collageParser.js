/**
 * Collage Parser - Parses the subscribed collages page HTML
 * Supports multiple Gazelle sites (RED, OPS, etc.)
 */

import { getCurrentSite, getSiteName } from './sites';

/**
 * Quality type definitions
 */
export const QualityTypes = {
  FLAC_24: 'FLAC / 24bit Lossless',
  FLAC: 'FLAC / Lossless',
  MP3_320: 'MP3 / 320',
  MP3_V0: 'MP3 / V0 (VBR)',
  MP3_V2: 'MP3 / V2 (VBR)',
  ANY: 'Any',
};

/**
 * Media source type definitions
 */
export const MediaTypes = {
  CD: 'CD',
  WEB: 'WEB',
  VINYL: 'Vinyl',
  SACD: 'SACD',
  DVD: 'DVD',
  BLURAY: 'Blu-ray',
  CASSETTE: 'Cassette',
  DAT: 'DAT',
  SOUNDBOARD: 'Soundboard',
  ANY: 'Any',
};

/**
 * Parse quality string to identify format
 * @param {string} qualityStr - Quality string from torrent
 * @returns {string} Normalized quality type
 */
export function parseQuality(qualityStr) {
  const str = qualityStr.toLowerCase();
  if (str.includes('24bit') || str.includes('24 bit')) return QualityTypes.FLAC_24;
  if (str.includes('flac') && str.includes('lossless')) return QualityTypes.FLAC;
  if (str.includes('320')) return QualityTypes.MP3_320;
  if (str.includes('v0')) return QualityTypes.MP3_V0;
  if (str.includes('v2')) return QualityTypes.MP3_V2;
  return qualityStr;
}

/**
 * Extract media source from quality/edition text
 * @param {string} text - Quality or edition text
 * @returns {string} Media source
 */
function parseMediaFromText(text) {
  const mediaTypes = ['CD', 'WEB', 'Vinyl', 'SACD', 'DVD', 'Blu-ray', 'Cassette', 'DAT', 'Soundboard'];
  for (const media of mediaTypes) {
    if (text.includes(media)) {
      return media;
    }
  }
  return 'CD';
}

/**
 * Extract auth key from the page
 * @returns {string|null} Auth key
 */
export function getAuthKey() {
  const site = getCurrentSite();
  
  // Try to get from global variable first
  if (typeof authkey !== 'undefined') {
    return authkey;
  }
  
  // Try to get from body data attribute (OPS style)
  const body = document.body;
  if (body?.dataset?.auth) {
    return body.dataset.auth;
  }
  
  // Try to extract from a catch-up link
  const catchupLink = document.querySelector('a[href*="action=catchup_collages"]');
  if (catchupLink && site) {
    const match = catchupLink.href.match(site.selectors.authKeyPattern);
    if (match) return match[1];
  }
  
  // Try to extract from script content
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent && site) {
      const match = script.textContent.match(site.selectors.authKeyVarPattern);
      if (match) return match[1];
    }
  }
  
  return null;
}

/**
 * Extract torrent pass from the page
 * @returns {string|null} Torrent pass
 */
export function getTorrentPass() {
  const site = getCurrentSite();
  if (!site) return null;
  
  const downloadLink = document.querySelector('a[href*="torrent_pass="], a[href*="passkey="]');
  if (downloadLink) {
    const match = downloadLink.href.match(site.selectors.torrentPassPattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract quality text from a torrent row using site-specific configuration
 * @param {Element} row - Torrent row element
 * @param {Object} site - Site configuration
 * @returns {string} Quality text
 */
function extractQualityText(row, site) {
  const extraction = site.qualityExtraction;
  
  if (!extraction) {
    // Fallback: try generic extraction
    return extractQualityFallback(row);
  }
  
  if (extraction.method === 'selector' && extraction.selector) {
    // Use CSS selector to find quality element
    const qualityLink = row.querySelector(extraction.selector);
    if (qualityLink) {
      const text = qualityLink.textContent.trim();
      // Extract from brackets if present
      const bracketMatch = text.match(/\[([^\]]+)\]/);
      return bracketMatch ? bracketMatch[1].trim() : text;
    }
  }
  
  if (extraction.method === 'regex') {
    const rowText = row.textContent;
    
    // Try primary pattern
    if (extraction.pattern) {
      const match = rowText.match(extraction.pattern);
      if (match) return match[1].trim();
    }
    
    // Try fallback pattern
    if (extraction.fallbackPattern) {
      const match = rowText.match(extraction.fallbackPattern);
      if (match) return match[1].trim();
    }
  }
  
  // Generic fallback
  return extractQualityFallback(row);
}

/**
 * Generic fallback for quality extraction
 * @param {Element} row - Torrent row element
 * @returns {string} Quality text
 */
function extractQualityFallback(row) {
  const rowText = row.textContent;
  
  // Try pattern with media source: "[WEB / FLAC / 24bit Lossless]"
  const withMediaMatch = rowText.match(/\[((?:CD|WEB|Vinyl|SACD|DVD|Blu-ray|Cassette|DAT|Soundboard)\s*\/\s*(?:FLAC|MP3)[^\]]*)\]/);
  if (withMediaMatch) return withMediaMatch[1].trim();
  
  // Try pattern without media: "FLAC / 24bit Lossless"
  const formatMatch = rowText.match(/((?:FLAC|MP3)\s*\/\s*(?:24bit\s+)?(?:Lossless|320|V0|V2)[^<\]]*)/i);
  if (formatMatch) return formatMatch[1].trim();
  
  return '';
}

/**
 * Parse a single torrent row
 * @param {Element} row - Torrent row element
 * @param {string} mediaSource - Media source from edition row
 * @returns {Object|null} Torrent info
 */
function parseTorrentRow(row, mediaSource = '') {
  const site = getCurrentSite();
  if (!site) return null;
  
  // Find download link - try site-specific selector first, then fallback
  let downloadLink = row.querySelector(site.selectors.downloadLink);
  
  // Fallback selectors for different sites
  if (!downloadLink) {
    downloadLink = row.querySelector('a.button_dl') || 
                   row.querySelector('a[title="Download"]') ||
                   row.querySelector('a[href*="action=download"]');
  }
  
  if (!downloadLink) return null;
  
  // Get torrent ID from download link
  const downloadUrl = downloadLink.href;
  const torrentIdMatch = downloadUrl.match(/id=(\d+)/);
  if (!torrentIdMatch) return null;
  
  const torrentId = torrentIdMatch[1];
  
  // Get quality info using site-specific extraction method
  const qualityText = extractQualityText(row, site);
  
  // Extract media from quality text if not provided from edition row
  let torrentMedia = mediaSource;
  if (qualityText) {
    torrentMedia = parseMediaFromText(qualityText);
  }
  
  // Get stats (size, snatches, seeders, leechers)
  const cells = row.querySelectorAll(site.selectors.statCells);
  const size = cells[0]?.textContent.trim() || '';
  const snatches = parseInt(cells[1]?.textContent.trim() || '0', 10);
  const seeders = parseInt(cells[2]?.textContent.trim() || '0', 10);
  const leechers = parseInt(cells[3]?.textContent.trim() || '0', 10);
  
  // Check if already snatched/seeding
  const isSnatched = row.classList.contains('snatched_torrent');
  const isSeeding = row.querySelector('.tl_notice')?.textContent?.includes('Seeding') || false;
  
  return {
    id: torrentId,
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

/**
 * Parse a torrent group
 * @param {Element} groupRow - Group row element
 * @param {Element} table - Parent table element
 * @returns {Object|null} Group info with torrents
 */
function parseGroup(groupRow, table) {
  const site = getCurrentSite();
  if (!site) return null;
  
  // Get group ID from row ID (format: group_632690273)
  const groupIdMatch = groupRow.id.match(site.selectors.groupIdPattern);
  if (!groupIdMatch) return null;
  
  const fullGroupId = groupIdMatch[1];
  
  // Get artist and album info
  const groupInfo = groupRow.querySelector(site.selectors.groupInfo);
  if (!groupInfo) return null;
  
  // Get artist(s)
  const artistLinks = groupInfo.querySelectorAll(site.selectors.artistLinks);
  const artists = Array.from(artistLinks).map(a => a.textContent.trim());
  
  // Get album name and link
  const albumLink = groupInfo.querySelector(site.selectors.albumLink);
  const albumName = albumLink?.textContent.trim() || '';
  const albumUrl = albumLink?.href || '';
  
  // Extract the actual group ID from the album URL (most reliable)
  const groupIdFromUrl = albumUrl.match(/id=(\d+)/)?.[1] || fullGroupId;
  
  // Get year
  const yearMatch = groupInfo.textContent.match(/\[(\d{4})\s/);
  const year = yearMatch ? yearMatch[1] : '';
  
  // Get cover image
  const coverImg = groupRow.querySelector(site.selectors.coverImg);
  const coverUrl = coverImg?.src || '';
  
  // Get tags
  const tagsDiv = groupInfo.querySelector(site.selectors.tagsDiv);
  const tags = tagsDiv 
    ? Array.from(tagsDiv.querySelectorAll('a')).map(a => a.textContent.trim())
    : [];
  
  // Get date added
  const addedOn = groupRow.dataset.addedOn || '';
  
  // Find all torrent rows for this group, including edition rows to get media source
  // OPS uses combined ID in group row (collageId + groupId) but just groupId in torrent rows
  // So we try both patterns: fullGroupId and groupIdFromUrl
  let allRows = table.querySelectorAll(`tr.${site.selectors.torrentRowClass}${fullGroupId}`);
  
  // If no rows found with full ID, try with the extracted group ID
  if (allRows.length === 0 && groupIdFromUrl !== fullGroupId) {
    allRows = table.querySelectorAll(`tr.${site.selectors.torrentRowClass}${groupIdFromUrl}`);
  }
  
  const torrents = [];
  let currentMedia = '';
  
  for (const row of allRows) {
    // Check if this is an edition row
    if (row.classList.contains(site.selectors.editionClass)) {
      // Extract media source from edition text: "2001 / Label / CatNo / Vinyl"
      const editionText = row.querySelector(site.selectors.editionInfoCell)?.textContent || '';
      currentMedia = parseMediaFromText(editionText);
    } else if (row.classList.contains('torrent_row') || row.classList.contains('group_torrent')) {
      // This is a torrent row
      const torrent = parseTorrentRow(row, currentMedia);
      if (torrent) {
        torrents.push(torrent);
      }
    }
  }
  
  return {
    id: groupIdFromUrl,
    fullId: fullGroupId,
    artists,
    artistDisplay: artists.join(' & '),
    album: albumName,
    albumUrl,
    year,
    coverUrl,
    tags,
    addedOn,
    torrents,
    selected: false,
  };
}

/**
 * Parse a collage section
 * @param {Element} collageTable - Collage header table
 * @returns {Object|null} Collage info with groups
 */
function parseCollage(collageTable) {
  const site = getCurrentSite();
  if (!site) return null;
  
  // Get collage name and ID from link
  const collageLink = collageTable.querySelector(site.selectors.collageLink);
  if (!collageLink) return null;
  
  const collageName = collageLink.textContent.trim();
  const collageIdMatch = collageLink.href.match(/id=(\d+)/);
  if (!collageIdMatch) return null;
  
  const collageId = collageIdMatch[1];
  
  // Get new torrents count
  const headerText = collageTable.querySelector('td')?.textContent || '';
  const countMatch = headerText.match(/\((\d+)\s+new/);
  const newCount = countMatch ? parseInt(countMatch[1], 10) : 0;
  
  // Get catch-up link
  const catchupLink = collageTable.querySelector(site.selectors.catchupLink);
  const catchupUrl = catchupLink?.href || '';
  
  // Find the corresponding torrent table
  const torrentTable = document.getElementById(`discog_table_${collageId}`);
  if (!torrentTable) return null;
  
  // Parse all groups in this collage
  const groupRows = torrentTable.querySelectorAll(`${site.selectors.groupRow}[id^="group_"]`);
  const groups = [];
  
  for (const groupRow of groupRows) {
    const group = parseGroup(groupRow, torrentTable);
    if (group) {
      groups.push(group);
    }
  }
  
  return {
    id: collageId,
    name: collageName,
    url: collageLink.href,
    newCount,
    catchupUrl,
    groups,
    selected: false,
    expanded: false,
  };
}

/**
 * Parse all subscribed collages from the page
 * @returns {Object} Parsed data including collages, auth info
 */
export function parseSubscribedCollages() {
  const site = getCurrentSite();
  const siteName = getSiteName();
  
  if (!site) {
    console.error('GazelleSubs: Unsupported site');
    return {
      authKey: null,
      torrentPass: null,
      collages: [],
      totalCollages: 0,
      totalGroups: 0,
      totalTorrents: 0,
      siteName: 'Unknown',
      error: 'Unsupported site',
    };
  }
  
  const authKey = getAuthKey();
  const torrentPass = getTorrentPass();
  
  // Find all collage header tables - try multiple selectors
  let collageTables = document.querySelectorAll(site.selectors.collageHeaderTable);
  
  // Fallback: try other common selectors
  if (collageTables.length === 0) {
    collageTables = document.querySelectorAll('table.subscribed_collages_table, table.subscribed-collages-table, table.collage_table');
  }
  
  const collages = [];
  
  for (const table of collageTables) {
    const collage = parseCollage(table);
    if (collage && collage.groups.length > 0) {
      collages.push(collage);
    }
  }
  
  // Calculate totals
  const totalGroups = collages.reduce((sum, c) => sum + c.groups.length, 0);
  const totalTorrents = collages.reduce(
    (sum, c) => sum + c.groups.reduce((gSum, g) => gSum + g.torrents.length, 0),
    0
  );
  
  console.log(`GazelleSubs [${siteName}]: Found ${collages.length} collages, ${totalGroups} groups, ${totalTorrents} torrents`);
  
  return {
    authKey,
    torrentPass,
    collages,
    totalCollages: collages.length,
    totalGroups,
    totalTorrents,
    siteName,
  };
}

/**
 * Filter torrents by quality and media preference
 * @param {Array} torrents - List of torrents
 * @param {string} quality - Desired quality
 * @param {string} media - Desired media source
 * @param {boolean} preferMostSeeded - Sort by seeders
 * @param {boolean} preferMostSnatched - Sort by snatches
 * @returns {Object|null} Best matching torrent or null
 */
export function filterTorrentByQuality(torrents, quality, media = MediaTypes.ANY, preferMostSeeded = false, preferMostSnatched = false) {
  if (!torrents || torrents.length === 0) return null;
  
  let filtered = torrents;
  
  // Filter by quality if not 'Any'
  if (quality !== QualityTypes.ANY) {
    filtered = filtered.filter(t => t.qualityType === quality);
    if (filtered.length === 0) return null;
  }
  
  // Filter by media source if not 'Any'
  if (media !== MediaTypes.ANY) {
    filtered = filtered.filter(t => t.mediaSource === media);
    if (filtered.length === 0) return null;
  }
  
  // Sort by preference
  if (preferMostSeeded) {
    filtered.sort((a, b) => b.seeders - a.seeders);
  } else if (preferMostSnatched) {
    filtered.sort((a, b) => b.snatches - a.snatches);
  }
  
  return filtered[0];
}

/**
 * Generate catch-up URL for a collage
 * @param {string} collageId - Collage ID
 * @param {string} authKey - Auth key
 * @returns {string} Catch-up URL
 */
export function getCatchupUrl(collageId, authKey) {
  return `${location.origin}/userhistory.php?action=catchup_collages&auth=${authKey}&collageid=${collageId}`;
}

/**
 * Execute catch-up for a collage
 * @param {string} collageId - Collage ID
 * @param {string} authKey - Auth key
 * @returns {Promise<boolean>} Success status
 */
export async function catchupCollage(collageId, authKey) {
  try {
    const url = getCatchupUrl(collageId, authKey);
    const response = await fetch(url, { redirect: 'follow' });
    return response.ok || response.status === 302;
  } catch (error) {
    console.error('Failed to catch up collage:', error);
    return false;
  }
}
