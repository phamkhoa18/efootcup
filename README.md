# ⚽ eFootball VN — Nền Tảng Tổ Chức Giải Đấu eFootball

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

**Nền tảng tổ chức và quản lý giải đấu eFootball chuyên nghiệp hàng đầu Việt Nam.**

🌐 [efootball.vn](https://efootball.vn) · 🐞 [Báo Lỗi](https://github.com/phamkhoa18/efootcup/issues)

</div>

---

## 📋 Giới Thiệu

**eFootball VN** là nền tảng fullstack cho phép tổ chức, quản lý và theo dõi các giải đấu eFootball trực tuyến. Hệ thống hỗ trợ toàn bộ quy trình từ tạo giải, đăng ký, thanh toán lệ phí, xếp lịch thi đấu, tạo sơ đồ nhánh (bracket), gửi kết quả trận đấu, đến bảng xếp hạng điểm EFV theo mùa.

---

## ✨ Tính Năng Chính

### 🏆 Quản Lý Giải Đấu
- Tạo và cấu hình giải đấu với nhiều thể thức: **Loại trực tiếp**, **Vòng tròn**, **Swiss**, **Giải tự do**
- Hỗ trợ hai nền tảng: **Mobile** và **Console (PC)**
- Cấu hình tier EFV (250/500/1000 cho Mobile, 50/100/200 cho Console)
- Quản lý đăng ký, phê duyệt VĐV, cấu hình số đội tối đa, lệ phí

### 📊 Sơ Đồ Thi Đấu (Bracket)
- Tạo bracket tự động với thuật toán seeding (hạt giống)
- Drag-to-scroll, zoom, tìm kiếm VĐV/đội/EFV ID
- Click vào trận đấu để xem chi tiết, gửi kết quả
- **Auto-submit**: khi match đang LIVE, VĐV bấm vào trận đấu sẽ hiện form gửi kết quả ngay
- Export bracket ra PDF
- Connector lines giữa các vòng, highlight trận đang LIVE

### 💰 Thanh Toán Tự Động
- Tích hợp **PayOS** — thanh toán lệ phí qua mã VietQR tự động
- Hỗ trợ thanh toán thủ công (chuyển khoản, gửi minh chứng)
- Webhook tự động xác nhận thanh toán
- Quản lý trạng thái: chờ thanh toán → chờ xác nhận → đã thanh toán

### 👥 Hệ Thống VĐV & EFV-ID
- Hệ thống **EFV-ID** vĩnh viễn (số nguyên tự tăng) cho mỗi VĐV
- Profile cá nhân: avatar, nickname, team, Gamer ID, Facebook, tỉnh/thành
- Upload avatar hỗ trợ mọi định dạng ảnh (tối đa 10MB)
- Xem lịch sử tham gia giải, thống kê trận đấu

### 🏅 Bảng Xếp Hạng EFV (Dual-mode)
- **BXH Mobile** — Tiers: EFV 250, EFV 500, EFV 1000 (sliding window 5/4/3)
- **BXH Console** — Tiers: EFV 50, EFV 100, EFV 200 (sliding window 5/4/3)
- Tính điểm sliding window theo phong độ gần đây
- Xem lịch sử điểm, profile VĐV từ BXH
- Tự động tính toán khi award points hoặc reload system

### 📝 Quản Lý Bài Viết
- Rich text editor **TipTap** với hỗ trợ heading, bold, italic, links, images, code blocks
- Danh mục bài viết, SEO friendly URLs (slug tự động)
- Featured post, thumbnail, trạng thái draft/published

### 🔐 Phân Quyền 3 Cấp

| Role | Đường dẫn | Quyền |
|------|-----------|-------|
| **Admin** | `/admin` | Toàn quyền: quản lý user, giải đấu, bài viết, cài đặt hệ thống, menu, danh mục |
| **Manager** | `/manager` | Tạo & quản lý giải đấu, bracket, kết quả, duyệt đăng ký, quản lý VĐV, BXH |
| **User** | `/` | Xem giải đấu, đăng ký thi đấu, gửi kết quả, thanh toán, xem BXH, profile |

### 📱 Responsive & UX
- Giao diện tối ưu cho cả desktop và mobile
- Micro-animations với Framer Motion
- Toast notifications (Sonner)
- Drag-to-scroll cho bracket view

---

## 🛠 Tech Stack

| Layer | Công Nghệ | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router, Turbopack) | 16.1.6 |
| **Frontend** | React, TypeScript | 19.2.3, 5.x |
| **Styling** | Tailwind CSS, Framer Motion | 4.x, 12.x |
| **UI Components** | Shadcn/UI, Radix UI, Lucide Icons, cmdk | Latest |
| **Database** | MongoDB + Mongoose | 9.2.2 |
| **Auth** | JWT (jsonwebtoken) + bcryptjs | 9.x, 3.x |
| **Payment** | PayOS (VietQR) | — |
| **Rich Editor** | TipTap (full extensions) | 3.20.x |
| **Email** | Nodemailer | 8.x |
| **Export** | jsPDF + jspdf-autotable, xlsx, html-to-image | Latest |
| **Date** | date-fns, react-day-picker | 4.x, 9.x |

