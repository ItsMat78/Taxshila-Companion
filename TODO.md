# Taxshila Companion — Remaining Work

Items are grouped by category and sorted roughly by priority within each group.
Completed items from the April 2026 sessions are **not** listed here.

---

## 1. Build & TypeScript

All TypeScript and `any`-type issues resolved. Build is clean.

---

## 2. Performance

- [x] **QR scanner refactored to full-screen overlay** — Replaced `Html5QrcodeScanner` (dialog-based, injected UI) with `Html5Qrcode` via new `QrScannerOverlay` component. Full-screen portal, single `stop()` teardown, animated scan line, no race conditions.
- [x] **Scan button white in dark mode** — `--primary` in dark mode is near-white (80% lightness). Added `dark:from-indigo-500 dark:to-violet-600` override in `DashboardTile` for saturated, visible color in dark mode.
- [x] **Library Rules link broken** — `/member/rules` was a deprecated stub returning null. Fixed to `/rules` (the public rules page).
- [x] **Member payment receipts** — Redesigned receipt: correct address (SA-17/144/79), correct phone (+91 6306343791), member phone number, amount in words, renewal period phrasing, "active until" date, clean two-column layout with print CSS.
- [x] **UPI online payment** — "Pay Online" card on fees page (shown when fees not Paid). Constructs `upi://pay` deep link with UPI ID, business name, amount, and `DDMMYY-MemberID` transaction note. Opens via `window.location.href`. `visibilitychange` listener detects return and shows confirmation dialog prompting user to inform admin. — `generateReceipt()` added to fees page. Opens a print-ready HTML receipt in a new tab with full business header (Taxshila Digital Library, address, phone, email), student info, service table with period, amount, method, and transaction ID. "Receipt" button on every payment row (mobile cards + desktop table).
- [x] **Camera still running after check-in** — `scanner.pause()` doesn't release `getUserMedia`. Fixed by calling `scanner.stop()` + `scanner.clear()` explicitly before `onSuccess()` in `QrScannerOverlay`. Camera light now turns off immediately on scan.
- [x] **Fees page mobile layout** — Responsive padding (`p-3 sm:p-4`), font sizes (`text-xl sm:text-2xl`), badge sizes (`text-sm`), grid gap tightened.
- [x] **Scan to Check In button theme** — Primary tile now uses `from-primary to-primary/80` (theme color, not hardcoded indigo). Ring glow via `ring-2 ring-primary/40`. Removed conflicting `animate-gradient-sweep`.
- [x] **Blur blob performance** — Reduced `filter: blur(100px)` to `blur(60px)` on `.bg-glass-abstract::before/after` pseudo-elements. Cuts GPU fill cost on mid-range phones with negligible visual difference.
- [x] **Lazy-load Recharts in admin dashboard** — All Recharts components are already loaded via `next/dynamic` from `@/components/admin/dashboard-charts` with per-size skeleton fallbacks.
- [x] **Virtualize the Live Students list** — `LiveStudentsList` now uses `@tanstack/react-virtual` (`useVirtualizer`, `ROW_HEIGHT=68`). The component owns its scroll container via `ref`; both the mobile-dialog and desktop-sidebar call sites pass `className` instead of wrapping in their own scroll div.
- [x] **Progressive / skeleton loading on member dashboard** — Split into two phases: student details (name, fee status, tiles) now resolve and render first; alerts + check-in status resolve in a second phase via `Promise.all`.
- [x] **Real-time Firestore listeners for live check-in status** — `subscribeToActiveCheckIn` added to `attendance-client-service.ts`; member dashboard now sets up an `onSnapshot` listener keyed on `studentId` (replaces the `getActiveCheckIn` call in the `Promise.all`). `onSnapshot` exported from `firebase.ts`. Admin dashboard keeps React Query 2-min stale cache (full data load too broad to snapshot cheaply).
- [x] **Image optimisation** — All `<Image>` components now have explicit `width`/`height`; dialog profile pictures have `sizes="(max-width: 640px) 90vw, 400px"`; hero cover image has `sizes="100vw"`.

---

## 3. Architecture & Code Organisation

- [~] **Break down large page components** — Cancelled. File size alone doesn't justify a refactor; current code is readable and the components are tightly coupled to their page context.

---

## 4. Security & Input Validation

All security items resolved (email detection, placehold.co, reviewer backend checks).

---

## 5. Accessibility

- [x] **Add ARIA labels to modal dialogs** — shadcn `Dialog`/`AlertDialog` auto-wires `aria-labelledby`/`aria-describedby` from `DialogTitle`/`DialogDescription`; all dialogs already include these elements.
- [x] **Add ARIA attributes to expandable / interactive sections** — Investigated: no custom collapsible/toggle patterns exist in feedback or notes pages. All interactive expandable UI uses Radix UI Accordion/Dialog which handle `aria-expanded`, `aria-controls`, and `aria-label` automatically. N/A.
- [x] **Add `role="status"` to loading spinners** — All standalone section-level Loader2 spinners have `role="status" aria-label="Loading"`; inline button spinners correctly use `aria-hidden="true"`.

---

## 6. Code Quality

- [x] **Fix inconsistent date handling** — `lastAttendanceDate` was the only outlier: mapped to `.toISOString()` (full datetime) while every other date field used `'yyyy-MM-dd'`. Fixed in both `student-core-service.ts` and `fee-service.ts` to use `format(date, 'yyyy-MM-dd')`. Canonical format is now `'yyyy-MM-dd'` for storage, `date-fns` for display throughout.
- [x] **Consolidate repeated form validation patterns** — Shared base schema extracted to `src/lib/schemas/student.ts`; register page uses `studentRegisterSchema`, edit page uses `studentEditSchema`. `SHIFT_OPTIONS` array also de-duplicated there.

---

## 7. Testing

- [x] **Add unit tests for service layer** — Vitest configured with jsdom + React Testing Library. Tests added for `attendance-client-service` (check-in duplicate prevention, shift boundary, study hours), `fee-service` (Paid/Due/Overdue classification, amountDue, skip inactive), and `isReviewerUser`/`getErrorMessage` utilities. 57 tests across 8 files — all passing.
- [x] **Add integration tests for API routes** — Tests added for `export-data` route (200/zip/Content-Disposition/collection fetch assertions) and `import-data` route (reviewer block, missing fields, students/attendance import, 501 for payments). All passing with firebase-admin and JSZip mocked.
- [x] **Add component smoke tests** — Smoke tests added for `DashboardTile` (8 cases), `LiveStudentsList` (4 cases — skeleton, empty state, render, className), and `CheckInTimer` (3 cases — mount, elapsed time, interval tick). All passing.

---

## 8. Developer Experience

- [x] **Enforce build flags permanently** — `husky` + `lint-staged` installed. Pre-commit hook runs `lint-staged` (eslint --fix on staged `.ts/.tsx`) then `tsc --noEmit`. `prepare: "husky"` added to scripts; `lint-staged` config in `package.json`.
