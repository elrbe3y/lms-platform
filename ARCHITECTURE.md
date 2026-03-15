# 🏗️ البنية المعمارية للمنصة
## منصة محمد الربيعي التعليمية - وثيقة فنية

---

## 📐 نظرة عامة

### Stack التقني

| الطبقة | التقنية | الدور |
|--------|---------|------|
| **Frontend** | Next.js 14 + React 18 | واجهة المستخدم وSSR |
| **Styling** | Tailwind CSS | التصميم والتنسيق |
| **Backend** | Next.js API Routes | الخادم والمنطق |
| **Database** | PostgreSQL | تخزين البيانات |
| **ORM** | Prisma | إدارة قاعدة البيانات |
| **Cache** | Redis | الجلسات والكاش |
| **CDN** | Bunny.net | بث الفيديوهات |
| **Language** | TypeScript | لغة البرمجة |
| **Payments** | Fawry + Paymob | المدفوعات |

---

## 🗂️ هيكل المشروع

```
d:/LMS/
│
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   └── login/route.ts
│   │   ├── admin/
│   │   │   ├── stats/route.ts
│   │   │   ├── students/
│   │   │   │   ├── suspend/route.ts
│   │   │   │   └── activate/route.ts
│   │   │   └── codes/
│   │   │       └── generate/route.ts
│   │   ├── video/
│   │   │   └── stream/route.ts
│   │   └── codes/
│   │       └── redeem/route.ts
│   │
│   ├── register/page.tsx         # صفحة التسجيل
│   ├── login/page.tsx            # صفحة تسجيل الدخول
│   ├── dashboard/                # لوحة الطالب
│   ├── admin/                    # لوحة الأدمن
│   ├── layout.tsx                # Layout الرئيسي
│   ├── page.tsx                  # الصفحة الرئيسية
│   └── globals.css               # الأنماط العامة
│
├── components/                   # المكونات المعاد استخدامها
│   ├── admin/
│   │   └── AdminDashboard.tsx    # لوحة تحكم الأدمن
│   └── video/
│       ├── SecureVideoPlayer.tsx # مشغل الفيديو الآمن
│       └── DynamicWatermark.tsx  # العلامة المائية
│
├── lib/                          # منطق الأعمال (Business Logic)
│   ├── db.ts                     # Prisma Client
│   ├── video-security.ts         # أمان الفيديوهات
│   ├── session-manager.ts        # إدارة الجلسات
│   └── code-system.ts            # نظام الأكواد
│
├── prisma/
│   ├── schema.prisma             # Database Schema
│   └── seed.ts                   # بيانات تجريبية
│
├── middleware.ts                 # التحقق من الجلسات
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.example
├── .gitignore
├── README.md
├── ADMIN_GUIDE.md
├── SECURITY.md
├── QUICKSTART.md
└── ARCHITECTURE.md (هذا الملف)
```

---

## 🔄 تدفق البيانات (Data Flow)

### 1. تسجيل الدخول (Login Flow)

```
┌─────────────┐
│   الطالب    │
└──────┬──────┘
       │ 1. يُدخل البريد + كلمة المرور
       ↓
┌──────────────────────┐
│  app/api/auth/login  │
│  ────────────────    │
│  • التحقق من البيانات│
│  • مقارنة bcrypt     │
│  • توليد JWT         │
└──────┬───────────────┘
       │ 2. JWT Token
       ↓
┌────────────────────────┐
│  session-manager.ts    │
│  ──────────────────    │
│  • إنشاء جلسة جديدة   │
│  • حذف الجلسات القديمة│
│  • تخزين في DB        │
└──────┬─────────────────┘
       │ 3. Set Cookie
       ↓
┌─────────────┐
│  المتصفح    │
│  Cookie: session_token
└─────────────┘
```

---

### 2. مشاهدة الفيديو (Video Streaming)

