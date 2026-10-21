# QubitFit: product decisions and prototype scope

This document refines the supplied October 2026 PRD. It preserves the product vision and narrows the first validation milestone. The original is retained in [original-prd.txt](original-prd.txt).

The PRD is already strong on domain integrity, privacy, human review, and the modular-monolith approach. The highest-value improvement is a smaller, measurable adoption path: help a gym run a complete working day before expanding into a fitness network.

## 1. First customer and product promise

**Initial customer:** an owner-managed Indian gym or small chain with one to three branches, a reception team, and recurring memberships.

**First promise:** connect enrollment, attendance, classes, follow-ups, and collection visibility in one workspace. Give staff an actionable next step and let the owner trace the result to a record.

Use the operator console as the initial acquisition and retention product. Offer a responsive member portal for bookings, membership visibility, and workout interactions. Native mobile apps, equipment integrations, and the marketplace remain separate milestones rather than prerequisites to validating the core business.

The name QubitFit remains provisional. Branding in this prototype does not establish trademark, company-name, or domain availability.

## 2. Prototype boundary

The prototype is a React and TypeScript web application using seeded demonstration records and browser-local persistence. It is intended to validate navigation, terminology, business flows, and interactions with prospective users.

| Area | Prototype target | Production requirement that remains separate |
| --- | --- | --- |
| Owner overview | Connected metrics, branch context, operational exceptions, and shortcuts to underlying records | Reconciled server-side reporting, historical snapshots, refresh guarantees, and permission filtering |
| Members | Search, enrollment, profile inspection, membership-state changes, and check-in interactions | Verified identity, durable subscriptions, policy-controlled changes, and server-authorized access |
| Sales | A small pipeline with owners, stages, and follow-up actions | Consent evidence, communication-provider delivery, deduplication, and attribution persistence |
| Classes | Session discovery, capacity visibility, reservation, cancellation, and waitlist interactions | Database transactions, concurrent capacity enforcement, credit accounting, and timezone-safe recurrence |
| Finance | Demonstration transactions, payment states, and collection visibility | Gateway integration, webhook verification, idempotency, tax review, settlements, and reconciliation |
| Coaching | Structured program and review interactions, with a member-facing workout experience | Qualified content review, protected health context, validated recommendations, and an evaluation service |
| Copilot and automation | Deterministic, explainable suggestions, previews, approvals, and local outcomes | Authenticated scoped tools, independent authorization, durable jobs, and tamper-resistant audit records |
| Settings | Organization preferences and demo-data export or reset | Secure identity, per-tenant entitlements, retention controls, and recoverable backups |

Browser state is editable and device-local. It does not establish authentication, tenant isolation, secure storage, server-side authorization, booking concurrency guarantees, payment processing, or regulatory compliance. Use fictional records; do not enter actual personal, health, or payment data.

AI suggestions are simulated through deterministic demo behavior. No model quality, churn-prediction accuracy, delivered communication, payment settlement, or autonomous production action is implied by a successful prototype interaction. A member/owner view switch demonstrates a surface change, not a security boundary.

## 3. Tighten the commercial MVP

The original PRD labels many broad modules P0. Split each into a minimum supported behavior and a later extension so “P0 complete” has a stable meaning.

| Include in the first paid pilot | Extend after the pilot proves the workflow |
| --- | --- |
| One organization, branch-aware records, owner/manager/reception/trainer roles | Complex franchise hierarchies, corporate benefits, and custom permission builders |
| A small membership catalog with explicit durations and access rules | Arbitrary entitlement builders and complicated cross-provider packages |
| Enrollment, one validated payment provider, offline collection records, expiry, cancellation, and a documented freeze policy | Multiple gateways, advanced proration, automated accounting exports, and complex commission rules |
| Reception check-in with clear entitlement results | Turnstiles, RFID, biometrics, and offline hardware synchronization |
| Group sessions, bookings, waitlists, cancellation, and attendance | Resource scheduling across multiple equipment pools and sophisticated recurrence editing |
| Lead stages, follow-up tasks, trials, and renewal queues | Campaign optimization and automated multichannel outreach |
| Trainer-assigned templates, session logging, and review | Adaptive AI, wearable-derived recovery, nutrition planning, and movement analysis |
| Defined operational reports, audit records, tested backups, and support procedures | A custom report builder and platform-wide analytical warehouse |

Platform operations still need secure tenant administration and observability. They do not require every proposed super-admin screen before a single gym can pilot the product.

The architecture section says four surfaces but lists member, trainer, staff, platform admin, and public portal responsibilities. Treat these as **five experience surfaces sharing domain services**. They can share a web application and components initially; a separate deployment per persona is unnecessary.

