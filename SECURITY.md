# EngMaster AI - Chính sách Bảo mật & Hướng dẫn An toàn

Dự án này được thiết kế với các tiêu chuẩn bảo mật cao để bảo vệ dữ liệu người dùng và mã nguồn. Dưới đây là các biện pháp bảo mật hiện tại và hướng dẫn dành cho nhà phát triển.

## 1. Bảo mật Mã nguồn (Source Code)
- **Biến môi trường (.env):** Tuyệt đối KHÔNG commit các file `.env` chứa API Key lên GitHub. Chúng tôi đã cấu hình `.gitignore` để ngăn chặn điều này.
- **Firebase Config:** File `firebase-applet-config.json` chứa các thông tin kết nối Firebase. Khi đẩy lên GitHub công khai, bạn nên sử dụng biến môi trường (Environment Variables) trong Vercel thay vì để file này trực tiếp.

## 2. Bảo mật Dữ liệu (Firestore Rules)
Hệ thống sử dụng **Firestore Security Rules** cấp độ chuyên gia:
- **Nguyên tắc "Chủ sở hữu":** Chỉ người tạo ra dữ liệu (Flashcards, Tiến độ thử thách) mới có quyền Đọc/Ghi dữ liệu của chính mình thông qua UID.
- **Xác thực Email:** Quyền Admin chỉ được cấp cho các email đã được xác thực (`email_verified == true`).
- **Phân tách vùng:** Thông tin cá nhân người dùng được bảo vệ nghiêm ngặt, ngăn chặn việc quét dữ liệu (Data Scraping) trái phép.

## 3. Bảo mật AI (Gemini API)
- **API Key Hidden:** Key Gemini được quản lý thông qua server-side secrets hoặc biến môi trường bảo mật trên Cloud Run/Vercel.
- **Rate Limiting:** Khuyến nghị cấu hình Rate Limiting trên API Gateway để ngăn chặn tấn công từ chối dịch vụ (DoS).

## 4. Hướng dẫn đối với Hacker/Researcher
Nếu bạn phát hiện bất kỳ lỗ hổng bảo mật nào, vui lòng liên hệ trực tiếp với chúng tôi qua email: `nguyenvandat170296@gmail.com`. Chúng tôi trân trọng mọi đóng góp để cải thiện hệ thống.

---
*EngMaster AI - Luôn đặt sự an toàn của người học lên hàng đầu.*
