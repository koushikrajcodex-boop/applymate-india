# ApplyMate India 10/10 Product Roadmap

ApplyMate India should become a trusted scholarship discovery and tracking platform for Indian students.

## Current strengths

- Firebase Authentication is connected.
- Firestore scholarship database is working.
- Dashboard is available.
- Active-only scholarship import page is available.
- Live active scholarship count is available on the homepage.
- Enhanced live scholarship directory page is available.

## 10/10 upgrade goals

### 1. Student experience

- Show live active scholarship count.
- Show scholarships closing this week.
- Show newly added scholarships.
- Show verified badges and deadline countdowns.
- Give clear empty-state messages when no scholarships match.
- Make all pages mobile-first and clean.

### 2. Scholarship discovery

- Use Firestore active scholarship data as the primary source.
- Hide expired scholarships automatically.
- Add sorting: deadline soon, newly added, recently verified, highest amount, recommended.
- Add strong filters: state, education, category, gender, disability, income.
- Add official-source warning on every scholarship card.

### 3. Dashboard

- Fetch student profile from Firestore.
- Show personalized recommendations based on state, education, category, gender, income, percentage, and disability.
- Allow saving scholarships.
- Allow application status tracking.
- Show saved scholarships and application tracker clearly.

### 4. Admin workflow

- Keep old Bulk Assistant for draft/verify imports.
- Use Active Import Assistant only for currently active scholarships.
- Reject invalid active records before writing to Firestore.
- Use duplicate detection by scholarship name.
- Add admin data health checks later.

### 5. Trust and safety

- Keep disclaimer and editorial policy visible.
- Show verified date and official link.
- Never mark a scholarship active unless it has a real deadline and official source.
- Add correction/report link.

### 6. SEO and growth

- Improve page titles and descriptions.
- Add internal links between guides, directory, and dashboard.
- Keep sitemap updated.
- Create scholarship guide pages for major categories.

## Suggested build order

1. Finish live scholarship directory polish.
2. Connect homepage finder to Firestore active scholarships.
3. Improve dashboard recommendations.
4. Add saved scholarships and tracker polish.
5. Add admin data quality dashboard.
6. Add SEO and mobile polish.

## Quality rule

Accuracy beats quantity.

Only active scholarships should be visible to students. Draft or unverified scholarships must stay hidden until verified.
