import express from "express";
import { getFirebaseAdmin, getNodemailer } from "../src/lib/server-utils";

const app = express();
app.use(express.json());

// API Routes
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  
  const { db, error } = getFirebaseAdmin();
  if (!db) {
    return res.status(500).json({ 
      error: "Firebase Admin Initialization Failed", 
      details: error,
      hint: "Check if FIREBASE_SERVICE_ACCOUNT_KEY is correctly set in Vercel Env Vars."
    });
  }

  try {
    const userDocs = await db.collection("users").where("email", "==", email).get();
    if (userDocs.empty) {
      return res.status(404).json({ error: "Email không tồn tại trong hệ thống." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("verificationCodes").doc(email).set({ otp, expiresAt, email });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = getNodemailer();
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
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Mã này có hiệu lực trong 10 phút.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      res.json({ message: "OTP sent successfully" });
    } else {
      res.json({ message: "OTP sent to console (Dev Mode)", dev: true, otp });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const { db, error } = getFirebaseAdmin();
  if (!db) return res.status(500).json({ error: "Server misconfigured", details: error });

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
  const { db, auth, error } = getFirebaseAdmin();
  if (!db || !auth) return res.status(500).json({ error: "Server misconfigured", details: error });

  try {
    const otpDoc = await db.collection("verificationCodes").doc(email).get();
    if (!otpDoc.exists || otpDoc.data()?.otp !== otp) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ." });
    }

    const userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { password: newPassword });
    await db.collection("verificationCodes").doc(email).delete();
    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
