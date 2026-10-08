# Plan renewal autopay
- [x] Add secure, opt-in wallet-point renewal scheduling with atomic deductions and insufficient-balance handling.
- [x] Add enable/disable controls and renewal details to employer Payment Methods.
- [x] Verify renewal behavior and ownership checks with rollback-only tests; verify payment controls with mocked browser responses (live signed-in integration not tested).

# Candidate nominal autopay confirmation
- [x] Collect a disclosed ₹1 setup payment and schedule the first full plan charge for the next day.
- [x] Keep mandate confirmation separate from paid plan activation; real Razorpay checkout visibly confirmed ₹1 now and yearly full charges, without completing payment.

# Paid Vacancies payment emails
- [x] Add professional payment templates, editable subject/body, saved templates, and preview before sending.
- [x] Verify template editing and preview with example recipient, live owner-scoped storage and cleanup, and escaped payment-mail rendering; current candidate account correctly denied employer API access. No real email or payment sent.
