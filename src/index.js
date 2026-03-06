import { profileManager } from './profileManager';
import { parseSubscribedCollages } from './collageParser';
import { openModal, createTriggerButton, openCollageViewModal, createCollageViewButton, openSettingsDialog, openArtistModal, createArtistButton } from './modal';
import { isCollageViewPage, getCollageIdFromUrl } from './collageApi';
import { isArtistPage } from './artistParser';
import { isSupportedSite, getSiteName } from './sites';

// Check if we're on the subscribed collages page
function isSubscribedCollagesPage() {
  return location.href.includes('userhistory.php') && 
         location.href.includes('action=subscribed_collages');
}

// Initialize the application
async function init() {
  const siteName = getSiteName();
  console.log(`[GazelleSubs] Initializing on ${siteName}...`);

  // Check if current site is supported
  if (!isSupportedSite()) {
    console.log('[GazelleSubs] Unsupported site, skipping...');
    return;
  }

  // Load saved profiles and settings
  await profileManager.load();
  console.log('[GazelleSubs] Profiles loaded:', profileManager.profiles.length);
  console.log('[GazelleSubs] Collage widget enabled:', profileManager.collageWidgetEnabled);

  // Always register the settings menu command
  GM.registerMenuCommand('⚙️ Collage Batch Download Settings', openSettingsDialog);

  // Subscribed collages page - original functionality
  if (isSubscribedCollagesPage()) {
    console.log(`[GazelleSubs] On ${siteName} subscribed collages page, setting up UI...`);

    // Parse page to get count
    const data = parseSubscribedCollages();
    const totalNewItems = data.collages.reduce((sum, c) => sum + c.groups.length, 0);
    
    console.log(`[GazelleSubs] Found ${data.collages.length} collages with ${totalNewItems} new releases`);

    // Create trigger button
    createTriggerButton(totalNewItems);

    // Register menu command
    GM.registerMenuCommand('🎵 Open Batch Download', openModal);
    return;
  }

  // Collage view page - new widget functionality
  if (isCollageViewPage() && profileManager.collageWidgetEnabled) {
    const collageId = getCollageIdFromUrl();
    if (!collageId) return;

    console.log(`[GazelleSubs] On ${siteName} collage page (id=${collageId}), setting up collage view widget...`);

    // Create the trigger button for collage view
    createCollageViewButton(collageId);

    // Register menu command for collage view
    GM.registerMenuCommand('🎵 Open Batch Download', () => openCollageViewModal(collageId));
    return;
  }

  // Artist page - batch download from artist discography
  if (isArtistPage()) {
    console.log(`[GazelleSubs] On ${siteName} artist page, setting up artist batch download...`);

    createArtistButton();
    GM.registerMenuCommand('🎵 Open Batch Download', openArtistModal);
    return;
  }

  console.log('[GazelleSubs] Not on a supported page, skipping UI setup.');
}

// Run initialization
init().catch(err => {
  console.error('[GazelleSubs] Initialization failed:', err);
});
