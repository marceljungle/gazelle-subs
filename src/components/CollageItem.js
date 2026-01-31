import styles from '../styles.module.css';

/**
 * Group Item Component - Displays a single torrent group
 */
export function GroupItem({ group, onToggle, isSelected }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onToggle(group.id);
  };

  const qualitySummary = group.torrents
    .map(t => t.quality.split(' / ')[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

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
          Available: {qualitySummary}
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
        />
      ))}
    </>
  );
}
