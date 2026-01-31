import styles from '../styles.module.css';
import { profileManager } from '../profileManager';
import { testClient, detectClient } from '../clientUtils';

/**
 * Profile Form Component - Form for editing profile settings
 * Uses a unique formKey to force re-render when profile data changes
 */
function ProfileForm({ profile, shadow, onSave, onDelete, formKey }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: profile.id,
      name: form.profileName.value,
      host: form.host.value,
      username: form.username.value,
      password: form.password.value,
      client: form.client.value,
      saveLocation: form.saveLocation.value,
      category: form.category?.value || '',
    };
    onSave(data);
  };

  const handleTest = async () => {
    const form = shadow.querySelector('#profile-form');
    const result = await testClient(
      form.host.value,
      form.username.value,
      form.password.value,
      form.client.value
    );
    alert(result ? '✅ Connection successful!' : '❌ Connection failed!');
  };

  const handleAutoDetect = async () => {
    const form = shadow.querySelector('#profile-form');
    const clientType = await detectClient(form.host.value);
    if (clientType !== 'unknown') {
      form.client.value = clientType;
      alert(`Detected: ${clientType}`);
    } else {
      alert('Could not auto-detect client type');
    }
  };

  // Using defaultValue with a unique key forces full re-render on profile change
  return (
    <form id="profile-form" key={formKey} className={styles['profile-form']} onSubmit={handleSubmit}>
      <div className={styles['control-group']}>
        <label>Profile Name</label>
        <input type="text" name="profileName" value={profile.name || ''} oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={styles['control-group']}>
        <label>Client Type</label>
        <select name="client">
          <option value="none" selected={profile.client === 'none' || !profile.client}>None (disabled)</option>
          <option value="qbit" selected={profile.client === 'qbit'}>qBittorrent</option>
          <option value="trans" selected={profile.client === 'trans'}>Transmission</option>
          <option value="deluge" selected={profile.client === 'deluge'}>Deluge</option>
          <option value="flood" selected={profile.client === 'flood'}>Flood</option>
          <option value="rutorrent" selected={profile.client === 'rutorrent'}>ruTorrent</option>
        </select>
      </div>
      
      <div className={`${styles['control-group']} ${styles['profile-form-full']}`}>
        <label>Host URL</label>
        <input type="text" name="host" value={profile.host || ''} placeholder="http://localhost:8080" oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={styles['control-group']}>
        <label>Username</label>
        <input type="text" name="username" value={profile.username || ''} oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={styles['control-group']}>
        <label>Password</label>
        <input type="password" name="password" value={profile.password || ''} oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={styles['control-group']}>
        <label>Save Location</label>
        <input type="text" name="saveLocation" value={profile.saveLocation || ''} placeholder="/downloads" oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={styles['control-group']}>
        <label>Category (qBit only)</label>
        <input type="text" name="category" value={profile.category || ''} oninput={(e) => e.target.value = e.target.value} />
      </div>
      
      <div className={`${styles['modal-actions']} ${styles['profile-form-full']}`} style="border: none; padding-top: 8px;">
        <button type="button" className={styles['btn']} onclick={handleAutoDetect}>
          Auto-Detect
        </button>
        <button type="button" className={styles['btn']} onclick={handleTest}>
          Test Connection
        </button>
        {profile.id !== 0 && (
          <button type="button" className={`${styles['btn']} ${styles['btn-danger']}`} onclick={() => onDelete(profile.id)}>
            Delete
          </button>
        )}
        <button type="submit" className={`${styles['btn']} ${styles['btn-primary']}`}>
          Save Profile
        </button>
      </div>
    </form>
  );
}

/**
 * Profile Selector Component - Dropdown and form for profile management
 */
export function ProfileSelector({ shadow, onProfileChange }) {
  const profiles = profileManager.getProfiles();
  const selectedProfile = profileManager.selectedProfile;
  
  // DEBUG
  console.log('ProfileSelector render:');
  console.log('  profiles:', profiles);
  console.log('  selectedProfile:', selectedProfile);
  console.log('  selectedProfile.name:', selectedProfile?.name);
  console.log('  selectedProfile.client:', selectedProfile?.client);
  console.log('  selectedProfile.host:', selectedProfile?.host);
  
  // Generate a unique form key using timestamp to force re-render
  const formKey = `${selectedProfile?.id ?? 0}-${Date.now()}`;

  const handleProfileSelect = (e) => {
    const profileId = Number(e.target.value);
    console.log('handleProfileSelect:', profileId);
    if (profileId === -1) {
      // Create new profile
      const newProfile = profileManager.createProfile({});
      profileManager.addProfile(newProfile);
      profileManager.setSelectedProfile(newProfile.id);
    } else {
      profileManager.setSelectedProfile(profileId);
    }
    onProfileChange();
  };

  const handleSave = async (data) => {
    console.log('handleSave - form data:', data);
    const profile = profileManager.createProfile(data);
    console.log('handleSave - created profile:', profile);
    profileManager.setProfile(profile);
    console.log('handleSave - after setProfile, selectedProfile:', profileManager.selectedProfile);
    // setProfile already updates selectedProfile, no need to call setSelectedProfile
    await profileManager.save();
    console.log('handleSave - after save, selectedProfile:', profileManager.selectedProfile);
    alert('Profile saved!');
    onProfileChange();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    profileManager.removeProfile(id);
    if (profiles.length > 0) {
      profileManager.setSelectedProfile(profiles[0].id);
    }
    await profileManager.save();
    onProfileChange();
  };

  return (
    <div className={styles['profile-section']}>
      <div className={styles['profile-header']}>
        <span className={styles['profile-title']}>🔧 Client Profile</span>
        <select 
          className={styles['control-group']}
          value={selectedProfile?.id ?? ''}
          onChange={handleProfileSelect}
          style="margin: 0; padding: 6px 12px;"
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value={-1}>+ New Profile</option>
        </select>
      </div>
      
      {selectedProfile && (
        <ProfileForm
          key={formKey}
          formKey={formKey}
          profile={selectedProfile}
          shadow={shadow}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
