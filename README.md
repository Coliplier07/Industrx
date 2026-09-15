# Industrx (IronClad)

**Industrx** is a cross-platform mobile and web solution engineered specifically for small to medium-sized industrial contractors, pipeline maintenance teams, and heavy construction operators. Designed for high-speed field entry, remote job sites, and configurable billing workflows.

---

## Project Status & Tech Summary

* **Platform:** Mobile (iOS & Android) + Web, via a single Expo / React Native codebase
* **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions) with Row-Level Security enforcing multi-tenant company scoping on every table
* **Navigation:** Expo Router (File-based Routing, route groups per role/section)
* **Primary Language:** TypeScript (`.tsx`)
* **Styling Framework:** React Native `StyleSheet` (Industrial High-Contrast Palette)
* **Icons:** `@expo/vector-icons` (`Ionicons`)

---

## Key Features & Progress

### Multi-Tenant Companies & Roles
- [x] **Company accounts:** Signing up creates a new company; the signing-up user becomes that company's **admin**.
- [x] **Roles:** `admin`, `pm` (project manager), and `employee`, each with a different dashboard and permission set enforced via Supabase RLS (not just hidden in the UI).
- [x] **Team management:** Admin creates PM/employee accounts with a temporary password via a Supabase Edge Function. Admin can also reassign an employee to a different PM, promote/demote between PM and employee, and permanently delete a team member (requires typing their name to confirm) — all via dedicated Edge Functions, since role/manager changes are blocked from a plain client update to prevent privilege escalation.
- [x] **Company settings:** Name, location, a per-company configurable pay period start day, and an uploadable company logo shown in the header on every screen.

### Admin Dashboard
- [x] **Team screen:** Create/list PM and employee accounts; tap anyone to reassign their PM, change their role, or delete them.
- [x] **Master Rate Sheet:** Labor (Hourly only), Equipment and Vehicle (Hourly / Daily), and Per Diem (a flat Daily amount) categories, with OT rates for labor. A rate's category locks once created — daily logs reference it by category, so changing it after the fact would put it in the wrong bucket. Deleting a rate is safe: existing daily log entries keep their snapshotted name/cost even if the rate sheet item is later removed.
- [x] **Company info:** Editable name, location, pay period, and logo.

### Projects & Field Logging (PM / Admin)
- [x] **Job/project management:** Create, view, and (admin-only) delete projects — deleting requires typing the project's exact name to confirm, since it takes its daily logs and receipts with it.
- [x] **Daily Labor & Equipment Logging:** Labor entries pick a real employee/PM and a labor role from the Rate Sheet (plus an optional per-diem rate); equipment/vehicle entries pick a real Rate Sheet item — no more free-text names. Names are snapshotted at save time, so renaming or removing someone/something from the Rate Sheet later doesn't rewrite already-submitted logs. A flat daily-rate equipment/vehicle entry auto-computes and stores its cost (prorated if hours used exceeds 8).
- [x] **Receipts:** Capture a photo, amount, and date per receipt; view, edit, retake, or delete.
- [ ] **NFC Gas Pump Authorization:** Hardware tag/PIN authorization for on-site fuel stations (*Planned*).

### Employee Hours Tracking
- [x] **Crew Hours (PM / Admin):** Submit ST/OT hours for a whole crew on a given date; a PM submits for their assigned employees (plus themselves), admin can submit for anyone company-wide. Warns before overwriting hours already submitted for that date, and the database itself rejects any future-dated entry (checked against the server's clock, not the device's).
- [x] **Change Requests (PM / Admin):** Review hours an employee flagged — accept their exact requested numbers (auto-approved), dial in different hours and send them back for the employee's approval, or deny and keep the original (the employee then sees it was denied and can only accept, not dispute again).
- [x] **My Hours (Employee, and PM for hours submitted on their behalf):** Browse one pay period at a time with approve / request-change actions per entry, plus a "Needs Your Action" view listing everything outstanding across all pay periods so nothing gets buried behind old weeks.
- [x] **Weekly Report (PM / Admin):** Crew-grouped payroll view for the current pay period only (can't page into the future) — PM sees their own crew, admin sees every crew company-wide grouped by PM (plus an "Unassigned" group). Tap anyone's name for a day-by-day breakdown of that same week.

### Not Yet Built
- [ ] **Messaging:** Messages tab exists but is a placeholder.
- [ ] **Automated Invoicing:** Styled PDF/Excel invoice generator tied to date ranges and snapshot rate sheets. (Per-entry cost calculation for flat daily-rate equipment/vehicle is in place as groundwork; full invoice generation is not.)
- [ ] **Account edit/deactivate & password reset** for Team members.
- [ ] **Offline-first storage / local sync** for remote dead zones.
- [ ] **Localization:** English / Spanish toggling via `i18next`.

---

## Repository Directory Structure

```text
app/                                    # Expo / React Native app
├── app/
│   ├── _layout.tsx                    # Root navigator, ProfileProvider/ProjectsProvider
│   ├── index.tsx                      # Application entry / auth redirect gate
│   ├── (auth)/                        # Authentication route group
│   │   ├── login.tsx                  # Sign-in, redirects by role
│   │   └── create.tsx                 # Account + company creation
│   └── (dashboard)/                   # Role-gated tab navigator
│       ├── (projects)/                # PM/Admin: jobs, daily logs, receipts
│       ├── (admin)/                   # Admin only: company, team, rate sheet
│       ├── (crew-hours)/              # PM/Admin: submit hours, weekly report,
│       │                              #   per-day breakdown, change requests
│       ├── (my-hours)/                # Employee + PM: pay-period hours,
│       │                              #   entry approval, needs-your-action
│       ├── messages.tsx               # Placeholder
│       └── profile.tsx                # Editable profile
├── context/                           # ProfileContext (incl. company logo),
│                                       #   ProjectsContext
├── components/                        # Shared UI (header buttons/title, etc.)
└── lib/                                # supabase client, week/pay-period helpers

supabase/functions/                     # Edge Functions -- admin-create-account,
│                                       #   admin-reassign-employee,
│                                       #   admin-update-role, admin-delete-member
database/                               # SQL migrations, run manually in Supabase SQL Editor
```
