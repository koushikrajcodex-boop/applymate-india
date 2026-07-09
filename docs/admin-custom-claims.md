# Admin Custom Claims Setup

ApplyMate India admin writes are protected by Firebase Authentication custom claims.

## Required claim

Admin accounts must have this claim:

```json
{
  "admin": true
}
```

Firestore rules check:

```js
request.auth.token.admin == true
```

Personal email allow-lists must not be used in Firestore rules.

## Client-side behavior

Admin-only pages should check the ID token claim before showing admin data. Non-admin users should be redirected to:

```text
dashboard.html?adminAccess=denied
```

## Setup reminder

Set custom claims from a secure admin environment such as Firebase Admin SDK, not from browser code.

Example Admin SDK shape:

```js
await getAuth().setCustomUserClaims(uid, { admin: true });
```

After setting claims, the user may need to sign out and sign back in or refresh their ID token.

## Follow-up

`admin-health.js` has been moved to custom-claim auth. The main `admin.js` module still needs a careful patch because it is large and controls add/edit/delete/import/export behavior. Track this in Issue #44.
