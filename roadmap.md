# Plan renewal autopay
- [x] Add secure, opt-in wallet-point renewal scheduling with atomic deductions and insufficient-balance handling.
- [x] Add enable/disable controls and renewal details to employer Payment Methods.
- [x] Verify renewal behavior and ownership checks with rollback-only tests; verify payment controls with mocked browser responses (live signed-in integration not tested).

# Candidate nominal autopay confirmation
- [ ] Collect a disclosed ₹1 setup payment and schedule the first full plan charge for the next day.
- [ ] Keep mandate confirmation separate from paid plan activation and verify the setup flow.