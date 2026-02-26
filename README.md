# eFootCup VN - Nền tảng quản lý giải đấu eFootball chuyên nghiệp

![eFootCup Banner](https://efootcup.efootball.vn/assets/efootball_bg.webp)

**eFootCup VN** là nền tảng trực tuyến giúp cộng đồng eFootball tại Việt Nam dễ dàng tổ chức, quản lý và tham gia các giải đấu từ nghiệp dư đến chuyên nghiệp. Với giao diện hiện đại mang phong cách Apple, hệ thống tự động hóa hầu hết các quy trình từ đăng ký, bốc thăm đến cập nhật kết quả.

## 🚀 Tính năng chính

### Dành cho Người quản lý (Manager)
- **Tạo giải đấu nhanh chóng**: Tùy chỉnh luật chơi, thể thức (Loại trực tiếp, Vòng tròn, Swiss...), giải thưởng.
- **Quản lý danh sách đăng ký**: Duyệt/từ chối VĐV với giao diện trực quan, cập nhật trạng thái thời gian thực.
- **Tự động hóa sơ đồ (Bracket)**: Tự động bốc thăm và tạo sơ đồ thi đấu theo nhiều thể thức khác nhau.
- **Xuất lịch thi đấu PDF**: Tải bản in chuyên nghiệp cho lịch thi đấu và bảng đấu.
- **Nhập liệu từ Excel**: Cho phép import nhanh danh sách VĐV từ file Excel.

### Dành cho Game thủ (User)
- **Hệ thống Profile**: Theo dõi lịch sử thi đấu, thứ hạng và các giải đấu đã tham gia.
- **Đăng ký tham gia dễ dàng**: Form đăng ký thông minh, tự động lưu thông tin cá nhân.
- **Theo dõi kết quả trực tiếp**: Xem sơ đồ thi đấu và bảng xếp hạng cập nhật liên tục.
- **Thông báo**: Nhận thông báo qua Email và Website khi giải đấu có thay đổi hoặc đến giờ thi đấu.

## 🛠 Công nghệ sử dụng

- **Frontend**: [Next.js 15+](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Backend**: Next.js API Routes (Serverless)
- **Database**: [MongoDB](https://www.mongodb.com/) với [Mongoose](https://mongoosejs.com/)
- **Xác thực**: [JWT (JSON Web Tokens)](https://jwt.io/) & [Bcryptjs](https://www.npmjs.com/package/bcryptjs)
- **Tiện ích**: 
  - [Lucide React](https://lucide.dev/) (Icons)
  - [XLSX](https://www.npmjs.com/package/xlsx) (Xử lý Excel)
  - [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html) (Xuất PDF)
  - [Nodemailer](https://nodemailer.com/) (Hệ thống Email)

## 📦 Cấu trúc dự án

```text
efootcup/
├── app/                  # Next.js App Router (Pages, API, Layouts)
│   ├── (auth)/           # Đăng ký, Đăng nhập
│   ├── (main)/           # Trang chủ, Giải đấu, BXH
│   ├── (manager)/        # Trang quản lý giải đấu dành cho BTC
│   └── api/              # Hệ thống API backend
├── components/           # UI Components (Shadcn, Custom)
├── contexts/             # AuthContext, ThemeContext
├── lib/                  # Tiện ích API, Auth, MongoDB client
├── models/               # Mongoose Schemas (Tournament, Registration, User...)
└── public/               # Assets (Images, Icons)
```

## ⚙️ Cài đặt và phát triển

1. **Clone repository:**
   ```bash
   git clone https://github.com/your-username/efootcup.git
   cd efootcup
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường (.env):**
   Tạo file `.env.local` và thêm các thông tin sau:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   NEXT_PUBLIC_APP_URL=https://efootcup.efootball.vn
   # Email Config
   EMAIL_USER=your_email
   EMAIL_PASS=your_app_password
   ```

4. **Chạy dự án ở chế độ phát triển:**
   ```bash
   npm run dev
   ```
   Truy cập `http://localhost:3000` để xem kết quả.

## 📈 SEO & Performance

- Sử dụng **Server Components** để tối ưu hóa việc cào dữ liệu của Search Engines.
- Metadata được tạo động dựa trên thông tin từng giải đấu.
- Hệ thống **Sitemap.xml** và **Robots.txt** tự động cập nhật.
- Tối ưu hóa hình ảnh với `next/image`.

---
Thiết kế và phát triển bởi Đội ngũ eFootCup VN.
