# ApplyMate India

**Production-focused scholarship finder and application tracker for Indian students.**

ApplyMate India helps students discover verified scholarships, check possible eligibility, plan applications, prepare documents, compare options, save scholarships, and track application progress.

## Current status

| Area | Status |
| --- | --- |
| Public scholarship finder | Firestore-backed |
| Scholarship verification | Active records require verification data |
| Student dashboard | Firestore-only scholarship data |
| Main admin panel | Firebase custom-claim protected |
| Admin data health | Firebase custom-claim protected |
| Data quality tests | Enabled in CI |
| Static legacy dataset | Deleted |
| Canonical directory | `scholarships.html` |

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for the full cleanup status.

## Live demo

https://koushikrajcodex-boop.github.io/applymate-india/

## Key features

- Firestore-backed scholarship eligibility filtering
- Verified active scholarship directory with official source links
- Visible `Last verified` dates on public scholarship cards
- Keyword search and filters
- Document checklist planner
- Application roadmap planner
- Apply First priority planner
- Scholarship comparison tools
- Firebase email/password authentication
- Private student profile dashboard
- Saved scholarships
- Application tracker
- Custom-claim protected admin panel
- Admin data health dashboard
- Data quality tests through GitHub Actions
- Responsive interface

## Reliability upgrades completed

- Removed the homepage static scholarship array.
- Deleted the old static scholarship dataset shim.
- Removed final `scholarships-data.js` imports from dashboard/admin code.
- Rebuilt the main admin panel around Firebase custom claims.
- Removed personal admin email allow-lists from code and Firestore rules.
- Added hard validation for active scholarship verification.
- Added Firestore rules for verified active scholarship writes.
- Added unit tests for validator, schema, and live count logic.
- Consolidated `scholarships-live.html` into the canonical directory.
- Merged the homepage polish patch into `live-count.js` and deleted the patch file.

## Technology

- HTML
- CSS
- JavaScript modules
- Firebase Authentication
- Cloud Firestore
- Firebase security rules
- GitHub Pages
- GitHub Actions

## Project structure

- `index.html`, `script.js`, `home-finder-data.js`: public scholarship finder
- `scholarships.html`: canonical verified scholarship directory
- `scholarship-hub.html`, `scholarship-hub.js`: discovery and comparison hub
- `login.html`, `auth.js`: account registration and login
- `dashboard.html`, `dashboard.js`: private student dashboard and Firestore-only recommendations
- `dashboard-insights.js`: optional dashboard intelligence and verified insight cards
- `admin.html`, `admin.js`: custom-claim protected admin scholarship management
- `admin-health.html`, `admin-health.js`: custom-claim protected admin data health dashboard
- `scholarship-validator.js`, `scholarship-schema.js`, `scholarship-verification.js`: data quality and verification logic
- `live-count.js`, `live-count-utils.js`: homepage live stats and testable count helpers
- `firebase-config.js`: Firebase web client configuration
- `firestore.rules`: Firestore access and validation rules
- `package.json`: test scripts
- `.github/workflows/data-quality.yml`: automated unit tests and data validation

## Run locally

Because the project uses JavaScript modules, serve it through a local web server instead of opening the HTML files directly.

With Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Add `localhost` to Firebase Authentication's authorized domains if required.

## Test locally

```bash
npm test
npm run validate:data
```

## Firebase setup

1. Create or open the `applymate-india` project in Firebase.
2. Enable Email/Password under Authentication → Sign-in method.
3. Create a Cloud Firestore database.
4. Confirm that `firebase-config.js` contains the correct web-app configuration.
5. Add the GitHub Pages domain to Authentication → Settings → Authorized domains.
6. Deploy the included Firestore rules.
7. Set admin users through Firebase custom claims, not email allow-lists.

Install the Firebase CLI and sign in:

```bash
npm install -g firebase-tools
firebase login
```

Deploy only the Firestore rules:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

## Admin custom claims

Admin accounts must have this Firebase Authentication custom claim:

```json
{
  "admin": true
}
```

Firestore admin writes are protected by:

```js
request.auth.token.admin == true
```

See [`docs/admin-custom-claims.md`](docs/admin-custom-claims.md).

## Security notes

- The Firebase web API key is a client identifier, not a server secret.
- Restrict the key to the Firebase APIs and authorized website domains used by this project.
- Firestore rules permit authenticated users to access only their own profile, saved scholarships, and applications.
- Admin scholarship writes require Firebase custom claims.
- Active scholarships require verification data before publishing.
- Keep `firestore.rules` in version control and deploy it after every rules change.
- Never place service-account keys or private credentials in this repository.

## Deployment

The static website is deployed through GitHub Pages from the `main` branch. Firestore rules are deployed separately with the Firebase CLI.

## Important notice

ApplyMate India is not an official scholarship portal. Scholarship rules, deadlines, income limits, and required documents may change. Always verify final details on the relevant official portal before applying.

## Contact

koushikrajcodex@gmail.com
