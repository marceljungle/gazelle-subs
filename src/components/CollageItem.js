import styles from '../styles.module.css';

/**
 * Get unique quality formats from torrents (FLAC, MP3, etc.)
 */
function getUniqueQualities(torrents) {
  const qualities = new Set();
  for (const t of torrents) {
    const qualityType = t.qualityType || t.quality;
    if (qualityType) {
      // Extract just the format part (e.g., "FLAC / Lossless" -> "FLAC Lossless")
      const simplified = qualityType
        .replace('FLAC / 24bit Lossless', 'FLAC 24')
        .replace('FLAC / Lossless', 'FLAC')
        .replace('MP3 / 320', 'MP3 320')
        .replace('MP3 / V0 (VBR)', 'V0')
        .replace('MP3 / V2 (VBR)', 'V2');
      qualities.add(simplified);
    }
  }
  return Array.from(qualities);
}

/**
 * Get unique media sources from torrents (CD, WEB, Vinyl, etc.)
 */
function getUniqueSources(torrents) {
  const sources = new Set();
  for (const t of torrents) {
    if (t.mediaSource && t.mediaSource !== 'CD') {
      // Only show non-CD sources as CD is the default
      sources.add(t.mediaSource);
    } else if (t.mediaSource === 'CD') {
      sources.add('CD');
    }
  }
  return Array.from(sources);
}

/**
 * Group Item Component - Displays a single torrent group
 */
export function GroupItem({ group, onToggle, isSelected }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onToggle(group.id);
  };

  const qualities = getUniqueQualities(group.torrents);
  const sources = getUniqueSources(group.torrents);

  return (
    <div className={`${styles['group-item']} ${isSelected ? styles.selected : ''}`}>
      <input
        type="checkbox"
        className={styles['group-checkbox']}
        checked={isSelected}
        onclick={handleClick}
      />
      {group.coverUrl && (
        <img
          src={group.coverUrl}
          alt={group.album}
          className={styles['group-cover']}
          loading="lazy"
        />
      )}
      <div className={styles['group-info']}>
        <div className={styles['group-artist']}>{group.artistDisplay}</div>
        <div className={styles['group-album']}>{group.album}</div>
        <div className={styles['group-meta']}>
          {group.year} • {group.torrents.length} torrent{group.torrents.length > 1 ? 's' : ''}
        </div>
        <div className={styles['group-torrents']}>
          <span className={styles['group-qualities']}>🎵 {qualities.join(', ') || 'Unknown'}</span>
          {sources.length > 0 && (
            <span className={styles['group-sources']}> • 💿 {sources.join(', ')}</span>
          )}
        </div>
        {group.tags.length > 0 && (
          <div className={styles['group-tags']}>
            {group.tags.slice(0, 5).join(' • ')}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collage Item Component - Displays a collage with its groups
 */
export function CollageItem({ 
  collage, 
  selectedGroups, 
  onToggleCollage, 
  onToggleGroup, 
  onToggleExpand,
  onToggleCatchup,
  showCatchup = true,
}) {
  const isCollageSelected = collage.groups.every(g => selectedGroups.has(g.id));
  const isPartiallySelected = collage.groups.some(g => selectedGroups.has(g.id)) && !isCollageSelected;
  
  const handleCollageToggle = (e) => {
    e.stopPropagation();
    onToggleCollage(collage.id, !isCollageSelected);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    onToggleExpand(collage.id);
  };

  const handleCatchupToggle = (e) => {
    e.stopPropagation();
    onToggleCatchup(collage.id);
  };

  return (
    <div className={styles['collage-item']}>
      <div className={styles['collage-header']} onclick={handleExpandClick}>
        <input
          type="checkbox"
          className={styles['collage-checkbox']}
          checked={isCollageSelected}
          ref={(el) => el && (el.indeterminate = isPartiallySelected)}
          onclick={handleCollageToggle}
        />
        <div 
          className={`${styles['collage-expand']} ${collage.expanded ? styles.expanded : ''}`}
        >
          ▶
        </div>
        <span className={styles['collage-name']}>{collage.name}</span>
        <span className={styles['collage-count']}>
          {collage.groups.length} release{collage.groups.length > 1 ? 's' : ''}
        </span>
        {showCatchup && (
          <label 
            className={styles['collage-catchup']} 
            onclick={(e) => e.stopPropagation()}
            title="Clear notifications for this collage after adding"
          >
            <input
              type="checkbox"
              checked={collage.catchup !== false}
              onclick={handleCatchupToggle}
            />
            <span>🧹</span>
          </label>
        )}
      </div>
      <div className={`${styles['groups-container']} ${collage.expanded ? styles.expanded : ''}`}>
        {collage.groups.map(group => (
          <GroupItem
            key={group.id}
            group={group}
            isSelected={selectedGroups.has(group.id)}
            onToggle={onToggleGroup}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Collages List Component - Displays all collages
 */
export function CollagesList({ 
  collages, 
  selectedGroups, 
  onToggleCollage, 
  onToggleGroup, 
  onToggleExpand,
  onToggleCatchup,
  showCatchup = true,
}) {
  if (collages.length === 0) {
    return (
      <div className={styles['empty-state']}>
        <div className={styles['empty-state-icon']}>📭</div>
        <div>No new additions in your subscribed collages</div>
      </div>
    );
  }

  return (
    <>
      {collages.map(collage => (
        <CollageItem
          key={collage.id}
          collage={collage}
          selectedGroups={selectedGroups}
          onToggleCollage={onToggleCollage}
          onToggleGroup={onToggleGroup}
          onToggleExpand={onToggleExpand}
          onToggleCatchup={onToggleCatchup}
          showCatchup={showCatchup}
        />
      ))}
    </>
  );
}
