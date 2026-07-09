# ApplyMate India — Parent / Mentor / AI Review Summary

This file is a simple review guide for anyone who opens the repository link and wants to understand the project quickly.

Repository: https://github.com/koushikrajcodex-boop/applymate-india  
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

---

## 1. What is ApplyMate India?

ApplyMate India is a scholarship management web app for Indian students.

It helps students:

- Find scholarships.
- Check possible eligibility.
- Save scholarships for later.
- Compare scholarship options.
- Track application progress.
- Use dashboard alerts/reminders.

It helps the admin:

- Add scholarship records.
- Edit scholarship records.
- Publish verified scholarships.
- Keep uncertain records as drafts.
- Close expired scholarships.
- Detect bad/duplicate/expired data.
- Use AI/bot-assisted scholarship discovery and import reports.

---

## 2. Technology used

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Authentication | Firebase Authentication |
| Database | Firebase Cloud Firestore |
| Hosting | GitHub Pages |
| Automation | GitHub Actions |
| Data safety | Firestore rules + validation scripts |

---

## 3. Student features currently present

### Login and registration

Students can register and log in using Firebase Authentication.

### Student profile

The dashboard collects:

- State
- Course / education
- Current year
- Category
- Gender
- Disability status
- Annual family income
- Percentage / CGPA

### Personalized recommendations

The dashboard recommends scholarships based on the student profile.

Eligibility matching considers:

- State
- Course
- Category
- Gender
- Income
- Percentage / CGPA
- Disability status
- Deadline status

### Scholarship search and filters

Students can search and filter scholarships by:

- State
- Course / education
- Category
- Gender
- Disability
- Deadline status

### Saved scholarships

Students can save scholarships they want to apply for later.

### Scholarship comparison

Students can compare selected scholarships by eligibility, income limit, deadline, and official portal.

### Application tracker

Students can track application status using:

- 🟢 Not Applied
- 🟡 Applied
- 🔵 Under Review
- ✅ Approved
- ❌ Rejected

---

## 4. Admin features currently present

Admin panel file:

```text
admin.html
```

Admin can:

- View live scholarship analytics.
- Add scholarships.
- Edit scholarships.
- Duplicate scholarship forms.
- Publish scholarships as active.
- Save uncertain scholarships as drafts.
- Close old/expired scholarships.
- Delete invalid scholarship records.
- Export current scholarship data as JSON backup.
- Use filters to manage records.
- View a session activity log.

Admin scholarship form includes:

- Scholarship name
- State
- Status: draft / active / closed
- Amount
- Max income limit
- Minimum percentage
- Deadline text
- Deadline date
- Official link
- Education levels
- Categories
- Genders
- Disability rule
- Eligibility note
- Income note
- Priority score
- Source name

---

## 5. Admin data health system

Data health page:

```text
admin-health.html
```

It is designed to check scholarship data quality, including:

- Duplicate scholarships
- Expired active scholarships
- Missing official links
- Weak verification
- Incomplete records

This is important because scholarship apps can become dangerous if wrong or expired data is shown to students.

---

## 6. AI scholarship bot system

Bot dashboard file:

```text
scholarship-bots-panel.html
```

The AI scholarship bot panel is designed to show:

- Latest AI import report
- Discovery feed
- Source packs
- Imported/refreshed records
- Skipped/duplicate records
- Bot errors
- Automatic active scholarship tracker report

Bot workflow:

```text
Discover sources
→ Score confidence
→ Import safe records
→ Save uncertain records as drafts
→ Track expired records
→ Report results
```

The bot is intentionally safety-first. It should not blindly publish records when the source is weak, incomplete, blocked, duplicated, or expired.

---

## 7. Link analyzer / scholarship import helper

The project also includes scholarship discovery/import helper pages and scripts.

Purpose:

- Accept an official scholarship URL or pasted official text.
- Try to extract scholarship fields.
- Convert the information into the admin Add Scholarship format.
- Avoid creating fake/weak scholarship records.

Important limitation:

Some government websites block browser reading or use dynamic pages. In that case, the tool asks the admin to paste official text manually.

---

## 8. Firestore and security model

Firestore rules file:

```text
firestore.rules
```

The intended safety model:

- Normal students can read public active scholarships.
- Students can manage only their own profile, saved scholarships, and application tracker data.
- Admin-only writes are required for scholarship publishing.
- Active scholarship records should include official source and verification metadata.
- Incomplete or uncertain records should remain drafts.

Important: the rules file in the repository must still be deployed to Firebase to take effect.

---

## 9. Main files to review

| File | Why it matters |
| --- | --- |
| `README.md` | Full project explanation |
| `index.html` | Public homepage |
| `login.html`, `auth.js` | Login/register system |
| `dashboard.html`, `dashboard.js` | Student dashboard features |
| `scholarships.html` | Public scholarship directory |
| `admin.html`, `admin.js` | Admin management system |
| `admin-health.html`, `admin-health.js` | Data quality checks |
| `scholarship-bots-panel.html` | AI bot dashboard |
| `scholarship-bulk-import-dashboard.js` | Bot report dashboard logic |
| `scholarship-discovery.html` | Link analyzer/import helper |
| `scholarship-validator.js` | Data validation logic |
| `scholarship-verification.js` | Verification checks |
| `firestore.rules` | Database security rules |
| `.github/workflows/` | GitHub Actions automation |
| `tools/scholarship-radar.mjs` | Scholarship scanner/radar tool |

---

## 10. What is impressive for a student project?

This project is more than a basic static website because it includes:

- Real authentication.
- Firestore database usage.
- Personalized recommendations.
- Application tracking.
- Admin CRUD features.
- Data validation.
- Data quality checks.
- AI/bot-style scholarship discovery workflow.
- GitHub Actions automation.
- Public live hosting.

For a B.Tech CSE student project, this is a strong full-stack-style portfolio project if tested and polished properly.

---

## 11. What still needs careful review?

A reviewer should check:

1. Whether Firebase rules are actually deployed.
2. Whether admin-only access is properly protected.
3. Whether students can only access their own private data.
4. Whether scholarship records are real and verified from official sources.
5. Whether AI/bot imports are kept as drafts when confidence is low.
6. Whether expired scholarships are hidden or closed correctly.
7. Whether mobile UI works properly.
8. Whether GitHub Actions are passing.
9. Whether the app works after browser cache refresh.
10. Whether error messages are clear for students and admin.

---

## 12. Suggested AI reviewer prompt

Copy and paste this into an AI tool:

```text
Review this GitHub repository and live site as a student software project.

Repository: https://github.com/koushikrajcodex-boop/applymate-india
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

Please evaluate:
1. Whether the project idea is useful and realistic.
2. Whether the student features are clear and working.
3. Whether the admin features are logically designed.
4. Whether Firebase Authentication and Firestore usage look safe.
5. Whether Firestore rules protect private and admin data.
6. Whether the AI scholarship bot/import workflow is safe or risky.
7. Whether the README accurately describes the code.
8. What bugs or security risks remain.
9. What should be improved next.
10. Give a rating out of 10 for a B.Tech CSE student project.
```

---

## 13. Final reviewer note

ApplyMate India is not an official scholarship portal. It should guide students toward official sources, but final eligibility, deadline, document, and application details must always be verified on the official scholarship portal.
