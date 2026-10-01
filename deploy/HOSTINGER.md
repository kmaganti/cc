# Hostinger production upload

Domain: lightgray-porpoise-608177.hostingersite.com

Use Node.js Web App with framework Express and Node.js 22.
Application root: . (package.json is at the ZIP root)
Install: npm ci
Build: npm run build (or select the build script)
Start: npm start
Startup file: hostinger-start.cjs
Do not select `server/index.js` as the startup file; LiteSpeed loads that file with `require()` and cannot load its top-level ESM await.
Output directory: . if required; this is a server app, not a static public folder.

Environment: NODE_ENV=production, HOST=0.0.0.0, ADMIN_USERNAME=admin,
ADMIN_PASSWORD=your chosen password. Let Hostinger supply PORT.
Set DATA_DIR to a persistent writable directory. Preserve store.json and
public/assets/uploads before replacing a previous deployment.
Notification credentials must be configured separately; see README.md.

Upload this ZIP directly, without placing it inside another folder.
No live payments are collected by this application.
