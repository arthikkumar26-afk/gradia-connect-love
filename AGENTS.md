# Architecture rules
- Employer plan autopay uses a separate owner-readable consent record and a service-only setter behind an authenticated edge function; this prevents existing auto_renew defaults from authorizing new charges.
- Scheduled wallet renewals lock the subscription and wallet and deduct points, record the transaction, and extend access in one database transaction; this prevents duplicate charges and partial renewals.
- Payment Methods shows wallet-based renewal controls in a focused PlanAutopay component; existing bank-payment flows remain unchanged.