import { testClient, addTorrent, getCategories } from './clientUtils';

/**
 * Profile class representing a torrent client configuration
 */
class Profile {
  constructor(
    id,
    name,
    host,
    username,
    password,
    client,
    saveLocation,
    category
  ) {
    this.id = id;
    this.name = name;
    this.host = host;
    this.username = username;
    this.password = password;
    this.client = client;
    this.saveLocation = saveLocation;
    this.category = category;
  }

  /**
   * Get available categories from the torrent client
   * @returns {Promise<string[]>} List of category names
   */
  async getCategories() {
    if (this.client !== 'qbit') return [];
    return await getCategories(this.host, this.username, this.password);
  }

  /**
   * Test connection to the torrent client
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    return await testClient(
      this.host,
      this.username,
      this.password,
      this.client
    );
  }

  /**
   * Add a torrent to this profile's client
   * @param {string} torrentUri - Torrent download URL
   * @returns {Promise<boolean>} True if added successfully
   */
  async addTorrent(torrentUri) {
    return await addTorrent(
      torrentUri,
      this.host,
      this.username,
      this.password,
      this.client,
      this.saveLocation,
      this.category
    );
  }

  /**
   * Serialize profile for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      username: this.username,
      password: this.password,
      client: this.client,
      saveLocation: this.saveLocation,
      category: this.category,
    };
  }
}

/**
 * Profile Manager - handles storage and retrieval of profiles
 */
export const profileManager = {
  profiles: [],
  selectedProfile: null,

  /**
   * Add a new profile
   * @param {Profile} profile - Profile to add
   */
  addProfile(profile) {
    this.profiles.push(profile);
  },

  /**
   * Remove a profile by ID
   * @param {number} id - Profile ID to remove
   */
  removeProfile(id) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
  },

  /**
   * Get a profile by ID
   * @param {number} id - Profile ID
   * @returns {Profile} The profile or a new empty profile
   */
  getProfile(id) {
    return (
      this.profiles.find((p) => Number(p.id) === Number(id)) ??
      new Profile(id, 'New Profile', '', '', '', 'none', '', '')
    );
  },

  /**
   * Get all profiles
   * @returns {Profile[]} List of all profiles
   */
  getProfiles() {
    return this.profiles;
  },

  /**
   * Set the currently selected profile
   * @param {number} id - Profile ID to select
   */
  setSelectedProfile(id) {
    this.selectedProfile = this.getProfile(id);
    window.dispatchEvent(
      new CustomEvent('profileChanged', { detail: this.selectedProfile })
    );
  },

  /**
   * Update or add a profile
   * @param {Profile} profile - Profile to set
   */
  setProfile(profile) {
    const existingIndex = this.profiles.findIndex((p) => Number(p.id) === Number(profile.id));
    if (existingIndex === -1) {
      this.profiles.push(profile);
    } else {
      this.profiles[existingIndex] = profile;
    }
    // Also update selectedProfile if it's the same profile
    if (this.selectedProfile && Number(this.selectedProfile.id) === Number(profile.id)) {
      this.selectedProfile = profile;
    }
  },

  /**
   * Get the next available profile ID
   * @returns {number} Next available ID
   */
  getNextId() {
    if (this.profiles.length === 0) return 0;
    return (
      Math.max(...this.profiles.map((p) => Number(p.id))) + 1
    );
  },

  /**
   * Save profiles to storage
   */
  async save() {
    await GM.setValue('gazellesubs_profiles', JSON.stringify(this.profiles));
    if (this.selectedProfile) {
      await GM.setValue('gazellesubs_selectedProfile', this.selectedProfile.id);
    }
  },

  /**
   * Load profiles from storage
   */
  async load() {
    const profilesData = await GM.getValue('gazellesubs_profiles');
    if (profilesData) {
      this.profiles = JSON.parse(profilesData).map(
        (p) =>
          new Profile(
            p.id,
            p.name,
            p.host,
            p.username,
            p.password,
            p.client,
            p.saveLocation,
            p.category ?? ''
          )
      );
    }

    const selectedId = await GM.getValue('gazellesubs_selectedProfile');
    if (selectedId !== undefined && this.profiles.length > 0) {
      this.selectedProfile = this.getProfile(Number(selectedId));
    } else if (this.profiles.length > 0) {
      this.selectedProfile = this.profiles[0];
    } else {
      // Create a default profile if none exist
      this.selectedProfile = new Profile(0, 'New Profile', '', '', '', 'none', '', '');
    }
  },

  /**
   * Create a new Profile instance
   * @param {Object} data - Profile data
   * @returns {Profile} New profile instance
   */
  createProfile(data) {
    return new Profile(
      data.id ?? this.getNextId(),
      data.name ?? 'New Profile',
      data.host ?? '',
      data.username ?? '',
      data.password ?? '',
      data.client ?? 'none',
      data.saveLocation ?? '',
      data.category ?? ''
    );
  },
};
