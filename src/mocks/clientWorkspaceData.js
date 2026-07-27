export const mockClient = {
  id: 'c7b3d8e0-f3b1-4b3e-9b3e-0e3e3e3e3e3e',
  display_name: 'Alex Rivera (Mock)',
  status: 'Active',
  next_appointment: 'Tuesday, July 28 at 2:00 PM',
  primary_therapist: 'Robert Ormiston',
  risk_status: 'Low',
  latest_measures: 'PHQ-9: 8 (Mild), GAD-7: 6 (Mild)',
  outstanding_homework: 'Values exploration worksheet',
  supervision_actions: 'Discuss countertransference in next session',
  docs_awaiting_review: 0,
  recent_sessions: [
    { id: 1, date: '2026-07-21', type: 'Individual Therapy', note: 'Explored core beliefs.' },
    { id: 2, date: '2026-07-14', type: 'Individual Therapy', note: 'Initial assessment completed.' }
  ],
  goals: [
    { id: 1, text: 'Reduce social anxiety in workplace settings.', status: 'In Progress' },
    { id: 2, text: 'Establish regular mindfulness practice.', status: 'Completed' }
  ],
  recent_documents: [
    { id: 1, name: 'Initial Assessment', date: '2026-07-14' },
    { id: 2, name: 'Treatment Plan v1', date: '2026-07-15' }
  ],
  upcoming_tasks: [
    { id: 1, text: 'Review PHQ-9 trends', due: '2026-07-28' },
    { id: 2, text: 'Prepare supervision notes', due: '2026-07-27' }
  ]
};
