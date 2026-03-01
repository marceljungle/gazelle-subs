import styles, { stylesheet } from './styles.module.css';
import { parseSubscribedCollages, QualityTypes, MediaTypes } from './collageParser';
import { profileManager } from './profileManager';
import { batchProcessor } from './batchProcessor';
import { fetchCollageFromApi } from './collageApi';
import { CollagesList } from './components/CollageItem';
import { ProfileSelector } from './components/ProfileSelector';
import { ControlsPanel } from './components/FilterControls';
import { ProgressBar, StatsBar, ActionButtons, LoadingSpinner } from './components/ProgressBar';

function ModalContent({ panel, data, onClose }) {
  const showCatchup = data.totalCollages > 1 || !!data.collages[0]?.catchupUrl;
  // State management
  let state = {
    collages: data.collages.map(c => ({ ...c, catchup: false })), // Add catchup flag to each collage (off by default)
    selectedGroups: new Set(),
    quality: QualityTypes.ANY,
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

  // Helper to re-render (preserves scroll position)
  const rerender = () => {
    const content = shadow.querySelector('[data-modal-content]');
    if (content) {
      // Save scroll position of the collages container before re-render
      const collagesContainer = content.querySelector(`.${styles['collages-container']}`);
      const scrollTop = collagesContainer ? collagesContainer.scrollTop : 0;

      content.innerHTML = '';
      content.appendChild(VM.m(renderContent()));

      // Restore scroll position after re-render
      if (scrollTop > 0) {
        const newContainer = content.querySelector(`.${styles['collages-container']}`);
        if (newContainer) {
          newContainer.scrollTop = scrollTop;
        }
      }
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

  // Check if all are selected (compare unique group IDs since same release can be in multiple collages)
  const isAllSelected = () => {
    const uniqueGroupIds = new Set();
    for (const collage of state.collages) {
      for (const group of collage.groups) {
        uniqueGroupIds.add(group.id);
      }
    }
    const totalUniqueGroups = uniqueGroupIds.size;
    const result = totalUniqueGroups > 0 && state.selectedGroups.size === totalUniqueGroups;
    console.log('isAllSelected - uniqueGroups:', totalUniqueGroups, 'selectedGroups.size:', state.selectedGroups.size, 'result:', result);
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
          showCatchup={showCatchup}
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
            showCatchup={showCatchup}
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
      left: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
      color: #e0e0e0;
      border: 1px solid #444;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .gazelle-subs-trigger:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      border-color: #666;
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

export async function openCollageViewModal(collageId) {
  // Create the panel immediately to show loading state
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

  // Show loading state
  panel.setContent(
    <div className={styles['modal-wrapper']}>
      <div className={styles['modal-title']}>
        🎵 GazelleSubs - Loading...
      </div>
      <div className={styles['modal-content']} style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
        <LoadingSpinner />
        <span style="margin-left: 12px; color: #888;">Fetching collage data from API...</span>
      </div>
    </div>
  );

  panel.setMovable(false);
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

  try {
    // Fetch data from API
    const data = await fetchCollageFromApi(collageId);

    if (!data.collages.length || data.collages[0].groups.length === 0) {
      panel.setContent(
        <div className={styles['modal-wrapper']}>
          <div className={styles['modal-title']}>
            🎵 GazelleSubs
          </div>
          <div className={styles['modal-content']} style="text-align: center; padding: 40px;">
            <p style="color: #888;">No torrent groups found in this collage.</p>
            <button className={`${styles.btn} ${styles['btn-secondary']}`} onclick={closeModal}>
              Close
            </button>
          </div>
        </div>
      );
      return;
    }

    // Set actual content using the same ModalContent component
    panel.setContent(
      <ModalContent panel={panel} data={data} onClose={closeModal} />
    );
  } catch (error) {
    console.error('[GazelleSubs] API fetch failed:', error);
    panel.setContent(
      <div className={styles['modal-wrapper']}>
        <div className={styles['modal-title']}>
          🎵 GazelleSubs - Error
        </div>
        <div className={styles['modal-content']} style="text-align: center; padding: 40px;">
          <p style="color: #ef4444;">Failed to fetch collage data.</p>
          <p style="color: #888; font-size: 13px;">{error.message}</p>
          <p style="color: #888; font-size: 12px; margin-top: 8px;">
            Configure your API token via the GazelleSubs Settings menu
            (click the extension icon → GazelleSubs → ⚙️ Settings).
          </p>
          <button className={`${styles.btn} ${styles['btn-secondary']}`} onclick={closeModal} style="margin-top: 16px;">
            Close
          </button>
        </div>
      </div>
    );
  }
}

export function createCollageViewButton(collageId, collageName) {
  const existing = document.querySelector('.gazelle-subs-trigger');
  if (existing) {
    existing.remove();
  }

  const button = document.createElement('button');
  button.className = 'gazelle-subs-trigger gazelle-subs-trigger--left';
  button.innerHTML = '🎵 Batch Download';
  button.onclick = () => openCollageViewModal(collageId);

  // Add styles for the button (outside shadow DOM) - left-positioned for collage pages
  GM_addStyle(`
    .gazelle-subs-trigger--left {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
      color: #e0e0e0;
      border: 1px solid #444;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .gazelle-subs-trigger--left:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      border-color: #666;
    }
  `);

  document.body.appendChild(button);
}

export function openSettingsDialog() {
  const panel = VM.getPanel({
    theme: 'dark',
    shadow: true,
    style: stylesheet,
  });

  const shadow = panel.root;

  const closeDialog = () => {
    panel.hide();
    document.body.style.overflow = 'auto';
  };

  const rerender = () => {
    const content = shadow.querySelector('[data-settings-content]');
    if (content) {
      content.innerHTML = '';
      content.appendChild(VM.m(renderSettings()));
    }
  };

  const handleWidgetToggle = async (e) => {
    profileManager.collageWidgetEnabled = e.target.checked;
    await profileManager.save();
  };

  const handleTokenSave = async (siteId) => {
    const input = shadow.querySelector(`[data-token-input="${siteId}"]`);
    if (input) {
      profileManager.setApiToken(siteId, input.value);
      await profileManager.save();
      alert(`API token saved for ${siteId === 'red' ? 'Redacted' : 'Orpheus'}!`);
    }
  };

  const renderSettings = () => (
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div className={styles['profile-section']}>
        <div className={styles['profile-header']}>
          <span className={styles['profile-title']}>Collage View Widget</span>
        </div>
        <div className={styles['profile-form']}>
          <div className={`${styles['checkbox-group']} ${styles['profile-form-full']}`}>
            <input
              type="checkbox"
              id="settingsWidgetEnabled"
              checked={profileManager.collageWidgetEnabled}
              onclick={handleWidgetToggle}
            />
            <label htmlFor="settingsWidgetEnabled">
              Enable batch download button on collage pages
            </label>
          </div>
        </div>
      </div>

      <div className={styles['profile-section']}>
        <div className={styles['profile-header']}>
          <span className={styles['profile-title']}>API Tokens</span>
        </div>
        <div className={styles['profile-form']}>
          <div className={`${styles['control-group']} ${styles['profile-form-full']}`}>
            <label>Redacted (redacted.sh)</label>
            <div style="display: flex; gap: 8px;">
              <input
                type="password"
                data-token-input="red"
                value={profileManager.getApiToken('red')}
                placeholder="Paste your RED API token"
                style="flex: 1;"
                oninput={(e) => e.target.value = e.target.value}
              />
              <button
                type="button"
                className={`${styles['btn']} ${styles['btn-primary']}`}
                style="white-space: nowrap;"
                onclick={() => handleTokenSave('red')}
              >
                Save
              </button>
            </div>
          </div>
          <div className={`${styles['control-group']} ${styles['profile-form-full']}`}>
            <label>Orpheus (orpheus.network)</label>
            <div style="display: flex; gap: 8px;">
              <input
                type="password"
                data-token-input="ops"
                value={profileManager.getApiToken('ops')}
                placeholder="Paste your OPS API token"
                style="flex: 1;"
                oninput={(e) => e.target.value = e.target.value}
              />
              <button
                type="button"
                className={`${styles['btn']} ${styles['btn-primary']}`}
                style="white-space: nowrap;"
                onclick={() => handleTokenSave('ops')}
              >
                Save
              </button>
            </div>
          </div>
          <div className={styles['profile-form-full']} style="font-size: 12px; color: #888; padding: 0 4px;">
            Each site requires its own API token. Generate one in your profile settings on the site
            (Edit Profile → API Tokens → Create Token).
          </div>
        </div>
      </div>
    </div>
  );

  panel.setContent(
    <div className={styles['modal-wrapper']} style="max-width: 500px;">
      <div className={styles['modal-title']}>
        ⚙️ GazelleSubs Settings
      </div>
      <div className={styles['modal-content']} data-settings-content>
        {renderSettings()}
      </div>
      <div className={styles['modal-actions']}>
        <button className={`${styles.btn} ${styles['btn-secondary']}`} onclick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  );

  panel.setMovable(false);
  panel.show();
  document.body.style.overflow = 'hidden';

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}
