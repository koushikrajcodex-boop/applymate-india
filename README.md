# ApplyMate India

ApplyMate India is a scholarship finder and personal application-tracking web app for students in India.

## Live demo

https://koushikrajcodex-boop.github.io/applymate-india/

## Features

- Scholarship eligibility filtering
- Keyword search
- Document checklists
- Official application links
- Scholarship guide pages
- Firebase email/password authentication
- Private student profile dashboard
- Saved scholarships
- Application tracker
- WhatsApp sharing
- Responsive interface

## Technology

- HTML
- CSS
- JavaScript modules
- Firebase Authentication
- Cloud Firestore
- GitHub Pages

## Project structure

- `index.html`, `script.js`, `save-results.js`: public scholarship finder
- `login.html`, `auth.js`: account registration and login
- `dashboard.html`, `dashboard.js`: private student dashboard
- `firebase-config.js`: Firebase web client configuration
- `firestore.rules`: Firestore access and validation rules
- `firebase.json`: Firebase CLI configuration
- `.github/workflows/static-checks.yml`: automated JavaScript checks

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

## Firebase setup

1. Create or open the `applymate-india` project in Firebase.
2. Enable Email/Password under Authentication → Sign-in method.
3. Create a Cloud Firestore database.
4. Confirm that `firebase-config.js` contains the correct web-app configuration.
5. Add the GitHub Pages domain to Authentication → Settings → Authorized domains.
6. Deploy the included Firestore rules.

Install the Firebase CLI and sign in:

```bash
npm install -g firebase-tools
firebase login
```

Deploy only the Firestore rules:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

## Security notes

- The Firebase web API key is a client identifier, not a server secret.
- Restrict the key to the Firebase APIs and authorized website domains used by this project.
- Firestore rules permit authenticated users to access only their own profile, saved scholarships, and applications.
- Keep `firestore.rules` in version control and deploy it after every rules change.
- Never place service-account keys or private credentials in this repository.

## Deployment

The static website is deployed through GitHub Pages from the `main` branch. Firestore rules are deployed separately with the Firebase CLI.

## Important notice

ApplyMate India is not an official scholarship portal. Scholarship rules, deadlines, income limits, and required documents may change. Always verify final details on the relevant official portal before applying.

## Contact

koushikrajcodex@gmail.com
