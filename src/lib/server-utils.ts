import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Export as functions to ensure initialization happens inside the handler if needed
// and to catch errors more gracefully.

export function getFirebaseAdmin() {
  let db: Firestore | null = null;
  let auth: Auth | null = null;
  let error: string | null = null;


  try {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!saKey) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing.");
    }

    let serviceAccount: any;
    
    // 1. Handle if it's already an object (rare but possible in some runtimes)
    if (typeof saKey === 'object') {
      serviceAccount = saKey;
    } else {
      const trimmedKey = saKey.trim();
      
      // 2. Handle double quoting or literal string issues
      try {
        serviceAccount = JSON.parse(trimmedKey);
      } catch (e1) {
        // Try cleaning surrounding quotes if it's a stringified JSON inside a string
        const cleaned = trimmedKey.replace(/^['"]|['"]$/g, '');
        try {
          serviceAccount = JSON.parse(cleaned);
        } catch (e2) {
          throw new Error(`Failed to parse Service Account JSON. Ensure it starts with '{'. First 20 chars: ${trimmedKey.substring(0, 20)}`);
        }
      }
    }

    // 3. Fix Private Key formatting
    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // 4. Initialize Firebase Admin
    let app: App;
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("[FIREBASE] Admin SDK Initialized for project:", serviceAccount.project_id);
    } else {
      app = getApp();
    }

    
    // 5. Connect to Firestore (Supporting custom Database ID)
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID;
    if (databaseId && databaseId !== "(default)") {
      db = getFirestore(app, databaseId);
      console.log("[FIREBASE] Using custom database:", databaseId);
    } else {
      db = getFirestore(app);
    }
    
    auth = getAuth(app);

  } catch (e: any) {
    console.error("[FIREBASE] Initialization Error:", e.message);
    error = e.message;
  }

  return { db, auth, error };
}

export function getNodemailer() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, ''); // Remove spaces from App Password
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  
  // Note: secure: true is only for port 465. For 587 it should be false (STARTTLS).
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