---

## 📁 Cấu Trúc Dự Án

```
efootcup/
├── app/
│   ├── (main)/                    # 🌐 Trang công khai (user)
│   │   ├── page.tsx               # Trang chủ
│   │   ├── giai-dau/              # Danh sách & chi tiết giải đấu
│   │   │   └── [id]/              # Chi tiết giải (overview, bracket, schedule, players)
│   │   ├── bxh/                   # Bảng xếp hạng Mobile
│   │   ├── bxh-console/           # Bảng xếp hạng Console
│   │   ├── tin-tuc/               # Tin tức
│   │   ├── profile/[efvId]/       # Profile công khai VĐV
│   │   ├── trang-ca-nhan/         # Profile cá nhân (đăng nhập)
│   │   ├── xac-nhan-thanh-toan/   # Kết quả thanh toán PayOS
│   │   ├── chinh-sach/            # Chính sách
│   │   └── dieu-khoan/            # Điều khoản
│   │
│   ├── (admin)/admin/             # 🔧 Admin Dashboard
│   │   ├── giai-dau/              # Quản lý giải đấu
│   │   ├── nguoi-dung/            # Quản lý người dùng
│   │   ├── bai-viet/              # Quản lý bài viết
│   │   ├── danh-muc/              # Quản lý danh mục
│   │   ├── thanh-toan/            # Cấu hình thanh toán
│   │   ├── menu/                  # Quản lý menu
│   │   └── cai-dat/               # Cài đặt hệ thống
│   │
│   ├── (manager)/manager/         # 📋 Manager Dashboard
│   │   ├── giai-dau/[id]/         # Quản lý giải đấu
│   │   │   ├── noi-dung/          # Nội dung & cài đặt
│   │   │   ├── so-do/             # Sơ đồ thi đấu (bracket)
│   │   │   ├── lich/              # Lịch thi đấu
│   │   │   └── dang-ky/           # Quản lý đăng ký
│   │   ├── tao-giai-dau/          # Tạo giải đấu mới
│   │   ├── vdv/                   # Quản lý VĐV
│   │   ├── bxh/                   # Quản lý BXH & điểm EFV
│   │   └── thong-ke/              # Thống kê
│   │
│   ├── (auth)/                    # 🔑 Đăng nhập / Đăng ký
│   │   ├── dang-nhap/
│   │   └── dang-ky/
│   │
│   ├── api/                       # 🔌 REST API Routes
│   │   ├── auth/                  # Auth: login, register, me, efv-points
│   │   ├── tournaments/           # CRUD giải đấu, brackets, matches, registrations
│   │   ├── payment/               # PayOS: create, webhook, verify
│   │   ├── payment-config/        # Cấu hình phương thức thanh toán
│   │   ├── bxh/                   # BXH: query, reload-system, award-efv-points, history
│   │   ├── posts/                 # CRUD bài viết
│   │   ├── categories/            # CRUD danh mục
│   │   ├── upload/                # Upload file (avatar, registration, screenshot)
│   │   ├── files/[...path]/       # Serve uploaded files (production-ready)
│   │   ├── admin/                 # Admin-only endpoints
│   │   ├── manager/               # Manager-only endpoints
│   │   ├── dashboard/             # Thống kê tổng quan
│   │   ├── users/                 # API quản lý users
│   │   ├── menus/                 # API menu
│   │   ├── notifications/         # API thông báo
│   │   └── site-settings/         # API cài đặt site
│   │
│   └── globals.css                # Global styles & animations
│
├── components/
│   └── ui/                        # Shadcn UI components (32 files)
│
├── contexts/
│   └── AuthContext.tsx             # React Context: auth state, token, user
│
├── hooks/                         # Custom React hooks
│
├── lib/
│   ├── api.ts                     # API client (tournamentAPI, authAPI, adminAPI, ...)
│   ├── auth.ts                    # Server-side auth utilities (requireAuth, requireAdmin, ...)
│   ├── db.ts                      # MongoDB connection
│   ├── efv-points.ts              # Point tables & sliding window config
│   └── utils.ts                   # Utilities (cn, format, ...)
│
├── models/                        # Mongoose Models (16 files)
│   ├── Tournament.ts              # Giải đấu (mode, format, efvTier, settings, ...)
│   ├── Match.ts                   # Trận đấu (bracket, score, submissions, ...)
│   ├── Team.ts                    # Đội (player1, player2, efvId, ...)
│   ├── Registration.ts            # Đăng ký (personalPhoto, teamLineupPhoto, ...)
│   ├── User.ts                    # Người dùng (efvId, avatar, stats, ...)
│   ├── Bxh.ts                     # Bảng xếp hạng (mobile + console tiers)
│   ├── EfvPointLog.ts             # Lịch sử điểm EFV
│   ├── Post.ts                    # Bài viết
│   ├── Category.ts                # Danh mục
│   ├── PaymentConfig.ts           # Cấu hình thanh toán
│   ├── Counter.ts                 # Auto-increment counter (EFV-ID)
│   ├── SiteSettings.ts            # Cài đặt site
│   ├── SiteMenu.ts                # Menu navigation
│   ├── Notification.ts            # Thông báo
│   ├── Feedback.ts                # Phản hồi
│   └── TournamentExpense.ts       # Chi phí giải đấu
│
├── scripts/                       # Scripts hỗ trợ
│   ├── seed-test-data.js          # Tạo dữ liệu test tự động
│   ├── migrate-efv-ids.ts         # Migration EFV-ID
│   ├── migrate-efv-to-number.ts   # Migration EFV-ID sang number
│   └── migrate-verify-users.js    # Verify trạng thái users
│
├── public/assets/                 # Ảnh, logo, banners
├── uploads/                       # Uploaded files (avatars, registration, screenshots, ...)
└── .env.local                     # Biến môi trường
```

