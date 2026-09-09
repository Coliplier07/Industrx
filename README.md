# IronClad 

**IronClad** is a cross-platform mobile and web solution engineered specifically for small to medium-sized industrial contractors, pipeline maintenance teams, and heavy construction operators. Designed for high-speed field entry, remote job sites, and configurable billing workflows.

---

## Project Status & Tech Summary

* **Platform:** Mobile (iOS & Android) via Expo / React Native
* **Navigation:** Expo Router v3 (File-based Routing with Typed Routes)
* **Primary Language:** TypeScript (`.tsx`)
* **Styling Framework:** React Native `StyleSheet` (Industrial High-Contrast Palette)
* **Icons:** `@expo/vector-icons` (`Ionicons`)

---

##  Key Features & Progress

###  Mobile App (PMs & Foremen)
- [x] **Auth System:** High-contrast Sign-In & Registration screens with session stack management (`router.replace`).
- [x] **PM Dashboard:** Action Grid layout for quick navigation with large touch targets designed for gloved field use.
- [x] **Daily Labor & Equipment Logging:** Form interface with +/- step controls for ST/OT hours and dynamic labor/equipment rows.
- [ ] **Camera & Receipt Uploads:** Field photo documentation and material receipt capturing (*In Progress*).
- [ ] **NFC Gas Pump Authorization:** Hardware tag/PIN authorization for on-site fuel stations (*Planned*).
- [ ] **Localization:** English / Spanish toggling via `i18next` (*Planned*).

###  Web Dashboard (Admin & Billing)
- [ ] **Master Rate Sheet Builder:** Fully configurable rates for labor classifications, machinery, per diem, and OT.
- [ ] **Automated Invoicing:** Styled PDF/Excel invoice generator tied to specific date ranges and snapshot rate sheets.

###  System Architecture & NFRs
- [x] **Offline-First Storage:** Local-first architecture (SQLite / WatermelonDB) to operate seamlessly in remote dead zones.
- [x] **Low Latency Target:** < 100ms UI interaction latency; < 200ms local database commit time.
- [x] **Security & Auditability:** AES-256 local database encryption, TLS 1.3 transit encryption, and snapshot rate history.

---

##  Repository Directory Structure

```text
ironclad-app/
├── app/
│   ├── _layout.tsx            # Root Stack Navigator (Global themes & headers)
│   ├── index.tsx              # Application Entry / Auth Redirect Gate
│   ├── (auth)/                # Authentication Route Group
│   │   ├── login.tsx          # Sign-In Screen
│   │   └── create.tsx         # Account Creation Screen
│   └── (dashboard)/           # PM Dashboard Route Group
│       ├── jobs.tsx           # Dashboard Home (/jobs)
│       └── daily-log.tsx      # Daily Labor/Equipment Entry (/daily-log)
├── assets/                    # App images, logos, and static resources
├── tsconfig.json              # TypeScript configuration
├── app.json                   # Expo configuration & plugins
└── package.json               # Project dependencies & scripts