```
┌─────────────┐
│   الطالب    │
└──────┬──────┘
       │ 1. يطلب صفحة الدرس
       ↓
┌────────────────────────┐
│  app/lessons/[id]      │
│  ────────────────      │
│  • التحقق من الاشتراك │
│  • توليد Signed URL    │
└──────┬─────────────────┘
       │ 2. Signed URL
       ↓
┌────────────────────────────┐
│  components/               │
│  SecureVideoPlayer.tsx     │
│  ────────────────────      │
│  • عرض الفيديو مع الواجهة │
│  • إضافة العلامة المائية  │
│  • منع أدوات المطورين     │
└──────┬─────────────────────┘
       │ 3. GET /api/video/stream?sig=...
       ↓
┌────────────────────────┐
│  app/api/video/stream  │
│  ────────────────      │
│  • التحقق من التوقيع  │
│  • التحقق من الصلاحيات│
│  • إرجاع stream URL   │
└──────┬─────────────────┘
       │ 4. Stream URL (Bunny.net)
       ↓
┌─────────────────┐
│  Bunny CDN      │
│  HLS Streaming  │
└─────────────────┘
```

---

### 3. استخدام كود (Code Redemption)

```
┌─────────────┐
│   الطالب    │
└──────┬──────┘
       │ 1. يُدخل الكود: ABCD-EFGH-IJKL
       ↓
┌──────────────────────┐
│  app/api/codes/redeem│
└──────┬───────────────┘
       │ 2. استدعاء
       ↓
┌────────────────────┐
│  code-system.ts    │
│  ──────────────    │
│  • البحث عن الكود │
│  • التحقق من الحالة
│  • حساب الرصيد    │
│  • تسجيل الاستخدام│
└──────┬─────────────┘
       │ 3. تحديث DB
       ↓
┌─────────────────────┐
│  Prisma (Database)  │
│  ─────────────────  │
│  Code → USED        │
│  CodeUsage → جديد   │
│  Enrollment → تفعيل│
└─────────────────────┘
```

---

## 🗄️ نموذج قاعدة البيانات (Database Schema)

### العلاقات الأساسية

```
User (الطالب/الأدمن)
 │
 ├─── Session (الجلسات)
 ├─── Enrollment (التسجيل في الكورسات)
 ├─── LessonProgress (تتبع التقدم)
 ├─── ExamAttempt (محاولات الامتحانات)
 ├─── CodeUsage (استخدام الأكواد)
 ├─── Payment (المدفوعات)
 └─── Notification (الإشعارات)

Course (الكورس)
 │
 └─── Module (الوحدة)
       │
       └─── Lesson (الدرس)
             │
             ├─── Video (الفيديو)
             ├─── Exam (الامتحان)
             │     │
             │     └─── Question (السؤال)
             │           │
             │           └─── Answer (الإجابة)
             │
             └─── LessonProgress

Code (الكود)
 │
 └─── CodeUsage (سجل الاستخدام)
```

---

## 🔒 طبقات الأمان

### 1. Application Layer (طبقة التطبيق)

```typescript
// middleware.ts
export function middleware(req) {
  // 1. التحقق من JWT
  // 2. التحقق من Device ID
  // 3. فحص حالة المستخدم
  // 4. التحقق من الصلاحيات
}
```

### 2. API Layer (طبقة API)

```typescript
// app/api/*/route.ts
export async function POST(req) {
  // 1. Input Validation (Zod)
  // 2. Authorization Check
  // 3. Rate Limiting
  // 4. Business Logic
  // 5. Response
}
```

### 3. Database Layer (طبقة قاعدة البيانات)

```typescript
// Prisma ORM
// - Parameterized Queries (منع SQL Injection)
// - Type Safety
// - Transactions
```

---

## 🎨 Component Architecture

### Atomic Design Pattern

```
Pages (App Router)
 │
 ├─── Templates
 │     │
 │     └─── Organisms (مكونات معقدة)
 │           │
 │           ├─── AdminDashboard
 │           ├─── StudentDashboard
 │           └─── CourseCard
 │
 └─── Molecules (مكونات متوسطة)
       │
       ├─── SecureVideoPlayer
       ├─── DynamicWatermark
       └─── ExamQuestion
       │
       └─── Atoms (مكونات بسيطة)
             ├─── Button
             ├─── Input
             └─── Card
```

---

## 🚀 Deployment Architecture

### Production Setup

