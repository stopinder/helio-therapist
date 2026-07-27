export const mockSession = {
  id: 's123',
  clientId: 'c7b3d8e0-f3b1-4b3e-9b3e-0e3e3e3e3e3e',
  clientName: 'Alex Rivera (Mock)',
  type: 'Individual Therapy',
  date: 'July 27, 2026',
  time: '3:00 PM',
  status: 'In Progress',
  videoProvider: 'zoom', // zoom, microsoft_teams, google_meet, custom, in_person
  meetingUrl: 'https://zoom.us/j/123456789',
  isInPerson: false,
  elapsedTime: '00:42:15',
  videoState: 'ready',
  videoError: '',
  transcript: [
    { id: 1, speaker: 'Therapist', timestamp: '00:00:05', text: 'Good afternoon, Alex. How are you feeling today?' },
    { id: 2, speaker: 'Client', timestamp: '00:00:12', text: 'I\'m okay, I guess. A bit anxious about the meeting tomorrow.' },
    { id: 3, speaker: 'Therapist', timestamp: '00:00:25', text: 'I understand. Let\'s talk more about what\'s coming up for you regarding that meeting.' },
    { id: 4, speaker: 'Client', timestamp: '00:01:05', text: 'It\'s just that I feel like I\'m going to be put on the spot, and I won\'t have the right answers.' }
  ],
  markers: [
    { id: 1, time: '00:05:20', label: 'Anxiety Trigger' },
    { id: 2, time: '00:15:45', label: 'Core Belief Identified' }
  ]
};

export const VIDEO_PROVIDERS = {
  zoom: 'Zoom',
  microsoft_teams: 'Microsoft Teams',
  google_meet: 'Google Meet',
  custom: 'Custom link',
  in_person: 'In person'
};
