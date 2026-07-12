/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPVwjULe-z_iMHCnzjATHWNdxp7t18BZ4",
  authDomain: "famous-minutia-cfs6l.firebaseapp.com",
  projectId: "famous-minutia-cfs6l",
  storageBucket: "famous-minutia-cfs6l.firebasestorage.app",
  messagingSenderId: "385532316852",
  appId: "1:385532316852:web:9ae55f22fabd6ce3d0dbe1"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore, using the custom database id provided in firebase-applet-config.json
export const db = getFirestore(app, "ai-studio-vendorsupplyandp-6edd7e4d-d22b-4cf3-b26d-2685f454b40c");
