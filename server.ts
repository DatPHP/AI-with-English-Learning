import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Initialize Firebase Admin (Only if credentials provided)
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    auth = admin.auth();
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not found. Admin features disabled.");
  }
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// API Routes
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  if (!db) return res.status(500).json({ error: "Server misconfigured: Firebase Admin missing" });

  try {
    // Check if user exists
    const userDocs = await db.collection("users").where("email", "==", email).get();
    if (userDocs.empty) {
      return res.status(404).json({ error: "Email không tồn tại trong hệ thống." });
    }

    // Generate 4-digit code
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to Firestore
    await db.collection("verificationCodes").doc(email).set({
      otp,
      expiresAt,
      email
    });

    // Send Email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailOptions = {
        from: `"EngMaster AI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Mã xác thực đặt lại mật khẩu - EngMaster AI",
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">EngMaster AI</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác thực dưới đây:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      res.json({ message: "OTP sent successfully" });
    } else {
      console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
      res.json({ message: "OTP sent to console (Dev Mode)", dev: true, otp });
    }
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!db) return res.status(500).json({ error: "Server misconfigured" });

  try {
    const doc = await db.collection("verificationCodes").doc(email).get();
    if (!doc.exists) return res.status(400).json({ error: "Mã xác thực không hợp lệ hoặc đã hết hạn." });

    const data = doc.data();
    if (data?.otp !== otp || Date.now() > data?.expiresAt) {
      return res.status(400).json({ error: "Mã xác thực không chính xác hoặc đã hết hạn." });
    }

    res.json({ message: "OTP verified" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!db || !auth) return res.status(500).json({ error: "Server misconfigured" });

  try {
    // Re-verify OTP for security
    const otpDoc = await db.collection("verificationCodes").doc(email).get();
    if (!otpDoc.exists || otpDoc.data()?.otp !== otp) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ." });
    }

    // Find Firebase Auth User
    const userRecord = await auth.getUserByEmail(email);
    
    // Update Password
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });

    // Delete OTP
    await db.collection("verificationCodes").doc(email).delete();

    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
