-- EXINS WORKING Supabase schema
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.bales (
  id text primary key,
  bale_code text not null,
  bale_name text not null,
  category text not null default '',
  supplier_id text not null default '',
  supplier_name text not null default '',
  total_purchase_price numeric not null default 0,
  quantity_purchase numeric not null default 0,
  price_per_piece numeric not null default 0,
  description text not null default '',
  status text not null default 'sealed' check (status in ('sealed', 'opened', 'depleted')),
  total_sales_made numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text not null default '',
  color text not null default '',
  total_in_stock numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default '',
  bale_code text not null default '',
  bale_name text not null default '',
  available_quantity numeric not null default 0,
  selling_price numeric not null default 0,
  cost_price numeric not null default 0,
  size text not null default '',
  image_url text not null default '',
  product_link text not null default '',
  description text not null default '',
  barcode text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  description text not null default '',
  total_bales_sourced numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_accounts (
  id text primary key,
  name text not null,
  monthly_budget numeric not null default 0,
  description text not null default '',
  total_spent numeric not null default 0,
  color text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  account_id text not null default '',
  account_name text not null,
  amount numeric not null default 0,
  date text not null,
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer', 'card')),
  receipt_url text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null,
  customer_name text not null default '',
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  status text not null check (status in ('pending', 'preparing', 'dropped_to_courier', 'completed', 'cancelled')),
  discount numeric not null default 0,
  amount_tendered numeric,
  change_amount numeric,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.transactions (
  id text primary key,
  date text not null,
  flow_type text not null check (flow_type in ('inflow', 'outflow')),
  category text not null default '',
  account text not null default '',
  description text not null default '',
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer', 'card')),
  inflow numeric not null default 0,
  outflow numeric not null default 0,
  order_id text,
  expense_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  customer_name text not null,
  total_purchase numeric not null default 0
);

create table if not exists public.item_logs (
  id text primary key,
  product_id text not null,
  product_name text not null,
  type text not null check (type in ('sold', 'returned', 'damaged', 'lost')),
  quantity numeric not null default 0,
  date text not null,
  notes text,
  created_at timestamptz not null default now(),
  status text,
  found_quantity numeric,
  found_date text,
  found_notes text
);

create table if not exists public.users (
  id text primary key,
  uid text not null unique,
  email text not null,
  display_name text not null,
  role text not null default 'customer' check (role in ('customer', 'staff', 'owner')),
  phone text,
  address text,
  provider text,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

-- Barcode Management was removed; keep the scanner barcode but drop its obsolete status field.
alter table public.products drop column if exists barcode_status;

create index if not exists idx_bales_supplier_id on public.bales (supplier_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_expenses_account_id on public.expenses (account_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_transactions_date on public.transactions (date);
create index if not exists idx_item_logs_product_id on public.item_logs (product_id);

alter table public.bales enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.expense_accounts enable row level security;
alter table public.expenses enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.customers enable row level security;
alter table public.item_logs enable row level security;
alter table public.users enable row level security;

-- Create policies only when they do not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.bales for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.bales for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.categories for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.categories for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.products for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.products for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.suppliers for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.suppliers for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.expense_accounts for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.expense_accounts for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.expenses for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.expenses for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.orders for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.orders for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.transactions for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.transactions for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.customers for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.customers for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.item_logs for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.item_logs for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.users for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.users for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.bales for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.categories for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.products for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.suppliers for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.expense_accounts for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.expenses for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.orders for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.transactions for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.customers for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.item_logs for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.users for select to anon using (true);
  end if;
end $$;

-- In Supabase Auth, set app_metadata.exins_role to admin or staff for the matching
-- pre-provisioned email/password account. Never use user_metadata for role grants.
create or replace function public.exins_current_role()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'exinadmin@gmail.com'
      and auth.jwt() -> 'app_metadata' ->> 'exins_role' = 'admin'
      and auth.jwt() -> 'app_metadata' ->> 'provider' = 'email'
      then 'owner'
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'exinstaff@gmail.com'
      and auth.jwt() -> 'app_metadata' ->> 'exins_role' = 'staff'
      and auth.jwt() -> 'app_metadata' ->> 'provider' = 'email'
      then 'staff'
    else 'customer'
  end;
$$;

revoke all on function public.exins_current_role() from public;
grant execute on function public.exins_current_role() to anon, authenticated;

-- Replace all prior table policies so no permissive demo policy can bypass these rules.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'bales', 'categories', 'products', 'suppliers', 'expense_accounts',
        'expenses', 'orders', 'transactions', 'customers', 'item_logs', 'users'
      ])
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end $$;

-- These fields belonged to the removed online checkout flow. Existing values in
-- these columns are intentionally discarded; POS order rows and sales remain.
drop index if exists public.idx_orders_user_id;
alter table public.orders drop column if exists user_id;
alter table public.orders drop column if exists contact_number;
alter table public.orders drop column if exists email;
alter table public.orders drop column if exists address;
alter table public.orders drop column if exists payment_type;
alter table public.orders drop column if exists down_payment_amount;
alter table public.orders drop column if exists remaining_balance;
alter table public.orders drop column if exists receipt_url;
alter table public.orders drop column if exists courier;
alter table public.orders drop column if exists shipping_note;

-- Replace customer login profiles with one POS purchase summary per normalized name.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'uid'
  ) then
    delete from public.customers;
  end if;
end $$;

drop index if exists public.idx_customers_email;
alter table public.customers add column if not exists customer_name text;
alter table public.customers add column if not exists total_purchase numeric not null default 0;
alter table public.customers drop column if exists uid;
alter table public.customers drop column if exists display_name;
alter table public.customers drop column if exists email;
alter table public.customers drop column if exists phone;
alter table public.customers drop column if exists address;
alter table public.customers drop column if exists role;
alter table public.customers drop column if exists provider;
alter table public.customers drop column if exists is_guest;
alter table public.customers drop column if exists created_at;
alter table public.customers alter column customer_name set not null;

do $$
declare
  source_filter text := '';
  source_column_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'order_source'
  ) into source_column_exists;

  if source_column_exists then
    delete from public.customers;
    source_filter := 'and order_source = ''pos''';
    execute format($query$
      insert into public.customers (id, customer_name, total_purchase)
      select
        normalized_name,
        min(display_name),
        sum(total_amount)
      from (
        select
          regexp_replace(lower(btrim(customer_name)), '\s+', ' ', 'g') as normalized_name,
          btrim(customer_name) as display_name,
          total_amount
        from public.orders
        where status <> 'cancelled'
          and btrim(coalesce(customer_name, '')) <> ''
          and regexp_replace(lower(btrim(customer_name)), '\s+', ' ', 'g')
            not in ('walk-in', 'walk in', 'walk-in customer', 'walk in customer')
          %s
      ) named_sales
      group by normalized_name
      on conflict (id) do update
      set customer_name = excluded.customer_name,
          total_purchase = excluded.total_purchase
    $query$, source_filter);
  end if;
end $$;

alter table public.orders drop column if exists order_source;

create or replace function public.exins_sync_customer_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_key text;
  new_key text;
  new_name text;
  old_amount numeric := 0;
  new_amount numeric := 0;
begin
  if tg_op <> 'INSERT' then
    old_key := nullif(regexp_replace(lower(btrim(coalesce(old.customer_name, ''))), '\s+', ' ', 'g'), '');
    if old_key in ('walk-in', 'walk in', 'walk-in customer', 'walk in customer') then
      old_key := null;
    end if;
    if old_key is not null and old.status <> 'cancelled' then
      old_amount := old.total_amount;
    end if;
  end if;

  if tg_op <> 'DELETE' then
    new_name := nullif(btrim(new.customer_name), '');
    new_key := nullif(regexp_replace(lower(btrim(coalesce(new.customer_name, ''))), '\s+', ' ', 'g'), '');
    if new_key in ('walk-in', 'walk in', 'walk-in customer', 'walk in customer') then
      new_key := null;
    end if;
    if new_key is not null and new.status <> 'cancelled' then
      new_amount := new.total_amount;
    end if;
  end if;

  if old_key is not distinct from new_key and new_key is not null then
    insert into public.customers (id, customer_name, total_purchase)
    values (new_key, new_name, new_amount - old_amount)
    on conflict (id) do update
    set customer_name = excluded.customer_name,
        total_purchase = public.customers.total_purchase + excluded.total_purchase;
    delete from public.customers where id = new_key and total_purchase <= 0;
  else
    if old_key is not null and old_amount <> 0 then
      update public.customers
      set total_purchase = greatest(0, total_purchase - old_amount)
      where id = old_key;
      delete from public.customers where id = old_key and total_purchase <= 0;
    end if;
    if new_key is not null and new_amount > 0 then
      insert into public.customers (id, customer_name, total_purchase)
      values (new_key, new_name, new_amount)
      on conflict (id) do update
      set customer_name = excluded.customer_name,
          total_purchase = public.customers.total_purchase + excluded.total_purchase;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.exins_sync_customer_purchase() from public, anon, authenticated;
drop trigger if exists exins_sync_customer_purchase on public.orders;
create trigger exins_sync_customer_purchase
  after insert or update or delete on public.orders
  for each row execute function public.exins_sync_customer_purchase();

create policy "Store staff manage bales"
  on public.bales for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Showcase read categories"
  on public.categories for select to anon, authenticated using (true);
create policy "Store staff manage categories"
  on public.categories for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Showcase read products"
  on public.products for select to anon, authenticated using (true);
create policy "Store staff manage products"
  on public.products for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Store staff manage suppliers"
  on public.suppliers for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Owner manage expense accounts"
  on public.expense_accounts for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');
create policy "Owner manage expenses"
  on public.expenses for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');

create policy "Role-scoped read orders"
  on public.orders for select to authenticated
  using (public.exins_current_role() in ('owner', 'staff'));
create policy "Role-scoped create orders"
  on public.orders for insert to authenticated
  with check (public.exins_current_role() in ('owner', 'staff'));
create policy "Role-scoped update orders"
  on public.orders for update to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));
