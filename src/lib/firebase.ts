import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export async function sendFirebasePasswordReset(email: string) {
  return sendPasswordResetEmail(firebaseAuth, email);
}

export async function signInWithFirebase(email: string, pass: string) {
  return signInWithEmailAndPassword(firebaseAuth, email, pass);
}

export { firebaseSignOut };
