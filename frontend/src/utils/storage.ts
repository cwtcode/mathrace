export interface PlayerProfile {
  totalPoints: number;
  unlockedCharacters: string[];
  currentCharacter: string;
  level: number;
}

export const CHARACTERS = [
  { id: 'rabbit', name: 'Rabbit', unlockCost: 0, icon: '🐇' },
  { id: 'turtle', name: 'Turtle', unlockCost: 500, icon: '🐢' },
  { id: 'cat', name: 'Cat', unlockCost: 1000, icon: '🐱' },
  { id: 'dog', name: 'Dog', unlockCost: 2000, icon: '🐶' },
  { id: 'lion', name: 'Lion', unlockCost: 5000, icon: '🦁' },
  { id: 'dragon', name: 'Dragon', unlockCost: 10000, icon: '🐲' },
];

const STORAGE_KEY = 'math_racers_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  totalPoints: 0,
  unlockedCharacters: ['rabbit'],
  currentCharacter: 'rabbit',
  level: 1,
};

export const getProfile = (): PlayerProfile => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_PROFILE;
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_PROFILE;
  }
};

export const saveProfile = (profile: PlayerProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const addPoints = (points: number): { newTotal: number; newUnlocks: string[] } => {
  const profile = getProfile();
  profile.totalPoints += points;
  
  // Check for new unlocks based on total points
  const newUnlocks: string[] = [];
  CHARACTERS.forEach(char => {
    if (profile.totalPoints >= char.unlockCost && !profile.unlockedCharacters.includes(char.id)) {
      profile.unlockedCharacters.push(char.id);
      newUnlocks.push(char.name);
    }
  });
  
  saveProfile(profile);
  return { newTotal: profile.totalPoints, newUnlocks };
};