## 4. Acceptance criteria for connected workflows

These criteria define useful product validation. Some can be exercised locally; the production gates explicitly require a backend or external integration.

### Enrollment and collection

1. A receptionist can create a member with required contact and branch fields, choose a plan, and see the price and payment state before confirmation.
2. An unpaid or failed collection does not grant paid membership access. A complimentary arrangement requires a distinct, attributable authorization.
3. A confirmed payment activates only its intended subscription. A second delivery of the same provider event produces no second payment effect or membership activation.
4. The member profile, collection view, receipt, and dashboard agree on the same underlying record.
5. Cancellation, freeze, credit, and refund each retain history and show their effective dates and policy outcome. A refund is a separate financial event.

Prototype payment controls must say that collection is simulated. A local “paid” state is not evidence of money movement.

### Booking, cancellation, and attendance

1. A member sees the branch, instructor, local start time, duration, eligibility, and remaining places before booking.
2. A duplicate reservation is rejected. A full session presents the waitlist state rather than an extra confirmed place.
3. Cancelling a reservation updates the roster and applies the documented credit/refund policy. Promotion from a waitlist rechecks eligibility and communicates the result.
4. Check-in records distinguish successful attendance, duplicate entry, expired membership, and restricted access.
5. In production, simultaneous requests for one remaining place produce at most one confirmed reservation, verified against the database rather than just the interface.

### Lead to member and renewal follow-up

1. A lead can exist without an active membership and retain source, assigned owner, stage, and next action.
2. Converting a lead links to enrollment rather than independently inventing a paid subscription.
3. Expiry dates, outstanding balances, and days since attendance are shown as separate observable signals.
4. A suggested renewal action identifies its target records and why they qualify. Staff can review it before creating tasks or preparing a communication.
5. A promotional send requires the appropriate consent and suppression checks. A draft or local activity entry must never be labeled “delivered.”

### Coaching and member experience

1. A member can distinguish a published trainer-approved plan from a draft recommendation.
2. A recommendation identifies the approved template, equipment assumptions, duration, and reason for the suggestion.
3. Pain, relevant restrictions, or missing constraints route the plan to a qualified reviewer rather than automatically publishing a more demanding workout.
4. Completed workout history remains intact when a future plan changes.
5. The interface distinguishes reported measurements and completed sets from estimates and suggestions.

### Copilot and automation

1. Every business answer shows the reporting period and which records or definitions support it.
2. An action preview states the intended change, affected record count, and whether communication or money movement is involved.
3. Approval, execution, failure, and rejection are distinct states. Refreshing or clicking twice must not repeat a non-repeatable effect.
4. Production authorization runs in the application service even when the UI or model has already requested approval.
5. Model output and free-text member content cannot create arbitrary SQL, change permissions, or authorize financial actions.

## 5. Reporting and intelligence definitions

Avoid a single unexplained “gym health” or “member risk” score. Start with understandable operational signals and publish the definition beside each metric.

| Metric | Proposed definition |
| --- | --- |
| Active memberships | Subscriptions whose access is valid at the reporting timestamp; excludes expired, cancelled, and frozen access where policy suspends entry |
| Net collected | Successful collected amounts minus recorded refunds for the selected period; separate from invoiced revenue and gateway settlement |
| Upcoming renewals | Eligible memberships with an end date in the selected interval, with the interval boundaries stated |
| Attendance | Successful check-in events, with visits and unique visitors reported separately |
| Class utilization | Confirmed places divided by available capacity; attendance utilization is a different measure |
| Follow-up backlog | Open tasks with a due time before the reporting timestamp, excluding completed or cancelled tasks |
| Inactivity signal | Days since the last successful visit, with a stated lookback and an explicit “no history” state |
| Renewal conversion | Eligible expiries followed by a qualifying renewal within a defined window, divided by eligible expiries in the cohort |

Expose branch, time zone, period, data freshness, and denominator. Mark generated demonstration figures as sample data. Do not attribute retention improvements to AI without a baseline and a suitable comparison.

## 6. India-first behavior without blocking expansion

- Store money in integer minor units with an explicit currency; display INR with Indian digit grouping. Show whether a quoted price includes or excludes configured taxes.
- Keep branch time zones as IANA identifiers. Use `Asia/Kolkata` as the initial branch default; store event timestamps in UTC. Display booking dates and expiry policies consistently in branch time.
- Support Indian contact formatting without assuming every future customer has a `+91` number. Normalize international phone numbers in production.
- Provide UPI and supported local payment options through a validated provider. Display gateway-confirmed states independently from settlement states.
- Model GST-related invoice fields and numbering rules explicitly, with qualified tax review before issuing production tax documents. Do not claim that a generated prototype invoice is tax compliant.
- Make currency, tax configuration, branch time zone, labels, and date formatting configurable. Use stable internal status identifiers rather than localized strings as business logic.
- Prepare for English and regional-language content with translatable labels, sufficient text expansion space, and fonts with appropriate script support. Do not promise a translated experience before it has been reviewed.
- Validate the responsive reception workflow on low-cost Android devices and unreliable connections. A browser-local prototype is not a validated offline synchronization system.

