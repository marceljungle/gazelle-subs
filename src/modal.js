import styles, { stylesheet } from './styles.module.css';
import { parseSubscribedCollages, QualityTypes, MediaTypes } from './collageParser';
import { profileManager } from './profileManager';
import { batchProcessor } from './batchProcessor';
import { CollagesList } from './components/CollageItem';
import { ProfileSelector } from './components/ProfileSelector';
import { ControlsPanel } from './components/FilterControls';
import { ProgressBar, StatsBar, ActionButtons, LoadingSpinner } from './components/ProgressBar';

/**
 * Main Modal Component - The primary UI for GazelleSubs
 */
function ModalContent({ panel, data, onClose }) {
  // State management
  let state = {
    collages: data.collages.map(c => ({ ...c, catchup: false })), // Add catchup flag to each collage (off by default)
    selectedGroups: new Set(),
    quality: QualityTypes.FLAC,
    media: MediaTypes.ANY,
    preferMostSeeded: false,
    preferMostSnatched: false,
    activeTab: 'collages',
    processingState: {
      logs: [],
      progress: 0,
      total: 0,
      current: '',
      isProcessing: false,
    },
  };

  const shadow = panel.root;

  // Helper to re-render
  const rerender = () => {
    const content = shadow.querySelector('[data-modal-content]');
    if (content) {
      content.innerHTML = '';
      content.appendChild(VM.m(renderContent()));
    }
  };

  // Toggle group selection
  const toggleGroup = (groupId) => {
    if (state.selectedGroups.has(groupId)) {
      state.selectedGroups.delete(groupId);
    } else {
      state.selectedGroups.add(groupId);
    }
    rerender();
  };

  // Toggle all groups in a collage
  const toggleCollage = (collageId, selected) => {
    const collage = state.collages.find(c => c.id === collageId);
    if (!collage) return;
    
    for (const group of collage.groups) {
      if (selected) {
        state.selectedGroups.add(group.id);
      } else {
        state.selectedGroups.delete(group.id);
      }
    }
    rerender();
  };

  // Toggle collage expansion
  const toggleExpand = (collageId) => {
    const collage = state.collages.find(c => c.id === collageId);
    if (collage) {
      collage.expanded = !collage.expanded;
    }
    rerender();
  };

  // Check if all are selected (or at least most - handles duplicate group IDs)
  const isAllSelected = () => {
    const totalGroups = state.collages.reduce((sum, c) => sum + c.groups.length, 0);
    // Use a threshold approach since some groups might have duplicate IDs
    // If we've selected more than 90% of the counted groups, consider it "all selected"
    const result = totalGroups > 0 && state.selectedGroups.size >= totalGroups * 0.9;
    console.log('isAllSelected - totalGroups:', totalGroups, 'selectedGroups.size:', state.selectedGroups.size, 'result:', result);
    return result;
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    const shouldSelect = !isAllSelected();
    console.log('toggleSelectAll - shouldSelect:', shouldSelect);
    if (shouldSelect) {
      for (const collage of state.collages) {
        for (const group of collage.groups) {
          state.selectedGroups.add(group.id);
        }
      }
    } else {
      state.selectedGroups.clear();
    }
    console.log('selectedGroups size:', state.selectedGroups.size);
    rerender();
  };

  // Toggle catchup for a specific collage
  const toggleCatchup = (collageId) => {
    const collage = state.collages.find(c => c.id === collageId);
    if (collage) {
      collage.catchup = !collage.catchup;
    }
    rerender();
  };

  // Toggle all catchup flags
  const toggleAllCatchup = () => {
    const allClearing = state.collages.every(c => c.catchup);
    for (const collage of state.collages) {
      collage.catchup = !allClearing;
    }
    rerender();
  };

  // Check if all collages have catchup enabled
  const isAllClearing = () => state.collages.length > 0 && state.collages.every(c => c.catchup);

  // Handle profile change
  const handleProfileChange = () => {
    rerender();
  };

  // Handle add to client
  const handleAddToClient = async () => {
    if (state.selectedGroups.size === 0) {
      alert('Please select at least one release to add.');
      return;
    }

    if (!profileManager.selectedProfile || profileManager.selectedProfile.client === 'none') {
      alert('Please configure a torrent client profile first.');
      state.activeTab = 'settings';
      rerender();
      return;
    }

    // Setup progress updates
    batchProcessor.onUpdate = (processingState) => {
      state.processingState = processingState;
      rerender();
    };

    // Build catchup flags from collage state
    const collageCatchupFlags = {};
    for (const collage of state.collages) {
      if (collage.catchup) {
        collageCatchupFlags[collage.id] = true;
      }
    }

    await batchProcessor.process({
      collages: state.collages,
      selectedGroups: state.selectedGroups,
      quality: state.quality,
      media: state.media,
      preferMostSeeded: state.preferMostSeeded,
      preferMostSnatched: state.preferMostSnatched,
      collageCatchupFlags,
      authKey: data.authKey,
    });
  };

  // Tab navigation
  const setActiveTab = (tab) => {
    console.log('setActiveTab called with:', tab);
    state.activeTab = tab;
    rerender();
  };

  // Render tab content
  const renderTabContent = () => {
    if (state.activeTab === 'settings') {
      return (
        <ProfileSelector 
          shadow={shadow}
          onProfileChange={handleProfileChange}
        />
      );
    }

    return (
      <>
        <ControlsPanel
          quality={state.quality}
          onQualityChange={(v) => { state.quality = v; rerender(); }}
          media={state.media}
          onMediaChange={(v) => { state.media = v; rerender(); }}
          preferMostSeeded={state.preferMostSeeded}
          preferMostSnatched={state.preferMostSnatched}
          onMostSeededChange={(v) => { state.preferMostSeeded = v; rerender(); }}
          onMostSnatchedChange={(v) => { state.preferMostSnatched = v; rerender(); }}
          allSelected={isAllSelected()}
          onSelectAllToggle={toggleSelectAll}
          allClearing={isAllClearing()}
          onClearAllToggle={toggleAllCatchup}
        />
        
        <StatsBar
          totalCollages={state.collages.length}
          selectedGroups={state.selectedGroups.size}
          totalTorrents={state.collages.reduce(
            (sum, c) => sum + c.groups.reduce((gSum, g) => gSum + g.torrents.length, 0),
            0
          )}
        />

        <ProgressBar
          progress={state.processingState.progress}
          total={state.processingState.total}
          current={state.processingState.current}
          logs={state.processingState.logs}
        />
        
        <div className={styles['collages-container']}>
          <CollagesList
            collages={state.collages}
            selectedGroups={state.selectedGroups}
            onToggleCollage={toggleCollage}
            onToggleGroup={toggleGroup}
            onToggleExpand={toggleExpand}
            onToggleCatchup={toggleCatchup}
          />
        </div>
      </>
    );
  };

  const renderContent = () => (
    <>
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${state.activeTab === 'collages' ? styles.active : ''}`}
          onclick={() => setActiveTab('collages')}
        >
          📚 Collages
        </button>
        <button 
          className={`${styles.tab} ${state.activeTab === 'settings' ? styles.active : ''}`}
          onclick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {renderTabContent()}
      
      <ActionButtons
        onAdd={handleAddToClient}
        onCancel={onClose}
        disabled={state.selectedGroups.size === 0 || state.activeTab === 'settings'}
        isProcessing={state.processingState.isProcessing}
      />
    </>
  );

  return (
    <div className={styles['modal-wrapper']}>
      <div className={styles['modal-title']}>
        🎵 GazelleSubs - {data.siteName}
      </div>
      <div className={styles['modal-content']} data-modal-content>
        {renderContent()}
      </div>
    </div>
  );
}

/**
 * Open the main modal
 */
export function openModal() {
  // Parse the page data
  const data = parseSubscribedCollages();
  
  if (data.collages.length === 0) {
    alert('No new additions found in your subscribed collages!');
    return;
  }

  // Create the panel
  const panel = VM.getPanel({
    theme: 'dark',
    shadow: true,
    style: stylesheet,
  });

  const closeModal = () => {
    panel.hide();
    document.body.style.overflow = 'auto';
    batchProcessor.reset();
  };

  // Set content
  panel.setContent(
    <ModalContent panel={panel} data={data} onClose={closeModal} />
  );
  
  panel.setMovable(false);
  
  // Show modal
  panel.show();
  document.body.style.overflow = 'hidden';

  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape' && !batchProcessor.isProcessing) {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Create the trigger button on the page
 */
export function createTriggerButton(newCount) {
  const existing = document.querySelector('.gazelle-subs-trigger');
  if (existing) {
    existing.remove();
  }

  const button = document.createElement('button');
  button.className = 'gazelle-subs-trigger';
  button.innerHTML = `
    🎵 Batch Download
    ${newCount > 0 ? `<span class="trigger-badge">${newCount}</span>` : ''}
  `;
  button.onclick = openModal;

  // Add styles for the button (outside shadow DOM)
  GM_addStyle(`
    .gazelle-subs-trigger {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .gazelle-subs-trigger:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
    .trigger-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }
  `);

  document.body.appendChild(button);
}
