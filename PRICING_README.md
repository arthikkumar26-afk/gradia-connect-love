# Pricing & Demo Request System

This document describes the pricing plans and demo request system implementation.

## Overview

The system includes:
- **Pricing Plans**: Three tiers (Basic, Growth, Scale) with monthly/annual billing
- **Request Demo Form**: Comprehensive form with 15+ fields and validation
- **Admin Panel**: View and manage demo requests

## Files Structure

```
src/
├── utils/
│   └── pricingApi.ts          # Mock API endpoints, plan configs, localStorage
├── pages/employer/
│   ├── Pricing.tsx            # Main pricing page with plans and comparison table
│   ├── RequestDemo.tsx        # Enhanced demo request form
│   └── DemoRequestsAdmin.tsx  # Admin view for managing demo requests
```

## Pricing Plans Configuration

Plans are defined in `src/utils/pricingApi.ts`:

```typescript
export const pricingPlans = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 0,
    annualPrice: 0,
    // ... features
  },
  // ... more plans
];
```

### Current Plans

| Plan | Monthly (INR) | Annual (INR) | Key Features |
|------|---------------|--------------|--------------|
| **Basic** (Free) | ₹0 | ₹0 | 3 job posts, 1 seat, basic tracker |
| **Growth** | ₹7,999 | ₹79,990 | 15 job posts, 5 seats, screening tests, analytics |
| **Scale** | ₹19,999 | ₹199,990 | Unlimited posts & seats, API, priority support |

### Customizing Plans

To modify plans, edit the `pricingPlans` array in `src/utils/pricingApi.ts`:

```typescript
{
  id: 'growth',
  name: 'Growth',
  monthlyPrice: 7999,     // Change pricing here
  annualPrice: 79990,     // Annual pricing
  limits: {
    jobPosts: 'Up to 15', // Change limits
    seats: '5 seats',
  },
  features: [
    'Feature 1',          // Add/remove features
    'Feature 2',
  ],
  cta: 'subscribe',       // 'free' | 'subscribe' | 'contact'
}
```

## Demo Request Form

### Required Fields

The demo form includes comprehensive validation:

- **Personal**: Full name, email, phone, job title
- **Company**: Name, size (dropdown), industry (dropdown), country
- **Preferences**: Demo date/time, mode (video/recorded/on-site)
- **Details**: Number of seats, main goals (textarea)
- **Privacy**: Required checkbox for data policy acceptance

### Form Validation

All validation is defined using Zod schema in `RequestDemo.tsx`:

```typescript
const demoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  businessEmail: z.string().email('Invalid email address'),
  // ... more fields
});
```

### Data Storage

Demo requests are stored in `localStorage` with this structure:

```typescript
interface DemoRequest {
  id: string;
  fullName: string;
  businessEmail: string;
  // ... all form fields
  status: 'new' | 'contacted' | 'scheduled' | 'completed';
  createdAt: string;
  updatedAt: string;
}
```

## Admin Panel

Access the admin panel at `/employer/demo-admin` to:

- View all demo requests in a table
- Filter by status (New, Contacted, Scheduled, Completed)
- Update request status
- See request details (date, company info, preferences)

## Integration with Real Backend

### 1. Replace Mock API Functions

In `src/utils/pricingApi.ts`, replace these mock functions:

```typescript
// Current: Mock localStorage
export const submitDemoRequest = async (data) => {
  // localStorage logic
}

// Replace with: Real API call
export const submitDemoRequest = async (data) => {
  const response = await fetch('/api/demo-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### 2. Payment Gateway Integration

To add real payments (Stripe, Razorpay, etc.):

**Update `Pricing.tsx`:**

```typescript
const handleSelectPlan = async (planId, cta) => {
  // Instead of mockSubscribe()
  const stripe = await loadStripe('YOUR_PUBLISHABLE_KEY');
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/success`,
    cancelUrl: `${window.location.origin}/pricing`,
  });
}
```

### 3. Backend Endpoints Required

You'll need to create these API endpoints:

```
POST   /api/demo-requests          # Create demo request
GET    /api/demo-requests          # List all requests (admin)
PATCH  /api/demo-requests/:id      # Update request status
POST   /api/subscriptions          # Create subscription
GET    /api/subscriptions/:userId  # Get user subscription
```

### 4. Email Notifications

Replace mock email in `pricingApi.ts`:

```typescript
// Add real email service (SendGrid, AWS SES, etc.)
import sgMail from '@sendgrid/mail';

export const submitDemoRequest = async (data) => {
  // ... save to DB
  
  await sgMail.send({
    to: data.businessEmail,
    from: 'noreply@yourcompany.com',
    subject: 'Demo Request Confirmation',
    html: `<p>Thank you ${data.fullName}...</p>`,
  });
}
```

## Routes

Add these routes to `App.tsx`:

```typescript
<Route path="/employer/pricing" element={<Pricing />} />
<Route path="/employer/demo" element={<RequestDemo />} />
<Route path="/employer/demo-admin" element={<DemoRequestsAdmin />} />
```

## Authentication Flow

- **Unauthenticated users**: Clicking "Subscribe" or "Contact Sales" redirects to login
- **Authenticated users**: Proceed directly to checkout/demo form
- **Free plan**: No authentication required, redirects to dashboard after sign-up

## Styling & Accessibility

- Uses Tailwind CSS semantic tokens from `index.css`
- All form inputs have proper labels and ARIA attributes
- Responsive grid layout (mobile/tablet/desktop)
- Keyboard navigation supported
- Error messages display inline with form fields

## Testing

### Test Demo Request Flow

1. Navigate to `/employer/demo`
2. Fill out the form with test data
3. Submit and check localStorage: `localStorage.getItem('demo_requests')`
4. View admin panel at `/employer/demo-admin`

### Test Pricing Flow

1. Navigate to `/employer/pricing`
2. Toggle monthly/annual pricing
3. Click "Subscribe" on Growth plan
4. Should redirect to login if not authenticated
5. After login, mock subscription created in localStorage

## Support

For questions or customization needs, refer to:
- Form validation: `src/pages/employer/RequestDemo.tsx`
- Pricing logic: `src/pages/employer/Pricing.tsx`
- API mocks: `src/utils/pricingApi.ts`
