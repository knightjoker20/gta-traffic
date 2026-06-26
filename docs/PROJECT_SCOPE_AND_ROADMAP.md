# GTA Traffic Studio — Project Scope & Roadmap

## Core Product Goal

Every feature must support the main purpose of GTA Traffic Studio:

> Make editing GTA traffic easier, clearer, and more fun.

If a feature does not help users understand, organize, edit, test, or enjoy GTA traffic modding, it should be postponed or removed.

---

## Scope Control Rule

Before building any feature, ask:

1. Does this make GTA traffic editing easier?
2. Does this make vehicle/pack organization clearer?
3. Does this reduce confusion or repetitive manual work?
4. Does this support local users, premium users, or admin control in a clear way?
5. Is this needed now, or is it future scope?

If the answer is unclear, the feature goes into the backlog instead of the current sprint.

---

## User Types

### Guest / Free Local User

Purpose: use the tool without an account.

Features:
- Edit traffic files locally in the browser
- Save locally to browser storage
- Export local backups
- Import local backups
- Browse public vehicle/pack information

### Premium User

Purpose: save and sync personal GTA traffic projects.

Features:
- Save workspaces to profile
- Load workspaces across devices
- Save Pack Tracker data to profile
- Save favorites, installed flags, notes, and custom library data
- Access premium curated resources if added later

### Admin / Owner

Purpose: manage the site, cloud database, users, packs, images, and curated content.

Features:
- Manage users and permissions
- Manage cloud workspaces
- Add/edit/archive packs
- Upload and assign vehicle images/photo packs
- Edit curated vehicle library records
- Run safe database cleanup tools
- Review import jobs
- View audit logs

---

## Save Flow Clarity

The site should clearly separate these actions:

### Save Locally

For free/local users.

Meaning:
- Save to this browser only
- No login required
- Data can be exported/imported manually

### Save to Profile

For logged-in/premium users.

Meaning:
- Save to user account/workspace
- Available across devices
- Requires user system and permissions

### Admin Publish to Cloud

For admin/owner use only.

Meaning:
- Publish curated pack/library data to the public cloud database
- Used by public Vehicle Details and shared library pages
- Not the same as user save

---

## Admin Dashboard Purpose

The admin dashboard should start as an ugly-but-functional control center.

It does not need polished public UI at first. It needs to make database and content management safer and easier.

Planned sections:

1. Admin Summary / Health
2. User Management
3. Workspace Management
4. Pack Management
5. Vehicle Library Admin
6. Image / Photo Pack Uploads
7. Import Jobs
8. Database Tools
9. Audit Log

---

## Admin Dashboard Guardrails

Admin tools should prioritize safety:

- Prefer archive/disable over permanent delete
- Use preview/dry-run before large imports
- Log important admin actions
- Keep dangerous database tools owner-only
- Avoid raw SQL tools until audit logging and role permissions exist

---

## Immediate Roadmap

### Step 21 — Pack Tracker Cloud UX Polish

Goal:
Clarify current cloud sync behavior.

Tasks:
- Rename developer cloud sync controls so they are clearly admin-only
- Improve empty-local-data messages
- Separate local save language from cloud publish language

### Step 22 — Admin + User Foundation

Goal:
Create the foundation for users, roles, permissions, and admin control.

Tasks:
- Create admin dashboard shell
- Add admin summary API
- Add user tables
- Add role/plan/status fields
- Add admin audit log
- Add workspace membership structure

### Step 23 — Admin Pack & Library Management

Goal:
Move pack/database maintenance out of the public UI.

Tasks:
- Add/edit/archive packs from admin dashboard
- Manage vehicle-pack memberships
- View duplicate packs
- View orphan memberships
- Export/import pack database safely

### Step 24 — Image / Photo Pack Admin

Goal:
Support curated vehicle images and screenshot packs.

Tasks:
- Add media asset table
- Upload images to R2
- Store image metadata in D1
- Assign images to model names
- Set primary vehicle image
- Review unmapped images

---

## Backlog Parking Lot

Ideas can be useful without being current scope. Park them here until they directly support the product goal.

Backlog examples:
- Premium subscription billing
- Public user profiles
- Community submissions
- Ratings/reviews
- Advanced database SQL console
- Full moderation queue
- Automated image recognition
- AI vehicle classification