## 7. Adoption and interoperability additions

These additions make the software easier to adopt without requiring speculative AI or hardware work.

1. **Migration before feature expansion.** Define a CSV import contract for members, plans, opening balances, and expiries. Include a preview, duplicate rules, field-level validation, an error report, and a reversible import batch. Start with production export; add import only after ownership and reconciliation rules are agreed.
2. **Guided branch setup.** A launch checklist should cover opening hours, membership policies, staff access, booking windows, taxes, payment verification, consent language, and a test enrollment. Track unresolved items before accepting live members.
3. **A day-one reception flow.** Optimize member lookup, entitlement check, check-in, balance visibility, and escalation for keyboard use and small touchscreens. Measure completion time and error recovery with staff.
4. **Clear provider boundaries.** Publish versioned API and webhook contracts, idempotency behavior, supported integration capabilities, and failure/retry semantics. Keep payment, AI, messaging, and access-device providers replaceable through explicit adapters.
5. **Data portability.** Provide scoped, permission-checked exports with clear schemas and audit records. Future participating-gym identity must use separate organization relationships and explicit sharing choices.
6. **Operational recovery.** Specify what staff do during a payment-provider timeout, access-device outage, or delayed sync. Show pending and degraded states rather than silently inventing success.
7. **Feature rollout controls.** Use entitlements and staged feature flags. Introduce AI recommendations as optional assistance before enabling any approved automated actions.

## 8. Accessibility and trust as acceptance gates

Target WCAG 2.2 AA for the production web experience. Validate keyboard navigation, visible focus, dialog focus management, meaningful names, readable contrast, and errors linked to form fields. Status must remain understandable without color alone. Charts need textual values or a data-table alternative; touch targets and layouts need mobile testing.

Avoid dark patterns in renewal consent, cancellation, marketing opt-ins, or health-data sharing. Give members a clear path to change optional preferences. Keep sensitive coaching information separate from commercial signals.

Prototype accessibility and usability checks are useful evidence, but they do not constitute a complete accessibility audit or privacy certification.

## 9. Measured release sequence

| Milestone | Outcome and exit gate |
| --- | --- |
| Interactive prototype | Gym owners and staff can walk through a complete day using fictional data; workflow friction and terminology are recorded |
| Secure transactional foundation | Authenticated API, role and tenant isolation tests, transactional domain operations, provider sandbox integration, backups, and monitoring are verified |
| Single-gym paid pilot | Opening data reconciles; enrollment, collections, attendance, bookings, renewals, and support run through real operational scenarios |
| Repeatable small-chain rollout | Branch setup and migration are repeatable; cross-branch entitlements, support cost, and reports have been validated |
| Assisted intelligence | Human-reviewed recommendations improve a measured baseline without violating constraints; provider failure and cost limits are tested |
| Consumer and integration expansion | Member demand and operational reliability justify native mobile, wearables, or specific hardware integrations |
| Marketplace | Enough verified supply, dependable availability, settlement handling, and support capacity exist to deliver successful bookings |

Do not set calendar commitments from the PRD's planning ranges alone. Size the remaining work against team capacity, integration access, and pilot feedback.

For the pilot, establish baselines for enrollment completion time, check-in success, collection reconciliation, overdue-task backlog, renewal conversion, class attendance, and staff support requests. Define targets after measuring current operations. Measure recommendation acceptance, edits, constraint failures, and cost before making AI outcome claims.

## 10. Production readiness remains a separate decision

The prototype does not satisfy the complete-product definition of done in the original PRD. A production release still requires, at minimum:

- An authenticated backend with tested tenant isolation and object-level authorization.
- Durable relational state, payment verification, idempotency, concurrency controls, and immutable financial history.
- Verified consent and retention behavior, secure storage, reviewed policies, and applicable legal and tax review.
- Reliable notification delivery, provider retry/reconciliation procedures, and auditable approval outcomes.
- Operational monitoring, tested restoration, incident response, support ownership, and deployment rollback.
- Appropriate coaching-content review and an AI evaluation gate before unsupervised recommendation use.
- A pilot gym's validation of complete operational workflows and commercially sustainable support costs.

These are launch gates, not claims about capabilities already implemented in the demonstration.
