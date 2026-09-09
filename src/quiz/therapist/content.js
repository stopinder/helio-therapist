export const DISCLAIMER = 'This is a reflective exercise, not a validated assessment of therapeutic competence, personality or clinical suitability.'
export const BOUNDARY_NOTE = 'This report is not clinical supervision, accreditation, a fitness-to-practise assessment, a diagnosis or evidence of suitability for a particular modality.'
export const REPORT_VERSION = 'therapist-reflection-v1-draft1'

export const dimensions = [
  {
    id: 'structure', label: 'Session organisation',
    negative: {
      label: 'agreed structure',
      observation: 'selecting an agreed focus, sequence or way of reviewing the work',
      strength: 'An agreed structure may make the work easier to follow and return to.',
      risk: 'A useful structure can also make unexpected material easier to overlook. The question is when a plan is serving the encounter and when it is narrowing it.',
      question: 'How do I recognise when an agreed structure needs to make room for something neither of us anticipated?'
    },
    positive: {
      label: 'an emerging process',
      observation: 'allowing the direction and sequence of the session to emerge from the material',
      strength: 'An emerging process may leave room for meanings that neither person could have planned.',
      risk: 'Openness may become difficult to navigate when the client needs a more visible thread. This is a question about fit in a particular encounter, not a defect in openness.',
      question: 'How do I distinguish useful openness from a session whose direction has become unclear to the client?'
    }
  },
  {
    id: 'direction', label: 'Direction-setting',
    negative: {
      label: 'offering a direction',
      observation: 'making your own proposed direction available for the client to consider',
      strength: 'Making your thinking available may provide orientation and something concrete with which a client can agree or disagree.',
      risk: 'A well-intended offer can occupy more space than expected. It may be useful to notice whether the client can genuinely revise or decline it.',
      question: 'What tells me that a client is choosing an offered direction rather than accommodating me?'
    },
    positive: {
      label: 'client-led direction',
      observation: 'giving the client the lead in deciding what to pursue',
      strength: 'Client-led direction may protect room for the client’s priorities and authorship.',
      risk: 'Some requests for your contribution may be lost if every choice is returned to the client. A useful distinction is between preserving agency and withholding a potentially helpful view.',
      question: 'When does returning a choice support agency, and when might it leave the client carrying more uncertainty than they wanted?'
    }
  },
  {
    id: 'mode', label: 'Working mode',
    negative: {
      label: 'conceptual exploration',
      observation: 'working through ideas, distinctions and shared accounts of experience',
      strength: 'Conceptual exploration may give an experience language and make it easier to examine together.',
      risk: 'An explanation can become more coherent without the client’s lived experience changing. This possibility is worth checking rather than assuming.',
      question: 'How do we recognise the difference between an account becoming clearer and the experience itself becoming different?'
    },
    positive: {
      label: 'experiential exploration',
      observation: 'working with feelings, sensations, enactment or immediate experience',
      strength: 'Experiential exploration may make aspects of an experience available that are difficult to reach through explanation alone.',
      risk: 'An evocative experience is not necessarily an integrated or useful one. Its meaning to the client still needs room, including a preference not to work in this way.',
      question: 'How do I learn whether an experiential invitation was useful for this client, rather than simply vivid?'
    }
  },
  {
    id: 'time', label: 'Time emphasis',
    negative: {
      label: 'the present situation',
      observation: 'starting with current situations and what is happening now',
      strength: 'Attention to the present may keep the work close to what the client is encountering in daily life.',
      risk: 'A present-focused account may leave an important developmental context unexplored. That does not mean historical work is always needed.',
      question: 'What would tell me that an earlier context matters here, even when the immediate work is useful?'
    },
    positive: {
      label: 'developmental context',
      observation: 'exploring how present experience connects with earlier learning or relationships',
      strength: 'Developmental exploration may place a current difficulty within a more intelligible personal context.',
      risk: 'Historical understanding can become a requirement the client does not share. Improvement need not wait for a complete account of origins.',
      question: 'How do I check that exploring origins is useful to this client now, rather than primarily satisfying my wish to understand?'
    }
  },
  {
    id: 'meaning', label: 'Meaning-making',
    negative: {
      label: 'tentative interpretation',
      observation: 'bringing a provisional explanatory idea into the shared inquiry',
      strength: 'A tentative interpretation may connect experiences and offer a useful idea to test together.',
      risk: 'Even a provisional explanation can begin to organise what both people notice. Disconfirming experiences need a genuine place in the conversation.',
      question: 'How would I notice that a formulation had become persuasive without becoming more accurate?'
    },
    positive: {
      label: 'described experience',
      observation: 'staying close to how an experience is described before offering an explanation',
      strength: 'Staying with description may preserve details that an early explanation would otherwise smooth over.',
      risk: 'Waiting for description can also postpone sharing a helpful provisional idea. Restraint is not automatically more collaborative than making an interpretation available.',
      question: 'When does staying with description deepen understanding, and when might sharing a tentative idea help us think further?'
    }
  },
  {
    id: 'aim', label: 'Immediate therapeutic aim',
    negative: {
      label: 'trying a change',
      observation: 'using the encounter to support an experiment, adjustment or next action',
      strength: 'An emphasis on change may connect the conversation to something the client can try and review.',
      risk: 'Movement can arrive before its meaning is sufficiently understood. A next step need not become a requirement to demonstrate progress.',
      question: 'How do I check that the wish for movement belongs to the client as well as to me?'
    },
    positive: {
      label: 'deepening understanding',
      observation: 'allowing understanding to deepen before requiring an action or adjustment',
      strength: 'An emphasis on understanding may leave room for complexity without making every encounter produce a task.',
      risk: 'Understanding can become an indefinite destination when the client is asking for something to change. The distinction needs negotiation rather than a rule about the right pace.',
      question: 'How do we know when further understanding remains useful and when the client is asking to try something different?'
    }
  }
]

export const reportSections = [
  { id: 'stance', title: 'Your therapeutic stance' },
  { id: 'work', title: 'How you tend to work' },
  { id: 'expertise', title: 'Your relationship with expertise' },
  { id: 'clients', title: 'What clients may experience' },
  { id: 'strengths', title: 'Likely strengths' },
  { id: 'tensions', title: 'Possible tensions or blind spots' },
  { id: 'limits', title: 'When your usual style may be less helpful' },
  { id: 'supervision', title: 'Questions to take into supervision' },
  { id: 'identity', title: 'A possible description of your therapeutic identity' }
]
