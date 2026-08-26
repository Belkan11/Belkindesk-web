import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserProfile, NewsCard } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEST_USERS_FILE = path.join(DATA_DIR, 'test_users.json');
const TEST_USERS_DIR = path.join(DATA_DIR, 'test_users');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TEST_USERS_DIR)) {
  fs.mkdirSync(TEST_USERS_DIR, { recursive: true });
}

export interface TestUserCredentials {
  id: string; // UUID
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
}

// Memory secret for signing session tokens (regenerates on startup, or uses stable key if configured)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Load test users from file
export function loadTestUsers(): Record<string, TestUserCredentials> {
  try {
    if (fs.existsSync(TEST_USERS_FILE)) {
      const data = fs.readFileSync(TEST_USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[TestAuth] Error loading test users:', err);
  }
  return {};
}

// Save test users to file
export function saveTestUsers(users: Record<string, TestUserCredentials>) {
  try {
    fs.writeFileSync(TEST_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TestAuth] Error saving test users:', err);
  }
}

// Generate secure signed session token
export function generateSessionToken(uuid: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days expiration
  const data = `${uuid}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(`${data}:${hmac}`).toString('base64');
}

// Verify signed session token
export function verifySessionToken(token: string): { uuid: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [uuid, expiresAtStr, hmac] = decoded.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (Date.now() > expiresAt) {
      return null;
    }
    
    const data = `${uuid}:${expiresAtStr}`;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    
    if (hmac === expectedHmac) {
      return { uuid };
    }
  } catch {}
  return null;
}

// Bootstrap administrator "Belkin"
export function bootstrapTestAdmin() {
  const users = loadTestUsers();
  const adminUsername = process.env.TEST_ADMIN_USERNAME || 'Belkin';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || '1511';

  const exists = Object.values(users).some(
    (u) => u.username.toLowerCase() === adminUsername.toLowerCase()
  );

  if (!exists) {
    const uuid = 'user-admin-belkin'; // Preserve stable admin UUID
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);

    users[uuid] = {
      id: uuid,
      username: adminUsername,
      email: 'belkin@med.ru',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    saveTestUsers(users);
    console.log(`[TestAuth] Bootstrapped test admin "${adminUsername}" with stable UUID ${uuid}`);
  }
}

// Get directory path for specific test user
export function getTestUserDir(uuid: string): string {
  const userDir = path.join(TEST_USERS_DIR, uuid);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

// Load test user profile
export function loadTestUserProfile(uuid: string, username: string, email?: string): UserProfile {
  const profileFile = path.join(getTestUserDir(uuid), 'profile.json');
  try {
    if (fs.existsSync(profileFile)) {
      const data = fs.readFileSync(profileFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[TestAuth] Error loading profile for ${uuid}:`, err);
  }

  // Fallback default profile matching application specifications
  const userEmail = email || `${username.toLowerCase()}@med.ru`;
  const displayName = username;
  const isAdmin = uuid === 'user-admin-belkin' || username.toLowerCase() === 'belkin';
  
  return {
    id: uuid,
    username,
    login: username,
    email: userEmail,
    displayName,
    role: isAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
    timers: [],
    feeds: [], // Will be populated with default feeds client-side or on sync
    bookmarks: [],
    workSchedules: {},
    accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
    appStyle: isAdmin ? 'medical' : 'engineer',
    customWallpaper: '',
    customAiPrompt: '',
    scheduledHours: [6, 12, 19],
  };
}

// Save test user profile
export function saveTestUserProfile(uuid: string, profile: UserProfile) {
  const profileFile = path.join(getTestUserDir(uuid), 'profile.json');
  try {
    fs.writeFileSync(profileFile, JSON.stringify(profile, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[TestAuth] Error saving profile for ${uuid}:`, err);
  }
}

// Load test user news cards
export function loadTestUserNewsCards(uuid: string): NewsCard[] {
  const cardsFile = path.join(getTestUserDir(uuid), 'news_cards.json');
  try {
    if (fs.existsSync(cardsFile)) {
      const data = fs.readFileSync(cardsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[TestAuth] Error loading news cards for ${uuid}:`, err);
  }
  return [];
}

// Save test user news cards
export function saveTestUserNewsCards(uuid: string, cards: NewsCard[]) {
  const cardsFile = path.join(getTestUserDir(uuid), 'news_cards.json');
  try {
    fs.writeFileSync(cardsFile, JSON.stringify(cards, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[TestAuth] Error saving news cards for ${uuid}:`, err);
  }
}
