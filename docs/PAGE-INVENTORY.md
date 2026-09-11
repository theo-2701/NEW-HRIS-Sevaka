# Inventaris Halaman — prototype → route React

Dibuat dari `src/config/nav.ts`. Kolom **Status** mengikuti field `status` di file itu:
`done` = sudah jadi komponen React, `todo` = masih `PlaceholderPage`.

Prototype: 88 file HTML · Route bernav: 88

> Saat sebuah layar selesai dikonversi: daftarkan route-nya di `src/app/routes.tsx`,
> ubah `status` leaf-nya jadi `'done'` di `src/config/nav.ts`, lalu regenerasi dokumen ini.

## Sudah dikonversi

| Route | Layar | Prototype |
|---|---|---|
| `/auth/login`, `/auth/login/username`, `/auth/login/whatsapp`, `/auth/magic-link-sent`, `/auth/verify`, `/auth/otp`, `/auth/forgot-password`, `/auth/forgot-password/sent`, `/auth/reset-password`, `/auth/reset-password/done` | Auth (L-EMAIL · L-USER · L-WA · MLS · AV · OTP · RP1 · RP-SENT · RP2 · RP-DONE) | `auth.html` + `js/auth.js` |
| `/` | Dashboard | `index.html` + `js/dashboard.js` |

## Employee Profile (ESS)

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/me/files` | Files | `document-ess-files.html` | todo |
| `/me/finance` | Finance | `finance-ess.html` | todo |
| `/me/payroll` | Payroll Info | `payroll-doc-ess.html` | todo |
| `/me/payslip` | Payslip | `payroll-doc-payslip.html` | todo |
| `/me/profile` | Basic Info | `employee-profile.html` | done |
| `/me/profile/additional-info` | Additional Info | `employee-profile.html` | done |
| `/me/profile/emergency-contact` | Emergency Contact | `employee-profile.html` | done |
| `/me/profile/family` | Family | `employee-profile.html` | done |
| `/me/profile/formal-education` | Formal Education | `employee-profile.html` | done |
| `/me/profile/informal-education` | Informal Education | `employee-profile.html` | done |
| `/me/profile/working-experience` | Working Experience | `employee-profile.html` | done |

## Employee Management

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/employees/directory` | Directory | `employee-directory.html` | done |
| `/employees/manpower/requisition` | Requisition | `manpower-requisition.html` | done |
| `/employees/mass-resignation` | Mass Resignation | `mass-resignation.html` | done |
| `/employees/new-joiner` | New Joiner Submission | `new-joiner.html` | done |
| `/employees/organization` | Organization | `employee-directory.html` | done |
| `/employees/ptkp-adjustment` | PTKP Status Adjustment | `ptkp-adjustment.html` | done |
| `/employees/reprimand` | Reprimand List | `reprimand.html` | done |
| `/employees/reprimand/type-setting` | Type Setting | `reprimand-type-setting.html` | done |
| `/employees/transfer` | Employee Transfer | `transition.html` | done |

## Time Management

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/time/attendance` | Attendance | `time-attendance.html` | done |
| `/time/attendance/settings` | Settings | `time-attendance-settings.html` | done |
| `/time/calendar` | Calendar | `time-calendar.html` | done |
| `/time/on-call` | On Call Schedule | `time-oncall.html` | done |
| `/time/on-call/activity` | On Call Activity | `time-oncall-activity.html` | done |
| `/time/overtime` | Overtime | `time-overtime.html` | done |
| `/time/scheduler` | Index | `time-scheduler-index.html` | done |
| `/time/scheduler/schedule` | Schedule | `time-scheduler-schedule.html` | done |
| `/time/time-off/balance` | Time Off Balance | `time-off-balance.html` | done |
| `/time/time-off/requests` | Time Off Request | `time-off-request.html` | done |
| `/time/time-off/settings` | Settings | `time-off-settings.html` | done |

## Finance

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/finance/benefit-reimbursement` | Benefit Reimbursement | `finance-benefit-reimbursement.html` | todo |
| `/finance/cash-advance` | Cash Advance | `finance-cash-advance.html` | todo |
| `/finance/disbursement` | Disbursement & Receivables | `finance-disbursement.html` | todo |
| `/finance/loan` | Loan | `finance-loan.html` | todo |
| `/finance/security` | Finance Security | `finance-security.html` | todo |
| `/finance/settings` | Finance Settings | `finance-settings.html` | todo |

## Payroll

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/payroll/authorization` | Authorization & Handover | `payroll-doc-authorization.html` | todo |
| `/payroll/salary-processing` | Salary Processing | `payroll-doc-processing.html` | todo |
| `/payroll/salary-settings` | Salary Settings | `payroll-doc-settings.html` | todo |

## Productivity

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/productivity/forms` | Forms | `productivity-forms.html` | todo |
| `/productivity/forms/my-submissions` | My Submissions | `productivity-my-submissions.html` | todo |
| `/productivity/payroll-group/groups` | Group List | `productivity-group-list.html` | todo |
| `/productivity/payroll-group/tasks` | Task List | `productivity-task-list.html` | todo |
| `/productivity/projects` | Project | `productivity-projects.html` | todo |
| `/productivity/tasks` | Tasks | `productivity-tasks.html` | todo |
| `/productivity/timesheet/activities` | Activities | `productivity-activities.html` | todo |
| `/productivity/timesheet/report` | Tracker Report | `productivity-tracker-report.html` | todo |
| `/productivity/timesheet/summary` | Summary | `productivity-summary.html` | todo |
| `/productivity/timesheet/tracker` | Time Tracker | `productivity-time-tracker.html` | todo |

