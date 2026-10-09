# Architecture rules
- Employer plan autopay uses a separate owner-readable consent record and a service-only setter behind an authenticated edge function; this prevents existing auto_renew defaults from authorizing new charges.
- Scheduled wallet renewals lock the subscription and wallet and deduct points, record the transaction, and extend access in one database transaction; this prevents duplicate charges and partial renewals.
- Payment Methods shows wallet-based renewal controls in a focused PlanAutopay component; existing bank-payment flows remain unchanged.
- Candidate bank-autopay setup uses a future-start subscription with a one-time upfront item; mandate authorization never grants paid access, which requires a full recurring charge.
- Employer-to-candidate payment requests use a shared sync helper with signed paid-link/QR events as immediate confirmation, refreshed notification state and provider idempotency keys; retryable webhook errors prevent profile views from being required for delivery.
- Payment email templates are owner-isolated records handled through the authenticated payment-request function; this prevents cross-employer template changes.
- Payment email previews and sends use one escaped-text renderer, with payment links and QR appended by the server; this keeps preview formatting consistent and prevents editable content from replacing payment destinations.
- Employer campaign drafting uses the existing email-generation function separately from sending; generating a draft never sends emails or deducts campaign wallet points.