---

## 🚀 Cài Đặt & Chạy

### Yêu Cầu Hệ Thống

- **Node.js** >= 18
- **MongoDB** (local hoặc MongoDB Atlas)
- **npm** >= 9

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
# ═══════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/efootcup

# ═══════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════
JWT_SECRET=your_jwt_secret_key_here

# ═══════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ═══════════════════════════════════════
# PAYOS — Thanh toán tự động (VietQR)
# ═══════════════════════════════════════
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# ═══════════════════════════════════════
# EMAIL — Nodemailer (SMTP)
# ═══════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 4. Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### 5. Tạo dữ liệu test (tùy chọn)

```bash
node scripts/seed-test-data.js
```

### 6. Build Production

```bash
npm run build
npm start
```

> **Lưu ý**: File upload sử dụng `/api/files/[...path]` để serve files từ thư mục `uploads/`. Cách này hoạt động ổn định trên cả dev và production, không phụ thuộc vào `public/`.

---

## 🗄 API Routes

### Authentication

| Method | Route | Mô tả |
|--------|-------|--------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |
| GET | `/api/auth/me` | Lấy thông tin user |
| PUT | `/api/auth/me` | Cập nhật profile |
| GET | `/api/auth/me/efv-points` | Lấy điểm EFV của user |
| GET | `/api/auth/me/participation` | Lấy giải đấu đã tham gia |

### Tournament

| Method | Route | Mô tả |
|--------|-------|--------|
| GET/POST | `/api/tournaments` | Danh sách / Tạo giải đấu |
| GET/PUT/DELETE | `/api/tournaments/[id]` | Chi tiết / Sửa / Xóa |
| GET/POST | `/api/tournaments/[id]/brackets` | Lấy / Tạo bracket |
| GET/PUT | `/api/tournaments/[id]/matches` | Lấy / Set kết quả trận đấu |
| POST | `/api/tournaments/[id]/matches/submit-result` | VĐV gửi kết quả |
| GET/POST | `/api/tournaments/[id]/registrations` | Đăng ký tham gia |
| POST | `/api/tournaments/[id]/award-efv-points` | Award điểm EFV |
| GET | `/api/tournaments/[id]/teams` | Danh sách đội |

### BXH & Điểm EFV

| Method | Route | Mô tả |
|--------|-------|--------|
| GET | `/api/bxh?mode=mobile` | BXH Mobile |
| GET | `/api/bxh?mode=pc` | BXH Console |
| POST | `/api/bxh/reload-system` | Reload toàn bộ BXH |
| GET | `/api/bxh/[id]/history` | Lịch sử điểm VĐV |

