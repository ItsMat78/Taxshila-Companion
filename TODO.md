# Taxshila Companion — Remaining Work

Items are grouped by category and sorted roughly by priority within each group.
Completed items from the April 2026 sessions are **not** listed here.

---

## 1. Build & TypeScript

All TypeScript and `any`-type issues resolved. Build is clean.

---

## 2. Performance

- [x] **Lazy-load Recharts in admin dashboard** — All Recharts components are already loaded via `next/dynamic` from `@/components/admin/dashboard-charts` with per-size skeleton fallbacks.
- [x] **Virtualize the Live Students list** — `LiveStudentsList` now uses `@tanstack/react-virtual` (`useVirtualizer`, `ROW_HEIGHT=68`). The component owns its scroll container via `ref`; both the mobile-dialog and desktop-sidebar call sites pass `className` instead of wrapping in their own scroll div.
- [x] **Progressive / skeleton loading on member dashboard** — Split into two phases: student details (name, fee status, tiles) now resolve and render first; alerts + check-in status resolve in a second phase via `Promise.all`.
- [x] **Real-time Firestore listeners for live check-in status** — `subscribeToActiveCheckIn` added to `attendance-client-service.ts`; member dashboard now sets up an `onSnapshot` listener keyed on `studentId` (replaces the `getActiveCheckIn` call in the `Promise.all`). `onSnapshot` exported from `firebase.ts`. Admin dashboard keeps React Query 2-min stale cache (full data load too broad to snapshot cheaply).
- [x] **Image optimisation** — All `<Image>` components now have explicit `width`/`height`; dialog profile pictures have `sizes="(max-width: 640px) 90vw, 400px"`; hero cover image has `sizes="100vw"`.

---

## 3. Architecture & Code Organisation

- [ ] **Break down large page components** — Two pages are 900+ lines and mix UI, state, and business logic:
  - `src/app/member/dashboard/page.tsx` (~906 lines after dead-import cleanup) — extract `WifiDialog`, `CheckOutCard`, `FeeStatusBanner`, `ScannerDialog` into `src/components/member/` sub-components.
  - `src/app/admin/students/edit/[studentId]/page.tsx` (923 lines) — extract `PaymentHistorySection`, `AttendanceSection`, `ProfileSection`.

---

## 4. Security & Input Validation

All security items resolved (email detection, placehold.co, reviewer backend checks).

---

## 5. Accessibility

- [x] **Add ARIA labels to modal dialogs** — shadcn `Dialog`/`AlertDialog` auto-wires `aria-labelledby`/`aria-describedby` from `DialogTitle`/`DialogDescription`; all dialogs already include these elements.
- [ ] **Add ARIA attributes to expandable / interactive sections** — Admin pages with collapsible cards or toggle sections (feedback, notes) need `aria-expanded`, `aria-controls`, and `aria-label` attributes on their trigger buttons. (Investigated: no collapsible patterns found in feedback/notes pages currently — may be N/A.)
- [x] **Add `role="status"` to loading spinners** — All standalone section-level Loader2 spinners have `role="status" aria-label="Loading"`; inline button spinners correctly use `aria-hidden="true"`.

---

## 6. Code Quality

- [ ] **Fix inconsistent date handling** — `src/services/student-service.ts` mixes ISO strings, formatted strings, and `Date` objects. Define a single canonical format (ISO string for storage, `date-fns` for display) and enforce it throughout the service layer.
- [x] **Consolidate repeated form validation patterns** — Shared base schema extracted to `src/lib/schemas/student.ts`; register page uses `studentRegisterSchema`, edit page uses `studentEditSchema`. `SHIFT_OPTIONS` array also de-duplicated there.

---

## 7. Testing

- [ ] **Add unit tests for service layer** — Zero test files exist. Start with the most critical paths: `attendance-service` (check-in/check-out logic), `fee-service` (due-date calculation, overdue detection), and `isReviewerUser` utility.
- [ ] **Add integration tests for API routes** — `src/app/api/admin/export-data/route.ts` and `src/app/api/admin/import-data/route.ts` have no tests. A broken export could silently corrupt backups.
- [ ] **Add component smoke tests** — At minimum, render tests for `DashboardTile`, `LiveStudentsList`, and `CheckInTimer` to catch prop-type regressions.

---

## 8. Developer Experience

- [ ] **Enforce build flags permanently** — `next.config.ts` now has `ignoreBuildErrors: false` and `ignoreDuringBuilds: false`. Add a pre-commit hook (e.g., via `husky` + `lint-staged`) to run `tsc --noEmit` and `next lint` so errors are caught before they reach the repo.
