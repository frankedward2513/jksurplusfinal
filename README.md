# jksurplusfinal
EXINS: A WEB-BASED SMART INVENTORY MANAGEMENT SYSTEM WITH SALES FORECASTING

## Vercel and Supabase setup

The browser app connects directly to Supabase. In **Vercel → Project → Settings → Environment Variables**, set:

- `VITE_SUPABASE_URL` — the project's Supabase URL (`https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the project's publishable key (a legacy anon key is also supported)

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names are also supported. These are public browser credentials; **never** put a Supabase `service_role` or secret key in a `VITE_` or `NEXT_PUBLIC_` variable.

Select every Vercel deployment environment that needs the database (Production, Preview, and/or Development), save the variables, and **redeploy**. Vite embeds these values when it builds the site, so changing a variable does not update an already-built deployment.

In the Supabase project, run [`supabase_schema.sql`](./supabase_schema.sql) in the SQL Editor to create the app tables and row-level security policies. The app's database roles and policies depend on that schema; do not fix access errors by disabling row-level security.

The current schema declares **no foreign key constraints**. It does contain app-level references: `bales.supplier_id` → `suppliers.id`; `products.category` → `categories.name` and `products.bale_code` → `bales.bale_code`; `expenses.account_id` → `expense_accounts.id`; `users.uid` → Supabase Auth user IDs; `item_logs.product_id` → `products.id`; and `transactions.order_id` / `transactions.expense_id` → `orders.id` / `expenses.id`. Product IDs in `orders.items` are stored inside JSON. These links are not database-enforced relationships. The SQL script ends with a query that lists any enforced foreign keys in the project.

The schema migration removes the obsolete online-checkout columns from `orders` and replaces `customers` login profiles with POS purchase summaries (`customer_name`, `total_purchase`). Existing customer profile rows and values in the removed order columns are deleted. POS orders, their customer names, item details, amounts, and other retained columns are preserved; existing named, non-cancelled POS totals are consolidated by normalized customer name. New or changed orders update the summary automatically.

If data still does not load, check the deployed browser's Developer Tools → Network for requests to `<project-ref>.supabase.co/rest/v1/`:

- No request, or an error saying Supabase is not configured: verify the variable names and that they were set for the deployment environment, then redeploy.
- `401` or `403`: verify the publishable/anon key belongs to the same Supabase project as the URL and that the schema's RLS policies are installed.
- `404` / `PGRST205`: run the schema script against the same Supabase project and confirm the requested table exists in the `public` schema.
- The page loads data once but does not update live: enable the required tables in the Supabase `supabase_realtime` publication.

The app logs database failures in the browser console with the Supabase error code and message.
