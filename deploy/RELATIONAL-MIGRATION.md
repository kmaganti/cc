# Relational PostgreSQL migration

The application currently uses the `cc_store` JSONB aggregate as its compatibility store. The relational migration creates queryable tables and imports the catalog, customers, staff, inventory, locations, orders, order lines, status history, payments, favorites, promotions, notifications, and audit-ready fields without deleting the original data.

## Run on Hostinger

From the project directory, after the PostgreSQL environment variables are configured:

```bash
npm run db:migrate:relational
npm run db:check
```

The migration is transactional and safe to re-run. It uses `ON CONFLICT` upserts for catalog data and keeps `cc_store` intact for rollback. It imports the built-in catalog as well as custom inventory records and marks records in `deletedProducts` with `deleted_at`.

## Main tables

`users`, `staff`, `categories`, `products`, `locations`, `inventory_levels`, `orders`, `order_items`, `order_status_history`, `payments`, `favorites`, `promotions`, `notifications`, and `audit_logs`.

The current runtime remains on the compatibility store until the application read/write layer is switched to these tables. This staged approach allows the database migration to be verified before production traffic is cut over. Do not remove `cc_store` until that cutover and a backup have been verified.
