# GazelleSubs

Userscript for batch downloading subscribed collages from Gazelle-based music trackers.

Tested on Redacted and Orpheus using qBittorrent.

## Screenshots

| Batch Add | Settings |
|-----------|----------|
| ![Batch Add](docs/screenshots/batch_add.png) | ![Settings](docs/screenshots/settings.png) |

| Summary | Notification Catch Up |
|---------|----------------------|
| ![Summary](docs/screenshots/summary.png) | ![Notification Catch Up](docs/screenshots/notification_catch_up.png) |

| Group Info |
|---------|
| ![Group Info](docs/screenshots/group_info.png)|

## Features

- Batch download multiple releases from subscribed collages
- Browse and select individual releases or entire collages
- Filter by quality (FLAC 24bit, FLAC, MP3 320, V0, V2) and media source (CD, WEB, Vinyl, etc.)
- Prefer most seeded or most snatched torrents
- Clear collage notifications after downloading
- Multiple torrent client profiles

## Supported Torrent Clients

- qBittorrent
- Transmission
- Deluge
- Flood
- ruTorrent

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Install the userscript from the dist folder: `GazelleSubs.user.js`

## Usage

1. Navigate to your subscribed collages page
2. Click the "Batch Download" button in the bottom-right corner
3. Configure your torrent client in the Settings tab (first time only)
4. Select releases and quality preferences
5. Click "Add to Client"

## Building from Source

```bash
npm install
npm run build
```

The built userscript will be in the `dist` folder.

## Credits

The torrent client integration is based on [SendToClient](https://github.com/notmarek/SendToClient) by notmarek.

## License

MIT