## Company Management

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/company-management/assets` | Asset List | `company-assets.html` | todo |
| `/company-management/assets/assigned` | Assigned Assets | `company-assets.html` | todo |
| `/company-management/assets/category` | Asset Category | `company-assets.html` | todo |
| `/company-management/assets/disposal` | Disposal | `company-disposal.html` | todo |
| `/company-management/files/company` | Company Files | `document-company-files.html` | todo |
| `/company-management/files/employee` | Employee Files | `document-employee-files.html` | todo |
| `/company-management/files/other` | Other Files | `document-other-files.html` | todo |
| `/company-management/files/templates` | Document Templates | `document-templates.html` | todo |
| `/company-management/inbox` | Notification (rich inbox) | `inbox.html` | todo |
| `/company-management/notifications` | Notification | `notification-inbox.html` | todo |

## Company

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/company/branch` | Branch | `company-branch.html` | todo |
| `/company/cost-center` | Cost Center | `company-cost-center.html` | todo |
| `/company/grade-class` | Grade & Class | `company-grade-class.html` | todo |
| `/company/group-structure` | Group Structure | `company-group-structure.html` | todo |
| `/company/sbu` | SBU | `company-sbu.html` | todo |
| `/company/vendor` | Vendor | `company-vendor.html` | todo |

## Document

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/documents/access-trail` | Document Access Trail | `document-access-log.html` | todo |
| `/documents/categories` | Category Settings | `document-categories.html` | todo |
| `/documents/letter-issuance` | Letter Issuance | `document-letter-issuance.html` | todo |
| `/verify` | Public Letter Verification | `document-verify.html` | todo |

## System & Settings

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/settings/change-history` | Change History | `settings-change-history.html` | todo |
| `/settings/configuration/document` | Document | `settings-configuration.html` | todo |
| `/settings/configuration/employee` | Employee | `settings-configuration.html` | todo |
| `/settings/configuration/finance` | Finance | `settings-configuration.html` | todo |
| `/settings/configuration/organization` | Organization | `settings-configuration.html` | todo |
| `/settings/configuration/payroll` | Payroll | `settings-configuration.html` | todo |
| `/settings/configuration/performance` | Performance | `settings-configuration.html` | todo |
| `/settings/configuration/productivity` | Productivity | `settings-configuration.html` | todo |
| `/settings/configuration/time` | Time | `settings-configuration.html` | todo |
| `/settings/erasure-requests` | Personal Data Erasure | `settings-erasure-requests.html` | todo |

## Recruitment

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/recruitment` | Home | `recruitment-home.html` | todo |
| `/recruitment/job-listings` | Job Listings | `recruitment-job-listings.html` | todo |

## Performance Management

| Route | Layar | Prototype | Status |
|---|---|---|---|
| `/performance/approvals` | Score Approvals | `performance-approvals.html` | todo |
| `/performance/cycles` | Cycles & Settings | `performance-cycles.html` | todo |
| `/performance/kpi-items` | KPI Master & Weight | `performance-kpi-items.html` | todo |
| `/performance/objections` | Objections | `performance-objections.html` | todo |
| `/performance/reports` | Monitor & Reports | `performance-reports.html` | todo |
| `/performance/sheets` | Review Sheets | `performance-sheets.html` | todo |

## Belum masuk peta nav

Layar ini ada di prototype tapi **tidak punya baris menu** di `js/shell.js`.
Daftar ini dihitung ulang setiap regenerasi — jangan menambah baris menu untuk
layar di sini tanpa keputusan kontrak.

| Prototype | Catatan |
|---|---|
| `add-employee.html` | Dibuka dari tombol di halaman New Joiner, bukan dari menu. |
| `auth.html` | Layar login; di luar shell bernavigasi. |
| `company-asset-detail.html` | Halaman detail aset; bentuk `:id` saat modul Assets dikonversi. |
| `company-integration-contact.html` | Belum punya baris menu di kontrak. |
| `finance-loan-detail.html` | Halaman detail; daftarkan sebagai bentuk `:id` saat modul Finance dikonversi. |
| `index.html` | Dashboard — tile tersendiri di sidebar, bukan baris NAV. |
| `payroll-compliance.html` | Belum punya baris menu di kontrak. |
| `payroll-components.html` | Belum punya baris menu di kontrak. |
| `payroll-processing.html` | Belum punya baris menu di kontrak. |
| `payroll-tax-simulation.html` | Belum punya baris menu di kontrak. |
| `recruitment-add-candidate.html` | Belum punya baris menu di kontrak. |
| `recruitment-create-job-listing.html` | Belum punya baris menu di kontrak. |
| `recruitment-import-log-detail.html` | Halaman detail; bentuk `:id` saat modul Recruitment dikonversi. |
| `recruitment-import-logs.html` | Belum punya baris menu di kontrak. |
| `recruitment-job-listing-detail.html` | Halaman detail; bentuk `:id` saat modul Recruitment dikonversi. |
| `transition-dashboard.html` | Detail transisi — dibuka lewat "View Detail" di daftar Employee Transfer. |
