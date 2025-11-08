# Placements Workflow Documentation

## Overview

The Placements module provides a comprehensive workflow for managing candidate placements through multiple stages, from application to hiring or rejection. The system includes features for scheduling interviews, background verification (BGV), and offer letter management.

## Features Implemented

### 1. Placements List & Detail View
- **List View**: Displays all placements with job title, candidate name, client, current stage, and last updated date
- **Visual Progress Bar**: Shows the current stage with completed, active, and pending stages visually differentiated
- **Detail View**: Comprehensive view of placement with candidate info, timeline, and stage-specific actions

### 2. Placement Pipeline Stages

The placement lifecycle follows these ordered stages:

1. **Applied**: Initial application submission
2. **Screening Test**: Technical/skills assessment phase
3. **Panel Interview**: Interview scheduling and execution
4. **Feedback**: Post-interview feedback collection
5. **BGV** (Background Verification): Document upload and verification
6. **Confirmation**: Final confirmation before offer
7. **Offer Letter**: Offer generation and candidate response
8. **Hired**: Successful placement completion
9. **Rejected**: Placement rejected at any stage

### 3. Panel Interview Features

When a placement reaches the "Panel Interview" stage:

- **Schedule Meeting Button**: Opens a modal to schedule the interview
- **Meeting Details Form**:
  - Date selection
  - Time selection
  - Timezone specification
  - Participants list (comma-separated)
- **Timeline Update**: Meeting details are added to the placement timeline
- **Visual Indicator**: Scheduled meetings are displayed with a green badge

### 4. Background Verification (BGV)

#### Required Documents Checklist:
- ID Proof
- Address Proof
- Education Certificate
- Experience Letter

#### Candidate Upload UI:
- Document type selector
- File name input (simulated file upload)
- Upload button with loading state
- Document status tracking

#### Employer Verification UI:
- List of pending documents
- Document details (type, filename, upload date)
- Comments field for verification notes
- Verify/Reject buttons
- Status badges (pending/verified/rejected)

### 5. Offer Letter Management

#### Offer Generation:
- Salary package input
- Joining date selection
- Probation period specification
- Custom notes/terms
- Live preview of offer letter
- Send button to deliver offer to candidate

#### Candidate Response:
- Accept: Placement moves to "Hired" stage
- Reject: Placement can be marked as "Rejected" with reason
- Defer: Candidate can propose alternate joining date (future enhancement)

### 6. Timeline & Events

All placement activities are tracked in a comprehensive timeline:
- Stage changes
- Meeting scheduled
- Documents uploaded
- Documents verified/rejected
- Offer sent
- Candidate response

Each event includes:
- Event type
- Date
- Notes/description
- Completed by (user/role)

### 7. Role-Based UI

**Employer View:**
- Full placement management
- Verification controls
- Offer generation
- Stage progression controls

**Candidate View** (can be extended):
- Document upload interface
- Offer acceptance/rejection
- View timeline and status

### 8. Footer Management

The global footer is automatically hidden when users are on:
- `/employer/dashboard/*` routes
- `/candidate/dashboard/*` routes (for future implementation)

## Mock API Endpoints

All functionality currently uses in-browser mock APIs located in `src/utils/mockApi.ts`. These should be replaced with real backend endpoints.

### Available Mock Functions:

```typescript
// Fetch all placements
mockGetPlacements(): Promise<Placement[]>

// Update placement stage
mockUpdatePlacementStage(
  placementId: string, 
  stage: Placement['stage'], 
  notes: string
): Promise<Placement>

// Schedule a meeting
mockScheduleMeeting(
  placementId: string,
  meeting: { date, time, timezone, participants }
): Promise<Placement>

// Upload BGV document
mockUploadBGVDocument(
  placementId: string,
  document: { name, type, fileName }
): Promise<Placement>

// Verify/reject BGV document
mockVerifyBGVDocument(
  placementId: string,
  documentId: string,
  status: 'verified' | 'rejected',
  comments?: string
): Promise<Placement>

// Send offer letter
mockSendOfferLetter(
  placementId: string,
  offer: { salary, joiningDate, probationPeriod, customNotes }
): Promise<Placement>

// Candidate responds to offer
mockRespondToOffer(
  placementId: string,
  response: 'accepted' | 'rejected' | 'deferred',
  deferredDate?: string
): Promise<Placement>

// Reject placement
mockRejectPlacement(
  placementId: string,
  reason: string
): Promise<Placement>
```

## Replacing Mock APIs with Real Endpoints

To integrate with your backend:

1. **Create Real API Functions** in a new file (e.g., `src/api/placements.ts`):

```typescript
import { supabase } from '@/integrations/supabase/client';

export async function getPlacements() {
  const { data, error } = await supabase
    .from('placements')
    .select('*, jobs(*), candidates(*), clients(*)');
  
  if (error) throw error;
  return data;
}

// Implement other endpoints similarly...
```

