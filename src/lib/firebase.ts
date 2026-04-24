import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// User provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZalEvnT8dEf7102FggXWCRbBbyygWN2s",
  authDomain: "eduattend-8ea2f.firebaseapp.com",
  projectId: "eduattend-8ea2f",
  storageBucket: "eduattend-8ea2f.firebasestorage.app",
  messagingSenderId: "103662469325",
  appId: "1:103662469325:web:2387d02458c084bc3a6984",
  measurementId: "G-CY8TBTNJJB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    } else {
      console.warn("Connection test completed (this is normal if the 'test/connection' doc doesn't exist yet).");
    }
  }
}
testConnection();
