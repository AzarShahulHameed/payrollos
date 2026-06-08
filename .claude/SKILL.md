# PayrollOS — Full-Stack SaaS Payroll Platform Skill

## When to use this skill
Use this skill for ANY task involving the PayrollOS codebase — adding features, fixing bugs, deploying, or debugging. Read this entire file before writing a single line of code.

---

## Project Overview

**PayrollOS** is a multi-tenant SaaS payroll platform for UAE and India regions, built by Azar Shahul Hameed (Catapult Auditing LLC SOC, cat-cons.com).

**Live URLs:**
- Frontend: https://payrollos-seven.vercel.app
- Backend: https://payrollos-backend.onrender.com
- Database: Neon PostgreSQL (ep-crimson-grass-a26drgit-pooler.eu-central-1.aws.neon.tech)
- GitHub: https://github.com/AzarShahulHameed/payrollos

**Local paths:**
- Root: `C:\xampp\htdocs\payroll-saas old\`
- Backend: `C:\xampp\htdocs\payroll-saas old\backend\`
- Frontend: `C:\xampp\htdocs\payroll-saas old\frontend\`

---

## Tech Stack

### Backend
- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma v5 with PostgreSQL
- **Auth:** JWT (15min access + 7day refresh), bcrypt, 2FA/TOTP (speakeasy)
- **Email:** Resend HTTP API (NOT SMTP — Render blocks SMTP ports)
- **File uploads:** Cloudinary (signed uploads, API secret stays server-side)
- **WebSockets:** Socket.io via @nestjs/websockets
- **Rate limiting:** @nestjs/throttler (global + per-endpoint)
- **Security:** Helmet, strict CORS, ValidationPipe (whitelist + forbidNonWhitelisted)
- **Port:** 3001

### Frontend
- **Framework:** Next.js 14 App Router (TypeScript)
- **State:** Zustand (auth store + region store)
- **Data fetching:** TanStack Query (@tanstack/react-query)
- **HTTP:** Axios (baseURL from NEXT_PUBLIC_API_URL env var)
- **Styling:** Inline styles only — NO CSS modules, NO Tailwind, NO styled-components
- **CSS variables:** `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`, `var(--surface)`, `var(--line)`, `var(--bg)`, `var(--sh-sm)`
- **Dark mode:** `data-theme="dark"` on `document.documentElement`
- **Port:** 3000

### Infrastructure
- **Frontend hosting:** Vercel (root directory: `frontend`)
- **Backend hosting:** Render (root directory: `backend`, build: `npm install --include=dev && npm run build`, start: `node dist/main`)
- **Database:** Neon PostgreSQL 16 (Frankfurt region)
- **CDN/uploads:** Cloudinary

---

## File Structure

### Backend modules (`backend/src/modules/`)
```
auth/auth.module.ts          — All auth: service + controller + DTOs in one file
employees/                   — Employee CRUD, auto-user creation, salary structure
payrun/                      — Payrun processing, payslip generation
payslips/                    — Payslip retrieval and email
leaves/                      — Leave requests, balances, approve/reject
loans/                       — Loan requests, EMI schedule, approval
advances/                    — Advance requests, approval
reimbursements/              — Expense claims, approval
attendance/                  — Clock in/out, bulk import
documents/                   — Employee document upload
notifications/               — Bell notifications + WebSocket gateway
settings/                    — 12 settings sub-pages
upload/                      — Cloudinary signed upload endpoint
wps/                         — UAE WPS SIF file generation
analytics/                   — Dashboard KPIs, trends, department breakdown
arrears/                     — Salary revision with record trail
email/email.service.ts       — Resend HTTP API email service
scheduler/                   — Scheduled jobs (payrun reminders)
```

### Backend common (`backend/src/common/`)
```
prisma/prisma.module.ts           — PrismaService
guards/jwt-auth.guard.ts          — JWT guard
dto/common.dto.ts                 — All DTOs (CreateEmployeeDto, CreateLeaveDto, etc.)
filters/http-exception.filter.ts  — Global exception filter (graceful 429s)
notification.helper.ts            — NotificationHelper.create() + notifyAdmins()
```

### Frontend pages (`frontend/src/app/`)
```
login/                  — Login + register tabs
dashboard/              — Admin dashboard with KPIs + pending approvals
employees/              — Employee table + IncrementPanel + CSV import/export
payrun/                 — 5-step payrun flow
payslips/               — Payslip viewer with org logo
leaves/                 — Leave management + calendar view
leaves/calendar/        — Monthly calendar view of approved leaves
attendance/             — Attendance management + CSV import
org-chart/              — Organisation chart by department
audit-log/              — Audit log with CSV export
reports/                — Salary register, WPS, bank CSV
analytics/              — Charts and decomposition tree
arrears/                — Salary revision history
bonus/                  — Bonus management
documents/              — Document management
loans/                  — Loan management
advances/               — Advance management
reimbursements/         — Reimbursement management
settings/               — 12 sub-pages (organisation, payroll, statutory, etc.)
ess/                    — Employee Self Service portal (10 pages)
change-password/        — Standalone change password page
forgot-password/        — Forgot password flow
reset-password/         — Token-based password reset
```

### Frontend key files
```
src/lib/api.ts                      — Axios instance + all API methods
src/lib/cloudinary.ts               — Cloudinary upload helper
src/store/auth.store.ts             — useAuthStore (user, tokens, login, logout, updateUser)
src/store/auth.store.ts             — useRegionStore (region: 'UAE'|'INDIA')
src/components/layout/AppLayout.tsx — Admin layout with sidebar + NotificationBell + WebSocket
src/components/layout/ESSLayout.tsx — ESS layout with mobile bottom nav
src/styles/globals.css              — CSS variables + dark mode + mobile media queries
```

---

## Critical Patterns

### API baseURL
```typescript
// frontend/src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
// NEXT_PUBLIC_API_URL = https://payrollos-backend.onrender.com/api/v1
// DO NOT append /api/v1 again — it's already included
```

### Auth pattern in controllers
```typescript
@Get() @UseGuards(JwtAuthGuard)
findAll(@Req() req: any) {
  const orgId  = req.user.orgId;   // organisation ID
  const userId = req.user.sub;     // user ID
  const role   = req.user.role;    // SUPER_ADMIN | ADMIN | HR | MANAGER | EMPLOYEE
  return this.svc.findAll(orgId, ...);
}
```

### Prisma new field pattern (before migration runs)
```typescript
// Cast to any when using fields not yet in generated Prisma client
await (this.prisma.user as any).update({ where: { id }, data: { newField: value } });
```

### Notification pattern
```typescript
import { NotificationHelper } from '../../common/notification.helper';

