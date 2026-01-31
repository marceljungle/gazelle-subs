/**
 * Site Configuration - Defines site-specific selectors and settings
 * Allows easy addition of new Gazelle sites
 */

/**
 * Site configuration registry
 */
export const SITES = {
  'redacted.sh': {
    id: 'red',
    name: 'Redacted',
    domain: 'redacted.sh',
    selectors: {
      // Download link in torrent row
      downloadLink: 'a.button_dl',
      // Auth key patterns
      authKeyPattern: /auth=([a-f0-9]+)/,
      authKeyVarPattern: /authkey\s*=\s*["']([a-f0-9]+)["']/,
      // Torrent pass pattern
      torrentPassPattern: /passkey=([a-f0-9]+)/,
      // Group row ID pattern
      groupIdPattern: /group_(\d+)/,
      // Quality link in torrent row - RED has it inside td with torrentid link
      qualityLink: 'td a[href*="torrentid="]',
      // Stat cells
      statCells: 'td.number_column',
      // Group info container
      groupInfo: '.group_info',
      // Artist links
      artistLinks: 'a[href*="artist.php"]',
      // Album link
      albumLink: 'a[href*="torrents.php?id="]',
      // Cover image
      coverImg: '.group_image img',
      // Tags container
      tagsDiv: '.tags',
      // Collage header table
      collageHeaderTable: 'table.collage_table',
      // Collage link
      collageLink: 'a[href*="collage.php?id="]',
      // Catchup link
      catchupLink: 'a[href*="action=catchup_collages"]',
      // Torrent table
      torrentTable: 'table.torrent_table',
      // Group row
      groupRow: 'tr.group',
      // Edition row class
      editionClass: 'edition',
      // Torrent row class pattern
      torrentRowClass: 'groupid_',
      // Edition info cell
      editionInfoCell: '.edition_info',
    },
    // How to extract quality text from torrent row
    qualityExtraction: {
      // Method: 'selector' uses a CSS selector, 'regex' uses regex on row text
      method: 'selector',
      // For 'selector' method: CSS selector to find quality link
      selector: 'td a[href*="torrentid="]',
      // Links to exclude (short action links)
      excludePattern: null, // RED doesn't have this issue
    },
    // URL patterns
    urls: {
      subscribed: '/userhistory.php?action=subscribed_collages',
      catchup: '/userhistory.php?action=catchup_collages',
    },
  },
  
  'orpheus.network': {
    id: 'ops',
    name: 'Orpheus',
    domain: 'orpheus.network',
    selectors: {
      // Download link in torrent row - OPS uses tooltip class with title="Download"
      downloadLink: 'a[title="Download"]',
      // Auth key patterns
      authKeyPattern: /auth=([a-zA-Z0-9_-]+)/,
      authKeyVarPattern: /authkey\s*=\s*["']([a-zA-Z0-9_-]+)["']/,
      // Torrent pass pattern
      torrentPassPattern: /torrent_pass=([a-zA-Z0-9]+)/,
      // Group row ID pattern
      groupIdPattern: /group_(\d+)/,
      // Quality link in torrent row - not used for OPS, see qualityExtraction
      qualityLink: null,
      // Stat cells
      statCells: 'td.number_column',
      // Group info container
      groupInfo: '.group_info',
      // Artist links
      artistLinks: 'a[href*="artist.php"]',
      // Album link
      albumLink: 'a[href*="torrents.php?id="]',
      // Cover image
      coverImg: '.group_image img',
      // Tags container
      tagsDiv: '.tags',
      // Collage header table - OPS uses subscribed-collages-table
      collageHeaderTable: 'table.subscribed-collages-table',
      // Collage link
      collageLink: 'a[href*="collages.php?id="]',
      // Catchup link
      catchupLink: 'a[href*="action=catchup_collages"]',
      // Torrent table - OPS uses both torrent_table and m_table
      torrentTable: 'table.torrent_table',
      // Group row
      groupRow: 'tr.group',
      // Edition row class
      editionClass: 'edition',
      // Torrent row class pattern
      torrentRowClass: 'groupid_',
      // Edition info cell
      editionInfoCell: '.edition_info',
    },
    // How to extract quality text from torrent row
    qualityExtraction: {
      // Method: 'selector' uses a CSS selector, 'regex' uses regex on row text
      method: 'regex',
      // For 'regex' method: Pattern to extract quality from row text
      // OPS format: "▶ [Vinyl / FLAC / 24bit Lossless]"
      pattern: /▶\s*\[([^\]]+)\]/,
      // Fallback pattern if first doesn't match
      fallbackPattern: /\[((?:CD|WEB|Vinyl|SACD|DVD|Blu-ray|Cassette|DAT|Soundboard)\s*\/\s*(?:FLAC|MP3)[^\]]*)\]/,
    },
    // URL patterns
    urls: {
      subscribed: '/userhistory.php?action=subscribed_collages',
      catchup: '/userhistory.php?action=catchup_collages',
    },
  },
};

/**
 * Get the current site configuration based on hostname
 * @returns {Object|null} Site configuration or null if not supported
 */
export function getCurrentSite() {
  const hostname = window.location.hostname;
  return SITES[hostname] || null;
}

/**
 * Check if current site is supported
 * @returns {boolean}
 */
export function isSupportedSite() {
  return getCurrentSite() !== null;
}

/**
 * Get site name for display
 * @returns {string}
 */
export function getSiteName() {
  const site = getCurrentSite();
  return site?.name || 'Unknown';
}
