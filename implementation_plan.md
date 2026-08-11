# CSWC Hiya Fiesta 2026 - Consolidated Implementation Plan

Based on your feedback, we have a clear picture of the workflow across all remaining modules. This plan covers the Scheduling UI, Jury Management, Mark Entry, Registration flow, and Media Branding.

## 1. Venue & Scheduling UI (Zone Admin)
- **Program Visibility Fix:** Zone Admins will be able to see and schedule the Master Programs created by the Global Admin.
- **Venue & Auto-Schedule System:** We will build a complete interface in `Scheduling & Stages` where Zone Admins can:
  - Create Venues (Stages).
  - Define break times for each Venue.
  - Automatically or manually assign programs to these venues.
  - See conflict warnings (e.g., if a program runs into a break time).
  - Reschedule all subsequent programs on a venue if delays happen.

## 2. Jury Management Workflow
- **Global Admin:** Creates the Master Jury List.
- **Zone Admin:** Selects juries from the Master List for their Zone Festival, and assigns them to specific programs/venues in the schedule.
- **Institutions:** *Clarification needed (see Open Questions).*

## 3. Mark Entry & Scoring
- **Paper Slips:** Juries will **not** enter marks directly into the portal. They will write marks on physical slips.
- **Zone Admin Data Entry:** Zone Admins will collect the physical slips and type the marks into the `Results & Scoring` module.
- **Global Admin Restriction:** Global Admin will be restricted from entering marks directly to prevent micromanaging.

## 4. Registration & Candidate Assignments
- **Mandatory Photos:** When Institutions register students, uploading a candidate photo is now strictly **compulsory**.
- **UID Search:** We will add a "Search by UID" feature in the registration form to make assigning students to programs faster.
- **Locking & Re-opening:** Zone Admins will have a setting to temporarily "open" registration for specific institutions if corrections are needed. Otherwise, SuperAdmin handles exceptions.

## 5. Media & Posters
- **Retain Media Branding:** The `/dashboard/media` section will be kept active so you can upload poster backgrounds and logos. This will power the "Download Program Poster" feature.

---

## Open Questions

> [!WARNING]
> You mentioned: *"intituton can assign the program to jury"*. 
> Did you mean the **Zone Admin** assigns programs to the jury during scheduling? Institutions usually only register students, while the Zone manages the stages and judges. Please clarify if Institutions have any role with the Juries!

## Execution

Click **Proceed** if you approve this consolidated plan, and I will begin building the Venue Scheduler and enforcing the compulsory photo/UID rules!
