import styles from '../styles.module.css';
import { QualityTypes, MediaTypes } from '../collageParser';

export function QualityFilter({ value, onChange }) {
  return (
    <div className={styles['control-group']}>
      <label>Quality Filter</label>
      <select onChange={(e) => onChange(e.target.value)}>
        <option value={QualityTypes.ANY} selected={value === QualityTypes.ANY}>Any Quality</option>
        <option value={QualityTypes.FLAC_24} selected={value === QualityTypes.FLAC_24}>FLAC 24bit Lossless</option>
        <option value={QualityTypes.FLAC} selected={value === QualityTypes.FLAC}>FLAC Lossless</option>
        <option value={QualityTypes.MP3_320} selected={value === QualityTypes.MP3_320}>MP3 320kbps</option>
        <option value={QualityTypes.MP3_V0} selected={value === QualityTypes.MP3_V0}>MP3 V0 (VBR)</option>
        <option value={QualityTypes.MP3_V2} selected={value === QualityTypes.MP3_V2}>MP3 V2 (VBR)</option>
      </select>
    </div>
  );
}

export function MediaFilter({ value, onChange }) {
  return (
    <div className={styles['control-group']}>
      <label>Media Source</label>
      <select onChange={(e) => onChange(e.target.value)}>
        <option value={MediaTypes.ANY} selected={value === MediaTypes.ANY}>Any Source</option>
        <option value={MediaTypes.CD} selected={value === MediaTypes.CD}>CD</option>
        <option value={MediaTypes.WEB} selected={value === MediaTypes.WEB}>WEB</option>
        <option value={MediaTypes.VINYL} selected={value === MediaTypes.VINYL}>Vinyl</option>
        <option value={MediaTypes.SACD} selected={value === MediaTypes.SACD}>SACD</option>
        <option value={MediaTypes.DVD} selected={value === MediaTypes.DVD}>DVD</option>
        <option value={MediaTypes.BLURAY} selected={value === MediaTypes.BLURAY}>Blu-ray</option>
        <option value={MediaTypes.CASSETTE} selected={value === MediaTypes.CASSETTE}>Cassette</option>
      </select>
    </div>
  );
}

export function PreferencesSelector({ 
  preferMostSeeded, 
  preferMostSnatched, 
  onMostSeededChange, 
  onMostSnatchedChange 
}) {
  return (
    <>
      <div className={styles['checkbox-group']}>
        <input
          type="checkbox"
          id="preferSeeded"
          checked={preferMostSeeded}
          onclick={(e) => {
            onMostSeededChange(e.target.checked);
            if (e.target.checked) onMostSnatchedChange(false);
          }}
        />
        <label htmlFor="preferSeeded">Prefer most seeded</label>
      </div>
      <div className={styles['checkbox-group']}>
        <input
          type="checkbox"
          id="preferSnatched"
          checked={preferMostSnatched}
          onclick={(e) => {
            onMostSnatchedChange(e.target.checked);
            if (e.target.checked) onMostSeededChange(false);
          }}
        />
        <label htmlFor="preferSnatched">Prefer most snatched</label>
      </div>
    </>
  );
}

export function SelectAllOption({ allSelected, onToggle }) {
  return (
    <div className={styles['checkbox-group']}>
      <input
        type="checkbox"
        id="selectAll"
        checked={allSelected}
        onclick={onToggle}
      />
      <label htmlFor="selectAll" style="font-weight: 600;">Select All</label>
    </div>
  );
}

export function ClearAllOption({ allClearing, onToggle }) {
  return (
    <div className={styles['checkbox-group']}>
      <input
        type="checkbox"
        id="clearAll"
        checked={allClearing}
        onclick={onToggle}
      />
      <label htmlFor="clearAll" style="font-weight: 600;">🧹 Clear All</label>
    </div>
  );
}

export function ControlsPanel({
  quality,
  onQualityChange,
  media,
  onMediaChange,
  preferMostSeeded,
  preferMostSnatched,
  onMostSeededChange,
  onMostSnatchedChange,
  allSelected,
  onSelectAllToggle,
  allClearing,
  onClearAllToggle,
  showCatchup = true,
}) {
  return (
    <div className={styles['modal-controls']}>
      <SelectAllOption allSelected={allSelected} onToggle={onSelectAllToggle} />
      {showCatchup && <ClearAllOption allClearing={allClearing} onToggle={onClearAllToggle} />}
      <QualityFilter value={quality} onChange={onQualityChange} />
      <MediaFilter value={media} onChange={onMediaChange} />
      <PreferencesSelector
        preferMostSeeded={preferMostSeeded}
        preferMostSnatched={preferMostSnatched}
        onMostSeededChange={onMostSeededChange}
        onMostSnatchedChange={onMostSnatchedChange}
      />
    </div>
  );
}
