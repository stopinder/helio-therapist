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
  attention_items: [
    { id: 1, label: 'Next Session', status: 'upcoming', description: 'Tomorrow 2:00 PM', priority: null, due: null },
    { id: 2, label: 'Homework Outstanding', status: 'homework', description: 'Review worksheet', priority: null, due: 'Due today' },
    { id: 3, label: 'PHQ-9 Improving', status: 'measure', description: 'Mild symptoms decreasing', priority: null, due: null },
    { id: 4, label: 'Supervision Action', status: 'supervision', description: 'Review formulation', priority: 'High', due: 'By Friday' }
  ],
  recent_sessions: [
    { id: 1, date: '2026-07-21', type: 'Individual Therapy', note: 'Explored core beliefs.' },
    { id: 2, date: '2026-07-14', type: 'Individual Therapy', note: 'Initial assessment completed.' }
  ],
  goals: [
    { id: 1, text: 'Reduce social anxiety in workplace settings.', status: 'In Progress' },
    { id: 2, text: 'Establish regular mindfulness practice.', status: 'Completed' }
  ],
  recent_documents: [
    { id: 1, name: 'Initial Assessment', date: '2026-07-14', status: 'Final' },
    { id: 2, name: 'Treatment Plan v1', date: '2026-07-15', status: 'Superseded' },
    { id: 3, name: 'Session Note - July 21', date: '2026-07-21', status: 'Draft' },
    { id: 4, name: 'Risk Assessment (Amended)', date: '2026-07-22', status: 'Amended' }
  ],
  timeline_events: [
    { id: 1, type: 'Session completed', date: '2026-07-21 15:00', description: 'Individual Therapy session with Alex Rivera.' },
    { id: 2, type: 'Clinical Summary approved', date: '2026-07-21 16:30', description: 'Weekly clinical summary reviewed and approved.' },
    { id: 3, type: 'Document amended', date: '2026-07-22 10:00', description: 'Risk Assessment amended with new safety plan details.' },
    { id: 4, type: 'Supervision action created', date: '2026-07-24 09:00', description: 'Action: Discuss countertransference in next session.' },
    { id: 5, type: 'Measure completed', date: '2026-07-27 11:00', description: 'PHQ-9 and GAD-7 completed by client.' }
  ],
  upcoming_tasks: [
    { id: 1, text: 'Review PHQ-9 trends', due: '2026-07-28' },
    { id: 2, text: 'Prepare supervision notes', due: '2026-07-27' }
  ]
};