### Payment

| Method | Route | Mô tả |
|--------|-------|--------|
| POST | `/api/payment/create` | Tạo thanh toán PayOS |
| POST | `/api/payment/webhook` | Webhook xác nhận PayOS |
| POST | `/api/payment/verify` | Verify thanh toán |
| GET/POST | `/api/payment-config` | Cấu hình thanh toán |

### Content & Upload

| Method | Route | Mô tả |
|--------|-------|--------|
| GET/POST | `/api/posts` | Bài viết |
| GET/POST | `/api/categories` | Danh mục |
| POST | `/api/upload` | Upload ảnh (avatar, registration, screenshot — tối đa 10MB, mọi định dạng ảnh) |
| GET | `/api/files/[...path]` | Serve uploaded files |

---

## 🏅 Hệ Thống Điểm EFV

### Mobile (BXH chính)

| Xếp hạng | EFV 250 | EFV 500 | EFV 1000 |
|-----------|---------|---------|----------|
| 🥇 Vô địch | 250 | 500 | 1000 |
| 🥈 Á quân | 200 | 400 | 800 |
| 🥉 Top 4 | 150 | 300 | 600 |
| Top 8 | 100 | 200 | 400 |
| Top 16 | 50 | 100 | 200 |
| Top 32 | 40 | 70 | 150 |
| Tham gia | 30 | 50 | 100 |

### Console / PC

| Xếp hạng | EFV 50 | EFV 100 | EFV 200 |
|-----------|--------|---------|---------|
| 🥇 Vô địch | 50 | 100 | 200 |
| 🥈 Á quân | 40 | 80 | 160 |
| 🥉 Top 4 | 30 | 60 | 120 |
| Top 8 | 20 | 40 | 80 |
| Top 16 | 10 | 20 | 40 |
| Top 32 | 8 | 14 | 30 |
| Tham gia | 6 | 10 | 20 |

### Sliding Window (Phong Độ)

Hệ thống BXH tính theo **sliding window** — chỉ tính N giải gần nhất cho mỗi tier:

| Tier | Mobile | Console |
|------|--------|---------|
| 250 / 50 | Top 5 giải | Top 5 giải |
| 500 / 100 | Top 4 giải | Top 4 giải |
| 1000 / 200 | Top 3 giải | Top 3 giải |

---

## 📸 Tính Năng Nổi Bật

### Đăng Ký Giải Đấu
- Form đăng ký 3 bước: Thông tin cá nhân → Game info → Upload ảnh & xác nhận
- **Bắt buộc** upload hình cá nhân (rõ mặt) và hình đội hình thẻ thi đấu
- Hỗ trợ mọi định dạng ảnh, tối đa 10MB
- Auto-fill thông tin từ profile đã lưu

### Sơ Đồ Thi Đấu
- Bracket visualization với connector lines giữa các vòng
- Hệ thống hạt giống (seeding) — kéo thả thứ tự, shuffle ngẫu nhiên
- Tìm kiếm theo tên VĐV, tên đội, EFV ID
- 🟢 Match đang LIVE: VĐV bấm vào → hiện form gửi kết quả ngay
- Manager view đồng nhất giao diện với User view

### Gửi Kết Quả Trận Đấu
- VĐV tự gửi kết quả (tỉ số + screenshot minh chứng + ghi chú)
- Manager xem xét và xác nhận kết quả
- Tự động cập nhật bracket khi set winner

---

## 🧪 Scripts Hỗ Trợ

```bash
# Tạo dữ liệu test (users + giải đấu)
node scripts/seed-test-data.js

# Migration EFV ID
npx ts-node scripts/migrate-efv-ids.ts

# Migration EFV ID sang number
npx ts-node scripts/migrate-efv-to-number.ts

# Verify users
node scripts/migrate-verify-users.js
```

---

## 👨‍💻 Tác Giả

**Phạm Đăng Khoa**

- 🌐 Website: [efootball.vn](https://efootball.vn)
- 💻 GitHub: [@phamkhoa18](https://github.com/phamkhoa18)

---

## 📄 License

Dự án này được phát triển cho mục đích **Thực tập tốt nghiệp** tại Trường Đại học.

© 2024-2026 Phạm Đăng Khoa. All rights reserved.

---

<div align="center">
  <sub>Built with ❤️ using Next.js 16, React 19, MongoDB, Tailwind CSS 4 & TypeScript</sub>
</div>
