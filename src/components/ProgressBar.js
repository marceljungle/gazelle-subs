import styles from '../styles.module.css';

export function ProgressBar({ progress, total, current, logs }) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className={`${styles['progress-container']} ${total > 0 ? styles.visible : ''}`}>
      <div className={styles['progress-bar-wrapper']}>
        <div 
          className={styles['progress-bar']} 
          style={`width: ${percentage}%`}
        />
      </div>
      <div className={styles['progress-text']}>
        {current ? `${current} • ` : ''}{progress} / {total} ({percentage}%)
      </div>
      {logs && logs.length > 0 && (
        <div className={styles['progress-log']}>
          {logs.map((log, i) => (
            <div 
              key={i} 
              className={`${styles['progress-log-entry']} ${styles[log.type] || ''}`}
            >
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatsBar({ totalCollages, selectedGroups, totalTorrents }) {
  return (
    <div className={styles['stats-bar']}>
      <div className={styles['stat-item']}>
        <span>📁 Collages:</span>
        <span className={styles['stat-value']}>{totalCollages}</span>
      </div>
      <div className={styles['stat-item']}>
        <span>✅ Selected:</span>
        <span className={styles['stat-value']}>{selectedGroups}</span>
      </div>
      <div className={styles['stat-item']}>
        <span>🎵 Total Torrents:</span>
        <span className={styles['stat-value']}>{totalTorrents}</span>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return <div className={styles['loading-spinner']} />;
}

export function ActionButtons({ onAdd, onCancel, disabled, isProcessing }) {
  return (
    <div className={styles['modal-actions']}>
      <button 
        className={`${styles.btn} ${styles['btn-secondary']}`} 
        onclick={onCancel}
        disabled={isProcessing}
      >
        Cancel
      </button>
      <button 
        className={`${styles.btn} ${styles['btn-primary']}`}
        onclick={onAdd}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? 'Processing...' : '🚀 Add to Client'}
      </button>
    </div>
  );
}
