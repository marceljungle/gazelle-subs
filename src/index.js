import { profileManager } from './profileManager';
import { parseSubscribedCollages } from './collageParser';
import { openModal, createTriggerButton } from './modal';
import { isSupportedSite, getSiteName } from './sites';

/**
 * GazelleSubs - Batch download subscribed collages from Gazelle-based trackers
 * 
 * Main entry point for the userscript
 */

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

  // Load saved profiles
  await profileManager.load();
  console.log('[GazelleSubs] Profiles loaded:', profileManager.profiles.length);

  // Only run on subscribed collages page
  if (!isSubscribedCollagesPage()) {
    console.log('[GazelleSubs] Not on subscribed collages page, skipping...');
    return;
  }

  console.log(`[GazelleSubs] On ${siteName} subscribed collages page, setting up UI...`);

  // Parse page to get count
  const data = parseSubscribedCollages();
  const totalNewItems = data.collages.reduce((sum, c) => sum + c.groups.length, 0);
  
  console.log(`[GazelleSubs] Found ${data.collages.length} collages with ${totalNewItems} new releases`);

  // Create trigger button
  createTriggerButton(totalNewItems);

  // Register menu command
  GM.registerMenuCommand('🎵 Open Batch Download', openModal);
}

// Run initialization
init().catch(err => {
  console.error('[GazelleSubs] Initialization failed:', err);
});
