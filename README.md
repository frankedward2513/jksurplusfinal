# jksurplusfinal
EXINS: A WEB-BASED SMART INVENTORY MANAGEMENT SYSTEM WITH SALES FORECASTING

The dashboard shows up to 10 slow-moving products within each category. Successful create, update, delete, POS, and restore actions show a confirmation popup that stays open until dismissed with **Done**.

The admin navigation's **Others** menu includes a Receipts page with paginated POS receipt history sorted newest to oldest. Receipts can be opened and printed from the table.

## Learning material

- [EXINS system build tutorial (PowerPoint)](./docs/EXINS-System-Build-Tutorial.pptx) — code-first walkthrough of the project setup, React structure, shared state, Supabase data flow, POS, finance, forecasting, Invexa, security, and deployment.

## Vercel and Supabase setup

The browser app connects directly to Supabase. In **Vercel → Project → Settings → Environment Variables**, set:

- `VITE_SUPABASE_URL` — the project's Supabase URL (`https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the project's publishable key (a legacy anon key is also supported)

For OpenRouter-powered chatbot answers and sales forecast insights, set `OPENROUTER_API_KEY` as a server-side environment variable in Vercel. Do not use a `VITE_` or `NEXT_PUBLIC_` prefix for this secret. Both features use the `/api/ai` serverless function and the `OPENROUTER_MODEL` setting; the default model is `nvidia/nemotron-3-ultra-550b-a55b:free`. The server sends a single non-streaming OpenRouter request and returns its response to the existing UI. Without a valid key or when OpenRouter is unavailable, the chatbot and forecast show clearly labeled data-based fallbacks. Redeploy after changing environment variables.

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names are also supported. These are public browser credentials; **never** put a Supabase `service_role` or secret key in a `VITE_` or `NEXT_PUBLIC_` variable.

Select every Vercel deployment environment that needs the database (Production, Preview, and/or Development), save the variables, and **redeploy**. Vite embeds these values when it builds the site, so changing a variable does not update an already-built deployment.

After changing a local `.env`, restart the Vite development server and reload the page; local inventory caches are isolated by Supabase project.

For a new Supabase project, run the single consolidated [`supabase_setup.sql`](../firestore_and_schema_in_exins/supabase_setup.sql) file in the SQL Editor. It creates the app tables and row-level security policies, staff POS transaction policy, admin-only Status Log, and exBIN recycle bin with 30-day retention. The purge job requires the Supabase `pg_cron` extension. Do not disable row-level security to fix access errors.

The setup file does not create Supabase Auth accounts. Create the owner and staff accounts in Supabase Auth, then run the role-assignment block at the bottom of the setup file. Sign out and back in afterward so the refreshed JWT includes the trusted `app_metadata.exins_role` claim. The app and database policies use that claim; a role stored only in `public.users` is not sufficient.

The current schema declares **no foreign key constraints**. It does contain app-level references: `bales.supplier_id` → `suppliers.id`; `products.category` → `categories.name` and `products.bale_code` → `bales.bale_code`; `expenses.account_id` → `expense_accounts.id`; `users.uid` → Supabase Auth user IDs; `item_logs.product_id` → `products.id`; and `transactions.order_id` / `transactions.expense_id` → `orders.id` / `expenses.id`. Product IDs in `orders.items` are stored inside JSON. These links are not database-enforced relationships. The SQL script ends with a query that lists any enforced foreign keys in the project.

The schema migration removes the obsolete online-checkout columns from `orders` and replaces `customers` login profiles with POS purchase summaries (`customer_name`, `total_purchase`). Existing customer profile rows and values in the removed order columns are deleted. POS orders, their customer names, item details, amounts, and other retained columns are preserved; existing named, non-cancelled POS totals are consolidated by normalized customer name. New or changed orders update the summary automatically.

If data still does not load, check the deployed browser's Developer Tools → Network for requests to `<project-ref>.supabase.co/rest/v1/`:

- No request, or an error saying Supabase is not configured: verify the variable names and that they were set for the deployment environment, then redeploy.
- `401` or `403`: verify the publishable/anon key belongs to the same Supabase project as the URL and that the schema's RLS policies are installed.
- `404` / `PGRST205`: run the schema script against the same Supabase project and confirm the requested table exists in the `public` schema.
- The page loads data once but does not update live: enable the required tables in the Supabase `supabase_realtime` publication.

The app logs database failures in the browser console with the Supabase error code and message.

## UML diagrams

- [Application class diagram](./docs/application-class-diagram.md) — Mermaid domain class diagram of EXINS users, inventory, sales, and finance records, with key attributes, operations, and relationships. User roles are values of `UserRole`; they are not modeled as subclasses.
- [Component diagram](./docs/component-diagram.md) — Mermaid diagram of the frontend, application logic, API integrations, and Supabase data layer.
- [Database/schema diagram](./docs/class-diagram.puml) — PlantUML overview of tables and constraints from the supplied schema SQL, plus the corresponding StoreContext and database routine operations.
- [Database ER diagram](./docs/database-erd.puml) — PlantUML view of the Supabase tables, columns, embedded order items, and documented application-level references.
- [Use case diagram](./docs/use-case-diagram.puml) — PlantUML source for the system's visitor, staff, owner, and external-service interactions.
- [Customer activity diagram](./docs/customer-activity-diagram.puml) — PlantUML source for viewing and browsing products, searching, and filtering the public shop showcase by category and maximum budget.
- [Admin activity diagram](./docs/admin-activity-diagram.puml) — PlantUML activity diagram for the store owner's sign-in, dashboard, inventory, POS, finance, forecasting, AI assistant, and shop showcase workflows.
- [Sequence diagrams](./docs/sequence-diagrams/) — PlantUML sequence diagrams with participant lifelines for [Inventory Management](./docs/sequence-diagrams/inventory-management.puml), [Finance Management](./docs/sequence-diagrams/finance-management.puml), the [AI Chatbot](./docs/sequence-diagrams/ai-chatbot.puml), [Sales Forecasting](./docs/sequence-diagrams/sales-forecasting.puml), [POS](./docs/sequence-diagrams/pos.puml), and the [Showcase](./docs/sequence-diagrams/showcase.puml). Render one `.puml` file at a time.