create policy "Owner delete orders"
  on public.orders for delete to authenticated
  using (public.exins_current_role() = 'owner');

create policy "Owner read transactions"
  on public.transactions for select to authenticated
  using (public.exins_current_role() = 'owner');
create policy "Role-scoped create transactions"
  on public.transactions for insert to authenticated
  with check (
    public.exins_current_role() = 'owner'
    or (
      public.exins_current_role() = 'staff'
      and category = 'POS Sales'
      and exists (
        select 1 from public.orders o
        where o.id = transactions.order_id
      )
    )
  );
create policy "Owner manage transactions"
  on public.transactions for update to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');
create policy "Owner delete transactions"
  on public.transactions for delete to authenticated
  using (public.exins_current_role() = 'owner');

create policy "Store staff read customer purchase totals"
  on public.customers for select to authenticated
  using (public.exins_current_role() in ('owner', 'staff'));

create policy "Store staff manage item logs"
  on public.item_logs for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Role-scoped read users"
  on public.users for select to authenticated
  using (public.exins_current_role() = 'owner' or uid = (select auth.uid())::text);
create policy "Owner manage users"
  on public.users for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');

drop trigger if exists exins_reserve_customer_order_stock on public.orders;
drop function if exists public.exins_reserve_customer_order_stock();

-- The app currently stores these links as IDs, labels, or JSON values rather than
-- declared foreign keys. Inspect enforced foreign keys in this schema with:
select
  tc.table_name as table_name,
  kcu.column_name as column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule as on_delete
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.constraint_schema = 'public'
order by tc.table_name, kcu.ordinal_position;
