import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('nlink_cached_google_access_token') : null;
let cachedUser: User | null = null;
let tokenExpiryTime: number = typeof window !== 'undefined' ? Number(localStorage.getItem('nlink_cached_google_token_expiry') || '0') : 0;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    
    // Validate cached token
    const token = getAccessToken();
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google OAuth access token from Firebase authentication');
    }

    cachedAccessToken = credential.accessToken;
    // Expire in 1 hour (3600 seconds), save with safe margin of 5 minutes
    tokenExpiryTime = Date.now() + 3600 * 1000;
    cachedUser = result.user;

    localStorage.setItem('nlink_cached_google_access_token', cachedAccessToken);
    localStorage.setItem('nlink_cached_google_token_expiry', String(tokenExpiryTime));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) return null;
  
  // Check if token has expired or is close to expiring (within 2 minutes)
  const isExpired = Date.now() > (tokenExpiryTime - 120000);
  if (isExpired) {
    console.warn('[Google Auth] Access token has expired or is about to expire.');
    // Clear expired tokens
    localStorage.removeItem('nlink_cached_google_access_token');
    localStorage.removeItem('nlink_cached_google_token_expiry');
    cachedAccessToken = null;
    tokenExpiryTime = 0;
    return null;
  }
  
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  tokenExpiryTime = 0;
  localStorage.removeItem('nlink_cached_google_access_token');
  localStorage.removeItem('nlink_cached_google_token_expiry');
};
