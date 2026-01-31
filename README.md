# GazelleSubs

A Tampermonkey/Greasemonkey userscript for batch downloading subscribed collages from Gazelle-based music trackers (like Redacted).

## Features

- 🎵 **Batch Download**: Download multiple releases from your subscribed collages at once
- 📁 **Collage Browser**: Visual modal to browse all new additions in your subscribed collages
- ✅ **Selective Download**: Select individual releases or entire collages
- 🎛️ **Quality Filtering**: Filter by quality (FLAC 24bit, FLAC, MP3 320, V0, V2)
- 📊 **Smart Selection**: Prefer most seeded or most snatched torrents
- 🧹 **Auto Cleanup**: Optionally clear collage notifications after downloading
- 📈 **Progress Tracking**: Real-time progress bar with detailed logs
- 🔧 **Multiple Profiles**: Support for multiple torrent client configurations

## Supported Torrent Clients

- qBittorrent
- Transmission
- Deluge
- Flood
- ruTorrent

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Firefox/Edge) or [Greasemonkey](https://www.greasespot.net/) (Firefox)
2. Install the userscript from the dist folder: `GazelleSubs.user.js`

## Usage

1. Navigate to your subscribed collages page: `https://redacted.sh/userhistory.php?action=subscribed_collages`
2. Click the "🎵 Batch Download" button in the bottom-right corner
3. Configure your torrent client in the Settings tab (first time only)
4. Select the releases you want to download
5. Choose your quality preferences
6. Click "Add to Client"

## Configuration

### Setting up a Profile

1. Open the modal and go to the Settings tab
2. Enter your torrent client details:
   - **Profile Name**: A friendly name for this configuration
   - **Client Type**: Select your torrent client
   - **Host URL**: The URL of your torrent client (e.g., `http://localhost:8080`)
   - **Username/Password**: Your client credentials
   - **Save Location**: Default download path (optional)
   - **Category**: Category for qBittorrent (optional)
3. Click "Test Connection" to verify
4. Click "Save Profile"

## Building from Source

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build
```

The built userscript will be in the `dist` folder.

## Project Structure

```
gazelle-subs/
├── src/
│   ├── index.js              # Entry point
│   ├── meta.js               # Userscript metadata
│   ├── modal.js              # Main modal component
│   ├── collageParser.js      # HTML parser for collages
│   ├── profileManager.js     # Profile storage & management
│   ├── clientUtils.js        # Torrent client API implementations
│   ├── batchProcessor.js     # Batch download processor
│   ├── XFetch.js             # HTTP request wrapper
│   ├── styles.module.css     # Modal styles
│   └── components/
│       ├── CollageItem.js    # Collage & group components
│       ├── FilterControls.js # Quality & preference selectors
│       ├── ProfileSelector.js # Profile form component
│       └── ProgressBar.js    # Progress & stats components
├── package.json
├── rollup.conf.js
└── README.md
```

## License

MIT
