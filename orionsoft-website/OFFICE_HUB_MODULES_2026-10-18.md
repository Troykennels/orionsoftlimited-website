# Orion online office: inbox, approvals and client delivery

## Delivered

Open **Office hub** beside Office guide in a signed-in portal.

- Unified inbox: staff notifications, assigned tasks, eligible approvals, client support replies, project activity and applicant updates; search, category filters, personal read state, mark-shown-as-read and saved category preferences. A newer version of an item becomes unread. Limited applicant reference sessions remain limited to their own application(s).
- Approval centre: current pending leave/report/expense reviews link to their original desks. Staff can submit access, equipment, purchase-authorisation and other operational requests, with a decision-needed date. Eligible managers and administrators decide with an attributable note/history. Requesters can cancel pending requests; self-approval and repeat decisions are blocked. Reporting-line changes take effect on the next request.
- Client project workspace: administrators create a draft from an issued client contract and assign active staff. Administrators publish it by setting its status to active. Assigned staff add milestones, publish deliverable links and post client-facing updates. The client can accept a submitted milestone or request changes with a note. Accepted milestones are locked, and every milestone needs client acceptance before the project can be completed. Archived projects are read-only for feedback. Project revision checks reject stale saves rather than overwriting newer work.

## Administration and daily use

1. Sign in to Admin, select Office hub, then Project workspace and New project.
2. Choose the issued contract, delivery team and target date. Create the draft, add milestones, then use Project settings to activate it.
3. Assigned staff open their Staff Office hub to update delivery. Clients open their client hub to review and respond. Drafts stay out of the client portal.
4. Staff use Approval centre, New request for operational requests. Managers see requests allowed by their live reporting permissions; administrators provide a fallback. Existing finance/HR requests keep their established controls.
5. Applicants receive an inbox for their own application updates; they do not receive internal staff/project/approval access.

All project feedback, deliverable links and timeline updates are explicitly client-facing. Internal task notes remain in the original staff task board. Deliverable URLs must be HTTPS without embedded credentials. No real project or operational-request fixture has been added to production.

## Validation

- 75 existing portal/API permission checks and 10 existing office workflow checks pass.
- 23 new workflow scenarios pass (Node reports 24 tests including the parent): live-role revocation, mixed-cookie scope, reporting changes, self-approval, cancellation/history, private drafts, assigned teams, client ownership, unsafe URLs, forged acceptance, change requests/resubmission/sign-off, stale revisions, completion/archive rules, personal read-state isolation, private support notes, scoped applicant access and parallel-write protection.
- Clean release build: 73 public pages and four private portal shells.
- Full browser regression: 77 admin/staff sections and eight signed-in desktop/mobile views pass, including real isolated fixture saves for project creation, operational approval, staff request creation, client milestone acceptance and client feedback. No runtime errors, unexpected HTTP errors, error boundaries or horizontal overflow.
- Updated browser checks also exercise inbox read/preferences and personal-request filtering. Final result is recorded with release evidence.
- Targeted lint passes for the new backend/component modules. The unrelated whole-repository legacy lint baseline is documented in OFFICE_AUDIT_2026-10-18.md.

## Practical limits

This release covers the three priority modules proposed in the conversation. It does not claim to deliver the five other suggested modules. Operational approval records authorisation; it does not automatically provision access or make a payment. Project milestones describe delivery, separate from the existing contract payment schedule. No production contracts were automatically converted to projects: an administrator selects the right contract and team, then publishes.

The hub refreshes each minute while open/visible and when the page becomes visible. Its category preferences filter the hub only. Existing push/email/bell delivery settings remain in their existing controls; these new records do not add an unattended email/SMS/phone-sound delivery channel. External deliverable hosting remains responsible for its own document access permissions. New module fixtures run against disposable in-memory data with outbound provider credentials removed. Real mailbox, payment-settlement and phone permission/sound acceptance are not claimed.

The five pre-existing modified owner files are preserved byte-for-byte and excluded from release commits. Evidence is retained under artifacts/office-hub-release-20261018.
