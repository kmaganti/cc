# Cricket Central

## Excel inventory import

In Admin → Inventory, download **Excel template**, fill its Inventory sheet, then choose **Import Excel**. The workbook includes instructions and current category slugs and location columns. Upload an `.xlsx` file up to 5MB with at most 500 products. Preview the changes before confirming. Existing SKUs update, new SKUs create products, and stock values replace current quantities. Prices are in USD. Invalid rows block the whole import; no partial changes are saved. Existing images are preserved. Complete location quantities must sum to Stock. If store data changes after preview, upload again to obtain a fresh preview.

A responsive cricket ecommerce storefront with a Node.js API. The runnable rebuild is in `server/` and `public/index.html`, `public/app.js`, and `public/styles.css`. It requires Node.js 20+ and has no external package dependencies.

## Run

```sh
npm run dev
```

Open http://127.0.0.1:3000. Use `PORT=3001 npm start` to change the port. The server binds to loopback by default. No installation or build step is needed.

```sh
npm run check
npm test
```

Tests use an isolated temporary data directory and HTTP port. They cover catalog/assets, CSRF, option and quantity validation, price tampering, shipping, cart removal, order persistence, idempotency, concurrent stock claims, order privacy, and newsletter validation.

## Included

- Responsive navy, red, and white storefront, category navigation, search, brand/price filters, sorting, and empty states.
- 20 sample products across 10 categories, product options, availability, related products, and browser-local saved items.
- Server-owned shopping bag, accessible bag dialog, quantity updates, free-shipping threshold, and integer-cent totals.
- Clearly labeled demo checkout, input validation, durable sample orders, confirmation, and email/order-number tracking.
- Bat finder, brand directory, sizing help, FAQs, and informational pages.
- Local newsletter signup storage, CSRF tokens, HTTP-only session cookies, restrictive security headers, request limits, and rate limiting.

## Data and configuration

`server/catalog.js` holds sample product content. Orders, stock, and newsletter addresses are saved atomically to `storage/node/store.json`, excluded from version control. Set `DATA_DIR` to change that location. Back it up if the demo records matter. Sessions and bags are memory-only, expire after 24 hours, and reset when the process restarts. Orders survive a restart and can then be found using order number and email.

Use one Node process only: JSON persistence is intended for a local demonstration, not multiple workers or production scale. Inventory is shared across size options. `NODE_ENV=production` enables Secure cookies and requires HTTPS; it does **not** enable live payments. `deploy/node-nginx.conf` is a reverse-proxy starting point, not a complete TLS deployment.

## Live commerce still required

This is a complete **demo shopping flow**, not a live payment or fulfillment service. No card details are collected, no payments are taken, and no physical orders are dispatched. Before launch, connect hosted payments and verified webhooks, authoritative tax/shipping services, a transactional database and persistent sessions, production email delivery, subscription management, and hardened multi-user administration. Verify product details, option-level stock, original product photography, store address/contact information, and commercial policies. Existing reference images are illustrative and several contain cropped legacy UI; replace them with licensed, clean catalog photography for launch.

## Original project review

The original Laravel source remains in `app/`, `bootstrap/`, `database/`, `resources/`, and `routes/` for reference. The Node server does not execute or expose it. Its `public/index.php`, `public/script.js`, and `deploy/nginx.conf` are legacy entrypoints and should not be used for this rebuild. Do not serve the project directory directly.

Review findings:

1. `composer.json` contained invalid JSON quoting in its setup script; this has been corrected, but PHP/Composer are not installed here, so the legacy app was not runtime-tested.
2. Blade templates used classes absent from the stylesheet; some legacy overrides hid hero/collection text entirely.
3. Browser-local cart code and Laravel session cart code represented different carts.
4. Checkout relied on prices previously copied into the session and public confirmation URLs exposed order details without ownership checks.
5. Filters were dropped on sorting, empty states were sparse, and the product reviews were fabricated static values.
6. Existing README deployment claims exceeded the implemented payment, tax, email, and administration capabilities.

The Node rebuild handles the reviewed shopping flows independently. Legacy Laravel controllers are retained unchanged and are not an alternative production backend.

## Inventory administration

Open `/admin` to manage stock and selling prices. The dashboard supports product/SKU/brand search, category and stock-level filters, sorting, CSV export of the current filtered inventory, and the latest 30 adjustments. Low stock means 1–5 units. Every edit requires a reason and stores before/after values in the local data file. Conflicting edits return an error; refresh inventory before retrying. Prices are stored as integer cents and are read by storefront carts and checkout. Stock remains shared across product options.