2. **Update Component Imports**: Replace mock API imports in components:

```typescript
// Before
import { mockGetPlacements } from '@/utils/mockApi';

// After
import { getPlacements } from '@/api/placements';
```

3. **Add Authentication**: Include JWT tokens in API requests:

```typescript
const { data: { session } } = await supabase.auth.getSession();
// Include session.access_token in API headers
```

4. **Handle Real File Uploads** in BGV section:

```typescript
import { supabase } from '@/integrations/supabase/client';

const handleFileUpload = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('bgv-documents')
    .upload(`${placementId}/${file.name}`, file);
  
  if (error) throw error;
  return data;
};
```

## Database Schema Suggestions

When implementing a real backend, consider these tables:

### placements
- id (uuid, primary key)
- job_id (uuid, foreign key)
- candidate_id (uuid, foreign key)
- client_id (uuid, foreign key)
- stage (enum)
- applied_date (timestamp)
- last_updated (timestamp)
- rejection_reason (text, nullable)

### placement_timeline_events
- id (uuid, primary key)
- placement_id (uuid, foreign key)
- stage (text)
- date (timestamp)
- notes (text)
- completed_by (text)
- event_type (enum)

### meetings
- id (uuid, primary key)
- placement_id (uuid, foreign key)
- date (date)
- time (time)
- timezone (text)
- participants (text[])
- scheduled_by (uuid)
- scheduled_at (timestamp)

### bgv_documents
- id (uuid, primary key)
- placement_id (uuid, foreign key)
- name (text)
- type (enum)
- file_name (text)
- file_url (text)
- uploaded_at (timestamp)
- uploaded_by (uuid)
- status (enum)
- verified_by (uuid, nullable)
- verified_at (timestamp, nullable)
- comments (text, nullable)

### offer_letters
- id (uuid, primary key)
- placement_id (uuid, foreign key)
- salary (text)
- joining_date (date)
- probation_period (text)
- custom_notes (text)
- sent_at (timestamp)
- sent_by (uuid)
- candidate_response (enum, nullable)
- response_date (date, nullable)
- deferred_date (date, nullable)
- defer_approval (enum, nullable)

## Testing the Demo

The system comes pre-seeded with 3 sample placements:

1. **Placement 1**: At "Panel Interview" stage - Test meeting scheduling
2. **Placement 2**: At "BGV" stage - Test document upload/verification
3. **Placement 3**: "Hired" status - Shows completed placement with accepted offer

### Demo Flow:

1. Navigate to Employer Dashboard
2. Click "Placements" in the sidebar
3. Select a placement to view details
4. For Panel Interview stage: Click "Schedule Meeting" and fill the form
5. For BGV stage: Upload documents and verify them
6. Move through stages using "Move to [Next Stage]" button
7. At Offer Letter stage: Generate and send offer

## Additional Features (Optional Enhancements)

### Email Notifications
Add toast notifications or actual email integration when:
- Meeting is scheduled
- Document is uploaded/verified
- Offer is sent
- Candidate responds to offer

### CSV Export
Add export functionality for placements list:
```typescript
const exportToCSV = () => {
  // Implementation for CSV export
};
```

### Print-Friendly Offer Letter
Add a print view for offer letters:
```typescript
const printOffer = () => {
  window.print();
};
```

### Defer Management
Implement full defer workflow:
- Candidate proposes new joining date
- Employer approves/rejects defer request
- Update offer letter with new date

## Accessibility Features

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management in modals
- Loading states for async operations
- Confirmation dialogs for destructive actions

## Components Structure

```
src/components/employer/
├── PlacementsContent.tsx        # Main list view
├── PlacementDetail.tsx          # Detail view with timeline
├── ScheduleMeetingModal.tsx     # Meeting scheduling modal
├── BGVSection.tsx               # Document upload/verification
└── OfferLetterModal.tsx         # Offer generation modal
```

## State Management

Currently uses React's built-in state management with:
- `useState` for component-level state
- `useEffect` for data loading
- Props for parent-child communication

For production, consider:
- Context API for global placement state
- React Query for server state management
- Redux/Zustand for complex state needs

## Error Handling

All API calls include try-catch blocks with user-friendly toast notifications:
- Success messages for completed actions
- Error messages for failed operations
- Loading states during async operations

## Next Steps

1. Set up your backend database with the suggested schema
2. Implement real API endpoints
3. Replace mock API calls with real endpoints
4. Add authentication and authorization
5. Implement file upload to cloud storage (S3, Azure Blob, etc.)
6. Add email notification service
7. Implement candidate-facing UI for document uploads and offer responses
8. Add role-based access control
9. Implement analytics and reporting features

## Support

For questions or issues with the Placements module, refer to:
- Component source code with inline comments
- Mock API implementations in `src/utils/mockApi.ts`
- Type definitions in `src/contexts/EmployerContext.tsx`
