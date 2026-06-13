UPDATE public.pricing_config
SET amount_inr = 0,
    label = 'Extra Mock Test',
    description = 'Mock tests are free and do not require extra payment',
    is_active = false,
    updated_at = now()
WHERE action_key = 'extra_mock_test';