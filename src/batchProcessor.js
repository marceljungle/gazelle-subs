import { filterTorrentByQuality, catchupCollage, MediaTypes } from './collageParser';
import { profileManager } from './profileManager';

/**
 * Batch processor for adding torrents to client
 */
export class BatchProcessor {
  constructor() {
    this.logs = [];
    this.progress = 0;
    this.total = 0;
    this.current = '';
    this.onUpdate = null;
    this.isProcessing = false;
    this.delay = 500; // Delay between requests in ms
  }

  /**
   * Add a log entry
   * @param {string} message - Log message
   * @param {string} type - Log type (success, error, warning)
   */
  log(message, type = 'info') {
    this.logs.unshift({ message, type, time: new Date() });
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs.pop();
    }
    this.emitUpdate();
  }

  /**
   * Emit update to listeners
   */
  emitUpdate() {
    if (this.onUpdate) {
      this.onUpdate({
        logs: this.logs,
        progress: this.progress,
        total: this.total,
        current: this.current,
        isProcessing: this.isProcessing,
      });
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process selected groups and add torrents to client
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Results summary
   */
  async process({
    collages,
    selectedGroups,
    quality,
    media = MediaTypes.ANY,
    preferMostSeeded,
    preferMostSnatched,
    collageCatchupFlags = {},
    authKey,
  }) {
    this.isProcessing = true;
    this.logs = [];
    this.progress = 0;
    
    const results = {
      success: [],
      failed: [],
      skipped: [],
      catchedUp: [],
    };

    // Check if profile is configured
    const profile = profileManager.selectedProfile;
    if (!profile || profile.client === 'none') {
      this.log('❌ No torrent client profile configured!', 'error');
      this.isProcessing = false;
      this.emitUpdate();
      return results;
    }

    // Gather all groups to process
    const groupsToProcess = [];
    const collagesWithSelectedGroups = new Map();

    for (const collage of collages) {
      const collageSelectedGroups = [];
      for (const group of collage.groups) {
        if (selectedGroups.has(group.id)) {
          groupsToProcess.push({ group, collage });
          collageSelectedGroups.push(group);
        }
      }
      if (collageSelectedGroups.length > 0) {
        collagesWithSelectedGroups.set(collage.id, {
          collage,
          groups: collageSelectedGroups,
        });
      }
    }

    this.total = groupsToProcess.length;
    this.log(`🚀 Starting batch process for ${this.total} releases...`, 'info');
    this.emitUpdate();

    // Process each group
    for (const { group, collage } of groupsToProcess) {
      this.current = `${group.artistDisplay} - ${group.album}`;
      this.emitUpdate();

      // Find the best torrent based on quality and media preferences
      const torrent = filterTorrentByQuality(
        group.torrents,
        quality,
        media,
        preferMostSeeded,
        preferMostSnatched
      );

      if (!torrent) {
        const filterInfo = media !== MediaTypes.ANY ? `quality: ${quality}, media: ${media}` : `quality: ${quality}`;
        this.log(`⚠️ No matching torrent for: ${this.current} (${filterInfo})`, 'warning');
        results.skipped.push({
          group,
          reason: `No torrent matching ${filterInfo}`,
        });
        this.progress++;
        this.emitUpdate();
        continue;
      }

      // Already snatched/seeding - optional skip
      if (torrent.isSeeding) {
        this.log(`ℹ️ Already seeding: ${this.current}`, 'info');
        results.skipped.push({
          group,
          reason: 'Already seeding',
        });
        this.progress++;
        this.emitUpdate();
        continue;
      }

      try {
        // Add torrent to client
        this.log(`📥 Adding: ${this.current} (${torrent.quality})`, 'info');
        await profile.addTorrent(torrent.downloadUrl);
        
        this.log(`✅ Added: ${this.current}`, 'success');
        results.success.push({ group, torrent });

        // Small delay between requests
        await this.sleep(this.delay);
      } catch (error) {
        this.log(`❌ Failed: ${this.current} - ${error.message}`, 'error');
        results.failed.push({
          group,
          torrent,
          error: error.message,
        });
      }

      this.progress++;
      this.emitUpdate();
    }

    // Handle catch-up for collages with catchup flag enabled
    const collagesToCatchup = collages.filter(c => collageCatchupFlags[c.id]);
    
    if (collagesToCatchup.length > 0 && authKey) {
      this.log('🧹 Clearing notifications for selected collages...', 'info');
      
      for (const collage of collagesToCatchup) {
        try {
          await catchupCollage(collage.id, authKey);
          this.log(`✅ Cleared notifications for: ${collage.name}`, 'success');
          results.catchedUp.push(collage);
          await this.sleep(300);
        } catch (error) {
          this.log(`❌ Failed to clear: ${collage.name}`, 'error');
        }
      }
    }

    // Summary
    this.log('', 'info');
    this.log('═══════════════════════════════════════', 'info');
    this.log(`📊 Summary:`, 'info');
    this.log(`   ✅ Success: ${results.success.length}`, 'success');
    this.log(`   ⚠️ Skipped: ${results.skipped.length}`, 'warning');
    this.log(`   ❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'error' : 'info');
    if (results.catchedUp.length > 0) {
      this.log(`   🧹 Cleared: ${results.catchedUp.length} collage(s)`, 'success');
    }
    this.log('═══════════════════════════════════════', 'info');

    this.current = 'Done!';
    this.isProcessing = false;
    this.emitUpdate();

    return results;
  }

  /**
   * Reset the processor state
   */
  reset() {
    this.logs = [];
    this.progress = 0;
    this.total = 0;
    this.current = '';
    this.isProcessing = false;
    this.emitUpdate();
  }
}

// Singleton instance
export const batchProcessor = new BatchProcessor();