// Notify a specific user
await NotificationHelper.create(this.prisma, {
  userId, organizationId: orgId,
  title: 'Leave approved',
  message: 'Your leave has been approved',
  type: 'SUCCESS',  // INFO | SUCCESS | ACTION | WARNING
  link: '/ess/leaves',
});

// Notify all admins/HR in org
await NotificationHelper.notifyAdmins(this.prisma, orgId, {
  title: 'New leave request',
  message: 'An employee has applied for leave',
  type: 'ACTION',
  link: '/leaves',
});
```

### Email pattern
```typescript
// Uses Resend HTTP API — NOT SMTP
await this.email.send(to, subject, html);
await this.email.sendWelcome({ firstName, email, orgName, tempPassword, loginUrl });
await this.email.sendPayslipReady(employee, payrun, orgName);
await this.email.sendPayrunReminder(to, orgName, period, daysLeft);
```

### Frontend query pattern
```typescript
const { data = [], isLoading } = useQuery({
  queryKey: ['key', dependency],
  queryFn: () => api.get('/endpoint', { params }).then(r => r.data),
});

const mutation = useMutation({
  mutationFn: (dto: any) => api.post('/endpoint', dto).then(r => r.data),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['key'] }); },
  onError: (e: any) => alert(e?.response?.data?.message || 'Error'),
});
```

### Inline style pattern (ALL components use this)
```tsx
// Use CSS variables, never hardcoded colors
<div style={{
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  color: 'var(--ink)',
}}>
```

### Button pattern
```tsx
const btn = (bg='#0a84ff', fg='#fff'): React.CSSProperties => ({
  padding: '9px 18px', background: bg, color: fg,
  border: 'none', borderRadius: 8, fontSize: 13.5,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
});
```

---

## Database Schema — Key Models

```prisma
User         — id, organizationId, email, passwordHash, firstName, lastName, role,
               totpSecret, twoFaEnabled, photoUrl, mustChangePassword,
               passwordResetToken, passwordResetExpiry

