import { testClient, addTorrent, getCategories } from './clientUtils';

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

  async getCategories() {
    if (this.client !== 'qbit') return [];
    return await getCategories(this.host, this.username, this.password);
  }

  async testConnection() {
    return await testClient(
      this.host,
      this.username,
      this.password,
      this.client
    );
  }

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

export const profileManager = {
  profiles: [],
  selectedProfile: null,
  apiTokens: {},
  collageWidgetEnabled: false,

  addProfile(profile) {
    this.profiles.push(profile);
  },

  removeProfile(id) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
  },

  getProfile(id) {
    return (
      this.profiles.find((p) => Number(p.id) === Number(id)) ??
      new Profile(id, 'New Profile', '', '', '', 'none', '', '')
    );
  },

  getProfiles() {
    return this.profiles;
  },

  setSelectedProfile(id) {
    this.selectedProfile = this.getProfile(id);
    window.dispatchEvent(
      new CustomEvent('profileChanged', { detail: this.selectedProfile })
    );
  },

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

  getNextId() {
    if (this.profiles.length === 0) return 0;
    return (
      Math.max(...this.profiles.map((p) => Number(p.id))) + 1
    );
  },

  async save() {
    await GM.setValue('gazellesubs_profiles', JSON.stringify(this.profiles));
    if (this.selectedProfile) {
      await GM.setValue('gazellesubs_selectedProfile', this.selectedProfile.id);
    }
    await GM.setValue('gazellesubs_apiTokens', JSON.stringify(this.apiTokens));
    await GM.setValue('gazellesubs_collageWidget', this.collageWidgetEnabled);
  },

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

    // Load additional settings
    const tokensData = await GM.getValue('gazellesubs_apiTokens');
    if (tokensData) {
      try { this.apiTokens = JSON.parse(tokensData); } catch { this.apiTokens = {}; }
    }
    const widgetEnabled = await GM.getValue('gazellesubs_collageWidget');
    this.collageWidgetEnabled = widgetEnabled === true;
  },

  getApiToken(siteId) {
    return this.apiTokens[siteId] || '';
  },

  setApiToken(siteId, token) {
    this.apiTokens[siteId] = token;
  },

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
