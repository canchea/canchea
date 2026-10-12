create index if not exists venue_wallet_transactions_commission_hold_idx
  on public.venue_wallet_transactions (commission_hold_id)
  where commission_hold_id is not null;

create index if not exists venue_wallet_transactions_created_by_idx
  on public.venue_wallet_transactions (created_by)
  where created_by is not null;
