# EngMaster AI - Học Tiếng Anh Thông Minh

Ứng dụng học tiếng Anh tích hợp AI, hỗ trợ Voice (ElevenLabs), Shadowing, Flashcards, và Thử thách 30 ngày.

## Tính năng mới cập nhật

### 1. Shadowing Pro (Kỹ thuật "Cái bóng")
- Hỗ trợ luyện nói theo từng câu trong các chủ đề (Tech Impact, Education Future).
- Sử dụng giọng AI chất lượng cao từ **ElevenLabs** để đọc mẫu.
- Cho phép người dùng ghi âm (Record) và nghe lại giọng của mình.
- Tính năng **So sánh với AI**: Phát lồng ghép giọng AI và giọng người dùng để nhận biết sự khác biệt về ngữ điệu.

### 2. ElevenLabs Integration
- Tích hợp API ElevenLabs để phát âm giọng đọc tự nhiên (Natural-sounding voices).
- Proxy server-side bảo mật API Key.
- Fallback thông minh sang giọng đọc trình duyệt (SpeechSynthesis) nếu API lỗi hoặc hết quota.

### 3. Cải thiện UI/UX
- Loại bỏ thông tin tài khoản mặc định trên màn hình đăng nhập để bảo mật và tinh gọn.
- Tối ưu hóa SpeakButton cho phép nghe lại ở mọi nơi (Vocabulary, Flashcards, Chat).

## Cấu hình (Environment Variables)

Xem file `.env.example` để biết các biến cần thiết:
- `ELEVENLABS_API_KEY`: API Key từ ElevenLabs.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Cấu hình Firebase Admin.
- `SMTP_USER` / `SMTP_PASS`: Cấu hình gửi mail OTP.

## Cách đồng bộ với GitHub

Để đồng bộ code mới nhất lên trang GitHub của bạn:
1. Mở menu **Settings** hoặc **Share** trong AI Studio.
2. Chọn **Export to GitHub**.
3. Chọn Repository mục tiêu và thực hiện Push.

---
Phát triển bởi EngMaster AI Team.
