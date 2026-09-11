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
- [x] **Team management:** Admin creates PM/employee accounts with a temporary password via a Supabase Edge Function; employees are assigned to a PM (`manager_id`).
- [x] **Company settings:** Name, location, and a per-company configurable pay period start day.

### Admin Dashboard
- [x] **Team screen:** Create and list PM/employee accounts for the company.
- [x] **Master Rate Sheet:** Configurable rates across Labor, Equipment, Vehicle, Per Diem, and Upcharge categories (hourly / daily / per-job / percentage), with OT rates for labor.
- [x] **Company info:** Editable name, location, and pay period.

### Projects & Field Logging (PM / Admin)
- [x] **Job/project management:** Create, view, and (admin-only) delete projects.
- [x] **Daily Labor & Equipment Logging:** Form interface with +/- step controls for ST/OT hours and dynamic labor/equipment/vehicle entry rows.
- [x] **Receipts:** Capture a photo, amount, and date per receipt; view, edit, retake, or delete.
- [ ] **NFC Gas Pump Authorization:** Hardware tag/PIN authorization for on-site fuel stations (*Planned*).

### Employee Hours Tracking
- [x] **Crew Hours (PM / Admin):** Submit ST/OT hours for a whole crew on a given date; a PM submits for their assigned employees (plus themselves, no approval needed), admin can submit for anyone company-wide.
- [x] **My Hours (Employee):** Weekly tally of submitted hours with approve / request-change actions per entry; a requested change captures a reason and requested ST/OT.
- [x] **Weekly Report (PM / Admin):** Crew-grouped payroll view for the current pay period — PM sees their own crew, admin sees every crew company-wide grouped by PM (plus an "Unassigned" group).

### Not Yet Built
- [ ] **Messaging:** Messages tab exists but is a placeholder.
- [ ] **Automated Invoicing:** Styled PDF/Excel invoice generator tied to date ranges and snapshot rate sheets.
- [ ] **Account edit/deactivate & password reset** for Team members.
- [ ] **Offline-first storage / local sync** for remote dead zones.
- [ ] **Localization:** English / Spanish toggling via `i18next`.

---

## Repository Directory Structure

```text
ex1/
├── app/
│   ├── _layout.tsx                    # Root navigator, ProfileProvider/ProjectsProvider
│   ├── index.tsx                      # Application entry / auth redirect gate
│   ├── (auth)/                        # Authentication route group
│   │   ├── login.tsx                  # Sign-in, redirects by role
│   │   └── create.tsx                 # Account + company creation
│   └── (dashboard)/                   # Role-gated tab navigator
│       ├── (projects)/                # PM/Admin: jobs, daily logs, receipts
│       ├── (admin)/                   # Admin only: company, team, rate sheet
│       ├── (crew-hours)/              # PM/Admin: submit crew hours, weekly report
│       ├── (my-hours)/                # Employee only: weekly tally, entry approval
│       ├── messages.tsx               # Placeholder
│       └── profile.tsx                # Editable profile
├── context/                           # ProfileContext, ProjectsContext
├── components/                        # Shared UI (header buttons, etc.)
├── lib/                               # supabase client, week/pay-period helpers
└── supabase/functions/                # Edge Functions (e.g. admin-create-account)

database/                              # SQL migrations, run manually in Supabase SQL Editor
```