All admin pages and inventory APIs require login, including localhost. The default account is username `admin`, password `Cricket@2026`. Unauthenticated admin page requests redirect to `/admin/login`; API requests return 401. Override the defaults with `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the server environment. Authenticated sessions last one hour, logout revokes access, and login attempts are limited. Production mode requires HTTPS for cookies. This is a single-admin demo; user accounts, MFA, role-based permissions, and tamper-resistant audit storage remain production work.

Inventory changes are in `storage/node/store.json` and survive process restarts. Reopen/refresh the storefront to fetch updated catalog content. Existing order records keep their original prices. The history records admin adjustments, not checkout stock movements.

## Brand assets

The supplied CricketCentral.png identity is used across the storefront, footer, admin dashboard, login, and browser icon. The transparent extracted logo is `public/assets/cricket-central-logo.png`. Brand colors: navy `#06224b`, red `#e30613`, and white.

Extraction used the built-in image generation tool with this prompt: “Use case: background-extraction. Extract the existing Cricket Central logo from this reference without redesigning it. Retain only the large navy/red C cricket batter and ball emblem plus the CRICKET CENTRAL wordmark directly below it, including the red horizontal accents alongside CENTRAL. Remove the bottom four service icons, their labels, the bottom tagline and all white background. Preserve exact typography, spelling, emblem geometry, navy #06224b and red #e30613 colors. Transparent PNG, tightly framed around the emblem and wordmark with small even padding, no other elements.”

## Customer accounts and order management

Customer registration is at `/account/register`, sign-in at `/account/login`, and personal order history at `/account`. Guest checkout remains available. Passwords use salted scrypt hashes, accounts persist in the data file, and customer sessions use the existing HttpOnly cookie. Sign-in and registration are rate-limited. Customers see only orders linked to their account ID, not arbitrary orders matching their email. Checkout locks an authenticated order to the account email. Guest tracking at `/track-order` requires both email and order number; it does not expose the shipping address. An authenticated customer can add a guest order using its number when its email matches their account. Email verification and password recovery are not yet implemented.

Admin → Orders (`/admin/orders`) lists all orders, supports search and status filters, shows line items and delivery details, and records status history. Fulfillment status is separate from payment status. Current checkout is still demo-only.

| Code | Display label | Allowed next states |
| --- | --- | --- |
| `placed` | Placed | `in_progress`, `cancelled` |
| `in_progress` | In progress | `shipped`, `cancelled` |
| `cancelled` | Cancelled | Final |
| `shipped` | Shipped | `delivered` |
| `delivered` | Delivered | Final |

Cancellation restores the order's stock exactly once. It does not issue a payment refund (no payments are collected). Stale and invalid transitions are rejected. Existing legacy orders without status codes display as Placed. Only new orders queue notifications automatically; existing historical orders are not sent retroactively.

## Email and WhatsApp order notifications

Every new order saves two notification jobs in the same atomic write as the order:

- Email to `orders@cricketcentral.us` with the order, customer, items, total, and shipping details.
- WhatsApp to `+16142144115` (US country code +1) with order number, total, and item quantity.

Resend and Twilio adapters are implemented. They have **not** been configured or live-delivery tested. Setup:

1. Copy `.env.notifications.example` to `.env.local` (Git-ignored and automatically loaded at startup).
2. Set `RESEND_API_KEY` and `ORDER_EMAIL_FROM` using a verified Resend sending domain.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (including `whatsapp:`), and `TWILIO_WHATSAPP_CONTENT_SID`. Use an approved WhatsApp sender/template and ensure the recipient is eligible to receive business notifications.
4. The template must use `{{1}}` for order number, `{{2}}` for formatted USD total, and `{{3}}` for total quantity. Suggested template: “Cricket Central received order {{1}}. Total: {{2}}. Items: {{3}}.” Submit this in the provider console for approval.
5. Set `ORDER_NOTIFICATIONS_ENABLED=true` and restart. New checkout submissions are saved as orders and emailed to `orders@cricketcentral.us`; pending/blocked jobs are processed automatically. Enabling this also sends queued orders, so review them first.

The worker runs at startup, on checkout, and every 30 seconds. States are `pending`, `sending`, `blocked`, `accepted`, `failed`, and `unknown`. Accepted means provider API acceptance, **not delivery**. Provider IDs are stored for investigation; delivery webhooks are not implemented. Missing configuration blocks notifications without losing the order. Admin can retry failed/blocked jobs. A timeout or interrupted request is marked unknown to avoid automatic WhatsApp duplicates; check the provider console before explicitly retrying. Resend requests use idempotency keys. Twilio outcomes after a network interruption cannot be guaranteed exactly once. Orders and fulfillment updates remain usable when notification services fail.

Official integration references: [Resend email API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/changelog/idempotency-keys), [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource), [WhatsApp content templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates).
# Hostinger deployment

