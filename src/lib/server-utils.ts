import admin from "firebase-admin";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Export as functions to ensure initialization happens inside the handler if needed
// and to catch errors more gracefully.

export function getFirebaseAdmin() {
  let db: admin.firestore.Firestore | null = null;
  let auth: admin.auth.Auth | null = null;
  let error: string | null = null;

  try {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!saKey) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.");
    }

    console.log(`[AUTH] SaKey detected, length: ${saKey.length} characters.`);

    if (!saKey.trim().startsWith('{')) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY must be the FULL JSON CONTENT (starting with '{'), not just the email or ID.");
    }

    let serviceAccount;
    try {
      // 1. Try direct parse
      serviceAccount = JSON.parse(saKey);
    } catch (e1) {
      try {
        // 2. Try cleaning quotes (common Vercel issue)
        const cleaned = saKey.trim().replace(/^['"]|['"]$/g, '');
        serviceAccount = JSON.parse(cleaned);
      } catch (e2) {
        throw new Error(`JSON Parse Error: ${saKey.substring(0, 20)}... is not a valid JSON. Check for hidden characters or improper quoting.`);
      }
    }

    // 3. Fix Private Key formatting - Handle literal \n, escaped \\n, and actual newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\n/g, '\n')
        .replace(/\n/g, '\n'); // Ensure it stays as newline
    }

    // 4. Initialize or reuse
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    db = admin.firestore();
    auth = admin.auth();
  } catch (e: any) {
    console.error("Firebase Admin Error:", e.message);
    error = e.message;
  }

  return { db, auth, error };
}

export function getNodemailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}
