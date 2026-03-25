UPDATE public.jobs 
SET pipeline_stages = '[
  {"order": 1, "name": "Interview Guidelines", "description": "Automated interview guidelines sent to candidate", "isAutomated": true},
  {"order": 2, "name": "CV/Resume", "description": "AI-powered resume screening", "isAutomated": true},
  {"order": 3, "name": "Written Test Slot Booking", "description": "Book slot for written test", "isAutomated": true},
  {"order": 4, "name": "Written Test", "description": "AI-powered MCQ test", "isAutomated": true},
  {"order": 5, "name": "Segment Round Slot Booking", "description": "Book slot for segment round", "isAutomated": false},
  {"order": 6, "name": "Segment Feedback", "description": "Observer evaluation for segment round", "isAutomated": false},
  {"order": 7, "name": "Admin & Academic Round Slot Booking", "description": "Book slot for admin & academic round", "isAutomated": false},
  {"order": 8, "name": "Admin & Academic Feedback", "description": "Observer evaluation for admin & academic round", "isAutomated": false},
  {"order": 9, "name": "HR Round Slot Booking", "description": "Book slot for HR round", "isAutomated": false},
  {"order": 10, "name": "HR Feedback", "description": "Observer evaluation for HR round", "isAutomated": false},
  {"order": 11, "name": "Final Review", "description": "Comprehensive summary and PDF report", "isAutomated": false},
  {"order": 12, "name": "Offer Stage", "description": "Send offer letter", "isAutomated": false}
]'::jsonb
WHERE job_title ILIKE '%principal%' AND id = 'e324c6a1-6c55-47bd-9194-a4a06da6ab55';