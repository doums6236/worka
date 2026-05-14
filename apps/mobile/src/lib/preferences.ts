import * as SecureStore from 'expo-secure-store';

const SEEN_WELCOME_KEY = 'worka.seenWelcome';

export const preferences = {
  async hasSeenWelcome(): Promise<boolean> {
    const v = await SecureStore.getItemAsync(SEEN_WELCOME_KEY);
    return v === '1';
  },
  async markWelcomeSeen(): Promise<void> {
    await SecureStore.setItemAsync(SEEN_WELCOME_KEY, '1');
  },
  async resetWelcome(): Promise<void> {
    await SecureStore.deleteItemAsync(SEEN_WELCOME_KEY);
  },
};
