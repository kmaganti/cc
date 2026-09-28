# Production upgrade and verification

## Deployment configuration

Install dependencies with `npm ci`, check with `npm run build`, and start with `npm start`. Use Node 22 or newer. Set the following privately in Hostinger environment variables; `.env.local` is for local development only and must never be included in a deployment ZIP.

```
NODE_ENV=production
PGHOST=your-database-host
PGPORT=your-database-port
PGDATABASE=your-database-name
PGUSER=your-database-user
PGPASSWORD=your-database-password
PGSSLMODE=require
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-initial-owner-password
PUBLIC_BASE_URL=https://your-store-domain
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=orders@cricketcentral.us
SMTP_PASS=your-mailbox-password
ORDER_EMAIL_FROM=Cricket Central <orders@cricketcentral.us>
ORDER_NOTIFICATIONS_ENABLED=false
WHATSAPP_ENABLED=false
```

Use `PGSSLROOTCERT` for a private certificate authority if needed. Database TLS certificates are verified. A server without TLS needs a secure tunnel or an explicit `PGSSLMODE=disable` decision; the application does not downgrade automatically. Set `TRUST_PROXY_HOPS` only to the verified number of trusted reverse proxies in front of the application, otherwise leave it at 0.

## Migration and durability

Run `npm run db:check` before starting. Startup creates `cc_store`, `cc_sessions` and `cc_uploads`. The initial JSON data is imported only if there is no existing `cc_store` row. Existing database data always wins. Uploaded files are copied with insert-if-absent semantics; original files and the original JSON store are retained.

PostgreSQL stores commerce data in a JSONB aggregate, sessions in separate rows, and uploaded media as binary records. Application transactions use a shared advisory lock to prevent lost stock updates across instances. Responses are sent only after commits. This is a durable transitional design, not a normalized high-throughput catalog/order schema: requests serialize and a large catalog needs further database decomposition and load testing. Images stored in the database survive application redeployments but increase database backup size.

Before migration, back up the local data and uploads. Back up PostgreSQL with your database provider or `pg_dump` (including all three cc tables); keep backups encrypted off the application host and test restoration to a separate database. No backup schedule or disaster-recovery service has been provisioned by this code change. Do not run multiple versions with incompatible schemas against the same database. Production fails closed if PostgreSQL is not configured. Tests use isolated local JSON data unless explicitly testing PostgreSQL.

## Manual orders and email

Checkout collects phone/email/address, displays estimates, reserves global and location stock, and queues separate team and customer emails. Payments are arranged by staff. Admin payment entries record money already received/refunded; they do not transfer money. Final tax or delivery adjustments still require a confirmed customer agreement; no tax engine or payment gateway is connected.

Configure the mailbox password privately, run `npm run email:check`, then `npm run email:test` to send a single setup email to orders@cricketcentral.us. Confirm inbox receipt. This verifies mail submission separately from business order creation. Enable `ORDER_NOTIFICATIONS_ENABLED=true` only after reviewing queued legacy order emails; enabling delivery can release pending messages. SMTP acceptance is not proof of inbox delivery. Unknown outcomes require mailbox/provider inspection before retrying.

Hostinger SMTP settings: https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/

## Staff, recovery and monitoring

The environment admin password bootstraps the first owner only; after that, staff credentials are stored as salted password hashes. Existing credentials are not overwritten by later environment changes. Owners manage staff roles and can reset other staff passwords. Inventory staff cannot read orders; fulfillment staff cannot record payments or manage staff. Role changes/disable revoke the affected staff sessions. Password recovery emails use single-use 30-minute tokens and revoke customer sessions after a successful reset. Configure PUBLIC_BASE_URL before sending recovery emails.

`/health` checks database connectivity and returns 503 when unavailable. Admin → Monitoring lists storage mode, email configuration, queue counts and failures. Connect an external uptime/alerting service to /health and review delivery failures. External alerting, MFA, SSO, full browser coverage, carrier labels, returns workflows and accounting integrations are not included in this upgrade.

Admin → Promotions supports discount codes with expiration and usage limits. Only one order code applies at a time; it also applies to sale items. There is no automatic campaign sending. Newsletter subscriptions are stored without a marketing campaign integration.