```
┌───────────────────┐
│  Cloudflare CDN   │  ← SSL + DDoS Protection
└─────────┬─────────┘
          │
┌─────────▼─────────┐
│   Nginx/Caddy     │  ← Reverse Proxy
└─────────┬─────────┘
          │
┌─────────▼─────────┐
│   Next.js Server  │  ← Port 3000
│   (PM2/Docker)    │
└─────────┬─────────┘
          │
     ┌────┴────┐
     │         │
┌────▼───┐ ┌──▼────┐
│ Postgres│ │ Redis │
│ Database│ │ Cache │
└─────────┘ └───────┘
```

### Scaling Strategy

#### مرحلة 1: Single Server (0-1000 طالب)
- Server واحد يُشغل Next.js + PostgreSQL + Redis
- Bunny.net للفيديوهات

#### مرحلة 2: Vertical Scaling (1000-5000 طالب)
- ترقية موارد السيرفر (RAM, CPU)
- Database Indexing
- Redis Caching

#### مرحلة 3: Horizontal Scaling (5000+ طالب)
- Load Balancer
- Database Read Replicas
- Separate Redis Cluster
- CDN للملفات الثابتة

---

## 📊 Performance Optimization

### Frontend
- **Code Splitting**: تحميل الكود حسب الحاجة
- **Image Optimization**: Next.js Image Component
- **Lazy Loading**: للفيديوهات والصور
- **Static Generation**: للصفحات الثابتة

### Backend
- **Database Indexing**: على الحقول المستخدمة في WHERE
- **Redis Caching**: للإحصائيات والجلسات
- **N+1 Query Prevention**: Prisma `include`
- **Connection Pooling**: إدارة اتصالات DB

### Media
- **HLS Adaptive Streaming**: جودة تتكيف مع السرعة
- **CDN**: توزيع عالمي للفيديوهات
- **Compression**: ضغط الصور والملفات

---

## 🔧 Development Workflow

```bash
# 1. Feature Branch
git checkout -b feature/new-exam-system

# 2. Development
npm run dev
# تطوير + اختبار

# 3. Testing
npm run lint
npm run test

# 4. Commit
git add .
git commit -m "feat: add new exam system"

# 5. Push & PR
git push origin feature/new-exam-system
# Create Pull Request

# 6. Review & Merge
# Code Review → Merge to main

# 7. Deploy
npm run build
pm2 restart all
```

---

## 📚 API Documentation

### Authentication

```
POST /api/auth/register
Body: { fullName, email, phone, password, ... }
Response: { success: true, userId }

POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### Admin

```
GET /api/admin/stats
Response: { totalStudents, activeStudents, ... }

POST /api/admin/students/suspend
Body: { studentId }
Response: { success: true }
```

### Videos

```
GET /api/video/stream?v=ID&u=ID&exp=TIME&sig=SIG
Response: { streamUrl, duration, ... }
```

### Codes

```
POST /api/codes/redeem
Body: { code, userId, lessonId? }
Response: { success: true, creditsRemaining }
```

---

## 🌐 Environment Variables

### Development (.env.development)
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/lms_dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (.env.production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-server:5432/lms_prod
NEXT_PUBLIC_APP_URL=https://mohamed-rabiei.com
```

---

## 📈 Monitoring & Analytics

### Metrics to Track
- **User Metrics**: تسجيلات جديدة، نشاط يومي
- **Performance**: وقت الاستجابة، الأخطاء
- **Business**: المبيعات، معدل التحويل
- **Security**: محاولات اختراق، جلسات مشبوهة

### Tools
- **Application**: Sentry/LogRocket
- **Server**: PM2 Monitoring
- **Database**: PostgreSQL Slow Query Log
- **CDN**: Bunny.net Analytics

---

## 🔮 Future Enhancements

- [ ] تطبيق موبايل (React Native)
- [ ] نظام المحادثة المباشرة
- [ ] امتحانات متقدمة (essay questions)
- [ ] منتدى للنقاشات
- [ ] نظام الشهادات
- [ ] AI للتصحيح التلقائي

---

**آخر تحديث:** فبراير 2024  
**الإصدار:** 1.0.0

---

© 2024 منصة محمد الربيعي التعليمية
