# PWA setup

This upgrade adds the base files needed to make ApplyMate India installable as a Progressive Web App:

- `manifest.webmanifest`
- `service-worker.js`
- `offline.html`
- `pwa-register.js`
- `icons/icon-192.svg`
- `icons/icon-512.svg`

## Final activation step

To activate the PWA on a page, add these lines inside the page `<head>`:

```html
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#2563eb" />
```

Then add this script before `</body>`:

```html
<script src="pwa-register.js" defer></script>
```

For best results, add these to `index.html` first. Later, add them to the dashboard and guide pages too.

## Important note

Service workers only work on HTTPS or localhost. GitHub Pages and Netlify both use HTTPS, so the PWA will work after deployment.
