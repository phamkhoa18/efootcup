# ⚽ EFV CUP VN — Nền Tảng Tổ Chức Giải Đấu eFootball

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

**Nền tảng tổ chức và quản lý giải đấu eFootball chuyên nghiệp hàng đầu Việt Nam.**

[Demo Live](https://efootball.vn) · [Báo Lỗi](https://github.com/phamkhoa18/efootcup/issues)

</div>

---

## 📋 Giới Thiệu

**EFV CUP VN** là nền tảng fullstack cho phép tổ chức, quản lý và theo dõi các giải đấu eFootball trực tuyến. Hệ thống hỗ trợ đầy đủ quy trình từ đăng ký, thanh toán, xếp lịch, nhánh thi đấu đến bảng xếp hạng điểm EFV.

### ✨ Tính Năng Chính

- 🏆 **Quản lý giải đấu** — Tạo, cấu hình, quản lý giải đấu với nhiều thể thức (loại trực tiếp, vòng tròn, Swiss...)
- 📊 **Sơ đồ thi đấu (Bracket)** — Bracket tự động với drag-to-scroll, tìm kiếm đối thủ, click xem thông tin VĐV
- 💰 **Thanh toán tự động** — Tích hợp PayOS cho thanh toán lệ phí qua mã VietQR tự động
- 👥 **Hệ thống VĐV** — Đăng ký, quản lý profile, hệ thống EFV-ID riêng biệt
- 🏅 **Bảng xếp hạng EFV** — Hệ thống điểm EFV 250/500/1000 với BXH tự động cập nhật
- 📝 **Quản lý bài viết** — Rich text editor (TipTap) cho tin tức, thể lệ
- 📱 **Responsive** — Tối ưu giao diện cho cả desktop và mobile
- 🔐 **Phân quyền** — 3 role: Admin, Manager (Quản lý giải), User

---

## 🛠 Tech Stack

| Layer | Công Nghệ |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **UI Components** | Shadcn/UI, Radix UI, Lucide Icons |
| **Database** | MongoDB + Mongoose 9 |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Payment** | PayOS (VietQR) |
| **Rich Editor** | TipTap |
| **Email** | Nodemailer |
| **Export** | jsPDF, xlsx |

---

## 📁 Cấu Trúc Dự Án

```
efootcup/
├── app/
│   ├── (main)/                # Trang công khai
│   │   ├── giai-dau/          # Danh sách & chi tiết giải đấu
│   │   ├── tin-tuc/           # Tin tức
│   │   ├── bxh/               # Bảng xếp hạng EFV
│   │   ├── trang-ca-nhan/     # Profile người dùng
│   │   └── xac-nhan-thanh-toan/ # Kết quả thanh toán
│   │
│   ├── (admin)/admin/         # Admin Dashboard
│   │   ├── giai-dau/          # Quản lý giải đấu
│   │   ├── nguoi-dung/        # Quản lý người dùng
│   │   ├── bai-viet/          # Quản lý bài viết
│   │   ├── danh-muc/          # Quản lý danh mục
│   │   ├── thanh-toan/        # Cấu hình thanh toán
│   │   ├── menu/              # Quản lý menu
│   │   └── cai-dat/           # Cài đặt hệ thống
│   │
│   ├── (manager)/manager/     # Manager Dashboard
│   │   ├── giai-dau/          # Quản lý giải đấu (bracket, kết quả, đăng ký...)
│   │   ├── tao-giai-dau/      # Tạo giải đấu mới
│   │   ├── vdv/               # Quản lý VĐV
│   │   ├── bxh/               # Quản lý BXH
│   │   └── thong-ke/          # Thống kê
│   │
│   ├── (auth)/                # Đăng nhập / Đăng ký
│   ├── api/                   # REST API Routes
│   └── globals.css            # Global styles & animations
│
├── components/
│   └── ui/                    # Shadcn UI components
│
├── contexts/                  # React Context (AuthContext)
├── hooks/                     # Custom hooks
├── lib/                       # Utilities, API client, DB connection
├── models/                    # Mongoose models
│   ├── Tournament.ts          # Giải đấu
│   ├── Match.ts               # Trận đấu
│   ├── Team.ts                # Đội
│   ├── Registration.ts        # Đăng ký
│   ├── User.ts                # Người dùng
│   ├── Bxh.ts                 # Bảng xếp hạng
│   ├── EfvPointLog.ts         # Lịch sử điểm EFV
│   ├── Post.ts                # Bài viết
│   ├── PaymentConfig.ts       # Cấu hình thanh toán
│   └── ...
├── public/assets/             # Ảnh, logo, banners
└── scripts/                   # Scripts hỗ trợ
```

---

## 🚀 Cài Đặt & Chạy

### Yêu Cầu

- **Node.js** >= 18
- **MongoDB** (local hoặc MongoDB Atlas)
- **npm** hoặc **yarn**

### 1. Clone repository

```bash
git clone https://github.com/phamkhoa18/efootcup.git
cd efootcup
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục gốc:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/efootcup

# JWT
JWT_SECRET=your_jwt_secret_key

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# PayOS (thanh toán)
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 4. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### 5. Build production

```bash
npm run build
npm start
```

---

## 🔑 Phân Quyền Hệ Thống

| Role | Đường dẫn | Quyền |
|------|-----------|-------|
| **Admin** | `/admin` | Toàn quyền: quản lý user, giải đấu, bài viết, cài đặt hệ thống |
| **Manager** | `/manager` | Tạo & quản lý giải đấu, cập nhật kết quả, duyệt đăng ký, quản lý BXH |
| **User** | `/` | Xem giải đấu, đăng ký thi đấu, thanh toán, xem BXH |

---

## 📸 Screenshots

### Trang chi tiết giải đấu
- Hero section sáng, gọn với thông tin giải đấu
- Tabs: Tổng quan, Sơ đồ thi đấu, Danh sách VĐV, Lịch thi đấu
- Stats: Số đội, Giải thưởng, Lệ phí

### Sơ đồ thi đấu (Bracket)
- Bracket visualization với drag-to-scroll
- Ô tìm kiếm đối thủ/đội
- Click vào VĐV để xem thông tin cá nhân
- Tên VĐV nổi bật, tên đội hiển thị phụ bên dưới

### Player Profile Dialog
- Thông tin VĐV: Nickname, Gamer ID, Facebook, SĐT, Email
- Stats: Trận / Thắng / Hòa / Thua
- Xếp hạng & Điểm EFV

---

## 🗄 API Routes

| Prefix | Mô tả |
|--------|--------|
| `/api/auth/*` | Đăng nhập, đăng ký, refresh token, profile |
| `/api/tournaments/*` | CRUD giải đấu, brackets, registrations, matches |
| `/api/payment/*` | Tạo thanh toán PayOS, webhook xử lý kết quả |
| `/api/payment-config` | Cấu hình phương thức thanh toán |
| `/api/posts/*` | CRUD bài viết |
| `/api/categories/*` | CRUD danh mục |
| `/api/bxh/*` | Bảng xếp hạng, tính điểm EFV |
| `/api/dashboard` | Thống kê tổng quan |
| `/api/upload` | Upload ảnh |
| `/api/admin/*` | Admin-only endpoints |
| `/api/manager/*` | Manager-only endpoints |

---

## 🏅 Hệ Thống Điểm EFV

Mỗi giải đấu có thể gắn tier EFV:

| Xếp hạng | EFV 250 | EFV 500 | EFV 1000 |
|-----------|---------|---------|----------|
| 🥇 Vô địch | 250 | 500 | 1000 |
| 🥈 Á quân | 200 | 400 | 800 |
| 🥉 Top 4 | 150 | 300 | 600 |
| Top 8 | 100 | 200 | 400 |
| Top 16 | 50 | 100 | 200 |
| Top 32 | 40 | 70 | 150 |
| Tham gia | 30 | 50 | 100 |

---

## 👨‍💻 Tác Giả

**Phạm Đăng Khoa**

- GitHub: [@phamkhoa18](https://github.com/phamkhoa18)

---

## 📄 License

Dự án này được phát triển cho mục đích **thực tập tốt nghiệp**.

---

<div align="center">
  <sub>Built with ❤️ using Next.js, MongoDB & TailwindCSS</sub>
</div>
