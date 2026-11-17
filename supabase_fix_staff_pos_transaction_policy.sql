drop policy if exists "Role-scoped create transactions" on public.transactions;

create policy "Role-scoped create transactions"
  on public.transactions for insert to authenticated
  with check (
    public.exins_current_role() = 'owner'
    or (
      public.exins_current_role() = 'staff'
      and category = 'POS Sales'
      and order_id is not null
      and exists (
        select 1
        from public.orders o
        where o.id = transactions.order_id
      )
    )
  );