Employee     — id, organizationId, employeeCode, firstName, lastName, email,
               designation, departmentId, branchId, userId (linked User),
               iban, emiratesId, passportNo, visaNo, nationality,
               bankAccount, ifscCode, panNo, aadhaarNo, status, region

Organization — id, name, slug, region, logoUrl, email, phone, address, taxId (TRN)

PayrollSettings — organizationId, payDay, workingDays, overtimeEnabled,
                  bankName, wpsRoutingCode, salaryComponents (JSON),
                  notifyPayrunDraft, notifyPayslipReleased, etc.

SalaryStructure — employeeId, basicSalary, housingAllowance, transportAllowance,
                  medicalAllowance, otherAllowances, ctcAnnual, basicPct,
                  taxRegime, cityType

Payrun       — organizationId, year, month, region, status, name, totalNet
Payslip      — payrunId, employeeId, grossSalary, netSalary, basicSalary,
               totalDeductions, pfEmployee, esiEmployee, tdsAmount, status

LeaveRequest — employeeId, leaveType, startDate, endDate, status, reason
LeaveBalance — employeeId, year, leaveType, total, used, remaining

LoanRequest  — employeeId, amount, installments, status, approvedBy
LoanInstallment — loanId, month, year, amount, status

Notification — userId, organizationId, title, message, type, read, link
AuditLog     — performedBy (userId), entityType, entityId, action, oldValues, newValues
```

---

## Roles & Access

```
SUPER_ADMIN — Full access, sees everything across org
ADMIN       — Full access within org
HR          — HR modules, leaves, attendance, documents
MANAGER     — View and approve team requests
ACCOUNTANT  — Payroll, reports, statutory
EMPLOYEE    — ESS portal only (/ess/* routes)
```

ESS portal (`/ess/*`) blocks SUPER_ADMIN and ADMIN — they are redirected to `/dashboard`.

---

## Environment Variables

### Backend (Render)
```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=64-char-hex
JWT_REFRESH_SECRET=64-char-hex
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
APP_URL=https://payrollos-seven.vercel.app
ALLOWED_ORIGINS=https://payrollos-seven.vercel.app
SMTP_HOST=smtp.resend.com
SMTP_PASS=re_xxxxxxxxxxxx   ← Resend API key (used as HTTP Bearer token)
SMTP_FROM=PayrollOS <hr@cat-cons.com>
CLOUDINARY_CLOUD_NAME=dchfubjyx
CLOUDINARY_API_KEY=566895452124237
CLOUDINARY_API_SECRET=PdvjBkMmmRehPAFRXVl9MLw9310
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://payrollos-backend.onrender.com/api/v1
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dchfubjyx
```

---

## Completed Features (98% complete)

✅ UAE + India dual-region payroll engine
✅ WPS SIF file (skips employees without IBAN)
✅ Employee CRUD + auto user creation + welcome email
✅ Payrun 5-step flow + payslip with org logo
✅ Leaves + calendar view + balance tracking
✅ Loans + EMI schedule + auto-deduction
✅ Advances + Reimbursements
✅ Attendance clock in/out + CSV import
✅ Documents with expiry alerts
✅ Bonuses + Gratuity + FnF
✅ Real-time WebSocket notifications + toast popups
✅ Notification hooks on every action
✅ 2FA/TOTP (Google Authenticator)
✅ Change/forgot/reset password + force on first login
✅ Salary increment per employee with record trail
✅ ESS portal (10 pages) — mobile responsive with bottom nav
✅ ESS dashboard with live data
✅ PIN gate on payslips + sensitive profile data
✅ Org chart by department with photos
✅ Leave calendar — monthly visual view
✅ Audit log with CSV export
✅ Employee CSV export + payroll register CSV export
✅ Bulk attendance CSV import
✅ Settings — 12 pages all wired
✅ Dark mode full theme
✅ Rate limiting + Helmet + strict input validation
✅ Deployed: Vercel + Render + Neon

## Pending (2% remaining)
❌ Stripe subscription billing (needed before charging external clients)
❌ Onboarding wizard for new client orgs

---

## Known Gotchas

1. **Email uses Resend HTTP API, NOT SMTP** — Render free tier blocks ports 587 and 465. The email service detects `re_` API key prefix and switches to HTTP automatically.

2. **NEXT_PUBLIC_API_URL already includes /api/v1** — Never append it again in api.ts or anywhere else. The old code had `${NEXT_PUBLIC_API_URL}/api/v1` which caused double prefix.

3. **ValidationPipe with forbidNonWhitelisted** — Any extra field not in the DTO causes 422. Always add `@IsOptional()` for optional fields. LoginDto must include orgSlug as optional.

4. **Prisma cast for new fields** — Until `prisma migrate dev` + `prisma generate` runs, new schema fields need `(this.prisma.model as any).method()`.

5. **WebSocket URL** — Derived from NEXT_PUBLIC_API_URL by stripping `/api/v1`. Never hardcode localhost.

6. **CORS** — Allows all `*.vercel.app` origins (for preview deployments) + exact ALLOWED_ORIGINS from env. Never restrict to single URL during development.

7. **Render free tier** — Spins down after 15min inactivity. First request after spin-down takes 30-60s. Upgrade to Starter ($7/mo) for always-on.

8. **Python string generation for TS files** — Never use triple-quoted strings with backticks when generating TypeScript template literals from Python. Use string concatenation instead.

9. **JSX closing tags** — When adding `<div className="table-scroll">` inside a ternary expression, count div opens/closes carefully. The ternary needs its own `)` before `</div>`.

10. **Next.js NEXT_PUBLIC_ vars** — Baked in at BUILD TIME. Setting them in Vercel after deployment does nothing until you trigger a fresh redeploy with "use existing cache" unchecked.

---

## Adding a New Module (standard pattern)

### Backend
```typescript
// 1. Create module folder: backend/src/modules/[name]/
// 2. Service: inject PrismaService, scope all queries by organizationId
// 3. Controller: @UseGuards(JwtAuthGuard), extract orgId from req.user.orgId
// 4. DTO: add to backend/src/common/dto/common.dto.ts with proper validation
// 5. Register in app.module.ts
// 6. Add notification hooks using NotificationHelper
// 7. Wire to email if approval needed
```

### Frontend
```typescript
// 1. Create page: frontend/src/app/[route]/page.tsx
// 2. Add 'use client' directive
// 3. Import AppLayout (admin) or ESSLayout (employee)
// 4. Use useQuery for fetching, useMutation for writes
// 5. Invalidate queryKey on mutation success
// 6. Add to nav in AppLayout.tsx (admin) or ESSLayout.tsx (ESS)
// 7. Follow inline style pattern with CSS variables
```

### Migration
```powershell
cd backend
npx prisma migrate dev --name add-[feature-name]
npx prisma generate
# Then deploy to Neon:
npx prisma migrate deploy
```