## Requirements

- A Hostinger plan with Node.js Web App support.
- The project ZIP: `cricket-central-hostinger.zip`.
- Node.js 20 or newer.
- The domain `lightgray-porpoise-608177.hostingersite.com` attached to the application.

## Upload and configure the application

1. Open **hPanel → Websites → Add Website → Node.js Web App**.
2. Upload `cricket-central-hostinger.zip` or connect the repository.
3. Set the application root to the project root, the folder containing `package.json`.
4. Use these application settings:

   | Hostinger setting | Value |
   | --- | --- |
   | Node.js version | `20` |
   | Framework | `Other` |
   | Build command | `npm install` |
   | Start command | `npm start` |
   | Start file | `server/index.js` |
   | Host | `0.0.0.0` |

   Do not set the application root to `public/`. The Node server serves that directory internally. Do not deploy this rebuild as a PHP/Laravel website.

5. Add the domain `lightgray-porpoise-608177.hostingersite.com` to the Node.js application.
6. Add the environment variables below in **Environment variables**.
7. Click **Deploy** or **Restart**.

## Required environment variables

```env
NODE_ENV=production
HOST=0.0.0.0
DATA_DIR=storage/node
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Cricket@2026
ORDER_NOTIFICATIONS_ENABLED=false
```

`PORT` is supplied by Hostinger and must not be hard-coded. The server reads it automatically.

Change `ADMIN_PASSWORD` before making the site public. The credentials above are the requested initial credentials.

## Email notifications without Twilio

Twilio is only used for WhatsApp. It is not needed for email. Email can use Resend, Hostinger SMTP, Amazon SES, SendGrid, Mailgun, or Postmark.

The current adapter uses Resend. To enable it:

```env
ORDER_NOTIFICATIONS_ENABLED=true
RESEND_API_KEY=your_resend_api_key
ORDER_EMAIL_FROM=Cricket Central <orders@cricketcentral.us>
```

`orders@cricketcentral.us` must be verified with the email provider. Orders are delivered to that address by the server-side notification worker.

WhatsApp is optional. If Twilio is not configured, leave the Twilio variables empty; email and order processing can still work. To use WhatsApp later, configure Twilio or replace the adapter with Meta WhatsApp Cloud API.

## Domain, HTTPS, and first test

After deployment, confirm that Hostinger has attached the domain and issued SSL. Open:

```text
https://lightgray-porpoise-608177.hostingersite.com/
https://lightgray-porpoise-608177.hostingersite.com/account/register
https://lightgray-porpoise-608177.hostingersite.com/track-order
https://lightgray-porpoise-608177.hostingersite.com/admin/login
```

Admin login:

```text
Username: admin
Password: Cricket@2026
```

Create a customer account, add an item to the cart, place a demo order, and verify it appears at `/admin/orders`. Then test guest order tracking using the order number and email address.

## Data and backups

Orders, users, inventory changes, and notification jobs are stored in:

```text
storage/node/store.json
```

The application creates this directory automatically, but it must be writable by the Node process. Back up `store.json` regularly. This application is designed for one Node process; do not run multiple workers against the JSON file.

## Troubleshooting

### 403 Forbidden

The domain is usually configured as a static website instead of a Node.js Web App. Confirm the start file is `server/index.js`, the start command is `npm start`, and the application root contains `package.json`.

### 502 or application stopped

Check Hostinger logs. Confirm Node.js 20 is selected, `HOST=0.0.0.0` is set, and no custom port is configured. Hostinger must provide the `PORT` variable.

### Static files return 404

Set the application root to the project root, not `public/`. The server handles `/`, `/admin`, `/assets/`, CSS, and JavaScript routes.

### Notifications are not sent

Confirm `ORDER_NOTIFICATIONS_ENABLED=true`, the provider API key is valid, and `ORDER_EMAIL_FROM` uses a verified domain. Review notification status in the admin orders screen. A saved order is not lost when a provider is unavailable.

## Local verification before upload

Run from the project root:

```sh
npm run check
npm test
```

For local development:

```sh
npm run dev
```

Then open `http://127.0.0.1:3000`.

### Category upload request too large

Deploy the updated `public/admin.js`, `public/admin.html`, and `server/index.js`, then restart the Node application. Category photos are resized in the browser before upload (PNG/JPEG/WebP originals up to 20MB). For a self-managed Nginx proxy, use `client_max_body_size 9m;` as shown in `deploy/node-nginx.conf` and reload Nginx after validating the configuration. The previous 16KB proxy limit cannot accept normal images. Hostinger managed hosting controls its own proxy configuration; a persistent HTTP 413 after redeployment requires checking that limit with Hostinger. Back up uploaded images as well as store.json before redeployment.
