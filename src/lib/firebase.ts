import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is public by design — access control lives in Firestore
// Security Rules (firestore.rules), not in hiding these values.
const firebaseConfig = {
  apiKey: 'AIzaSyDozjOtr-CBhvEa_XB2ewpt7nyJC4Ed_oA',
  authDomain: 'expense-tracker-5acdb.firebaseapp.com',
  projectId: 'expense-tracker-5acdb',
  storageBucket: 'expense-tracker-5acdb.firebasestorage.app',
  messagingSenderId: '835548937115',
  appId: '1:835548937115:web:69091210701313121bff3e',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
