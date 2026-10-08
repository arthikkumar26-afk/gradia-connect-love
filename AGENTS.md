# Architecture rules
- Employer plan autopay uses a separate owner-readable consent record and a service-only setter behind an authenticated edge function; this prevents existing auto_renew defaults from authorizing new charges.
- Scheduled wallet renewals lock the subscription and wallet and deduct points, record the transaction, and extend access in one database transaction; this prevents duplicate charges and partial renewals.
- Payment Methods shows wallet-based renewal controls in a focused PlanAutopay component; existing bank-payment flows remain unchanged.
- Candidate bank-autopay setup uses a future-start subscription with a one-time upfront item; mandate authorization never grants paid access, which requires a full recurring charge.- Employer-to-candidate payment requests use Razorpay Payment Links with status re-synced from Razorpay (webhook + on view) in a shared helper; this keeps status and success/fail mails consistent and sent once per status.
