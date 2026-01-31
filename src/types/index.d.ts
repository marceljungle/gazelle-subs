// Type declarations for CSS modules
declare module '*.module.css' {
  const styles: { [className: string]: string };
  export const stylesheet: string;
  export default styles;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// Collage types
interface Torrent {
  id: string;
  downloadUrl: string;
  quality: string;
  qualityType: string;
  size: string;
  snatches: number;
  seeders: number;
  leechers: number;
  isSnatched: boolean;
  isSeeding: boolean;
}

interface TorrentGroup {
  id: string;
  fullId: string;
  artists: string[];
  artistDisplay: string;
  album: string;
  albumUrl: string;
  year: string;
  coverUrl: string;
  tags: string[];
  addedOn: string;
  torrents: Torrent[];
  selected: boolean;
}

interface Collage {
  id: string;
  name: string;
  url: string;
  newCount: number;
  catchupUrl: string;
  groups: TorrentGroup[];
  selected: boolean;
  expanded: boolean;
}

interface ParsedData {
  authKey: string | null;
  torrentPass: string | null;
  collages: Collage[];
  totalCollages: number;
  totalGroups: number;
  totalTorrents: number;
}

// Profile types
interface ProfileData {
  id: number;
  name: string;
  host: string;
  username: string;
  password: string;
  client: 'none' | 'qbit' | 'trans' | 'deluge' | 'flood' | 'rutorrent';
  saveLocation: string;
  category: string;
}

// Processing types
interface ProcessingResult {
  success: Array<{ group: TorrentGroup; torrent: Torrent }>;
  failed: Array<{ group: TorrentGroup; torrent: Torrent; error: string }>;
  skipped: Array<{ group: TorrentGroup; reason: string }>;
  catchedUp: Collage[];
}

interface ProcessingState {
  logs: Array<{ message: string; type: string; time: Date }>;
  progress: number;
  total: number;
  current: string;
  isProcessing: boolean;
}
