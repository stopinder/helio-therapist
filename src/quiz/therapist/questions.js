// New content only. No imports from the retired ADHD/investigation quiz.
// Editorial weights are provisional organising rules, not psychometric measurements.
export const QUIZ_VERSION = 'therapist-style-v1-draft1'
export const CONTEXT_ANSWER = 'context'
export const CONTEXT_LABEL = 'I cannot choose a usual response in this situation.'

/** @typedef {{ id: string, text: string, weights: Record<string, number> }} Option */
/** @typedef {{ id: string, title: string, text: string, options: Option[] }} Question */

/** @type {Question[]} */
export const therapistQuestions = [
  {
    id: 'q01', title: 'Being asked for advice',
    text: 'A client asks, “What do you honestly think I should do?” Several responses could be appropriate. Which would usually be your first move?',
    options: [
      { id: 'a', text: 'Offer a provisional suggestion and discuss a small next step the client could try.', weights: { direction: -2, aim: -2 } },
      { id: 'b', text: 'Invite the client to explore what makes the choice difficult and decide where that exploration goes.', weights: { direction: 2, aim: 2 } },
      { id: 'c', text: 'Help the client choose an action using their own priorities, without recommending an option yourself.', weights: { direction: 2, aim: -2 } },
      { id: 'd', text: 'Offer your understanding of the dilemma as a starting point for thinking together, without moving immediately to a decision.', weights: { direction: -2, aim: 2 } }
    ]
  },
  {
    id: 'q02', title: 'A request for a diagnosis',
    text: 'A client asks whether a diagnosis might explain their difficulties. Staying within your role and competence, where would you tend to begin the conversation?',
    options: [
      { id: 'a', text: 'Outline a tentative clinical formulation, including its limits, and invite the client to consider whether it helps.', weights: { direction: -2, meaning: -2 } },
      { id: 'b', text: 'Invite the client to lead with the experiences they want recognised and what a diagnostic name would mean to them.', weights: { direction: 2, meaning: 2 } },
      { id: 'c', text: 'Offer a focused set of questions about their actual experiences before considering an explanatory framework.', weights: { direction: -2, meaning: 2 } },
      { id: 'd', text: 'Ask which explanations the client has considered and let their response guide a shared exploration of those possibilities.', weights: { direction: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q03', title: 'An emotionally intense session',
    text: 'The client is emotionally engaged and able to remain in contact with you. After checking that continuing feels manageable, which way of working would you most naturally offer?',
    options: [
      { id: 'a', text: 'Agree a short sequence for making sense of the event, the thoughts involved and what it means to the client.', weights: { structure: -2, mode: -2 } },
      { id: 'b', text: 'Stay with the felt experience and allow the session to develop from what becomes noticeable.', weights: { structure: 2, mode: 2 } },
      { id: 'c', text: 'Suggest a bounded experiential exercise, with a clear beginning and ending, that the client can accept or decline.', weights: { structure: -2, mode: 2 } },
      { id: 'd', text: 'Follow the ideas and meanings the client brings, without setting a sequence in advance.', weights: { structure: 2, mode: -2 } }
    ]
  },
  {
    id: 'q04', title: 'A fluent explanation',
    text: 'A client describes a painful experience fluently in ideas and explanations. You are curious about this way of speaking, without assuming that it is avoidance. What would you tend to explore first?',
    options: [
      { id: 'a', text: 'Offer a tentative idea about how making sense of things intellectually may organise this experience, and discuss whether it fits.', weights: { mode: -2, meaning: -2 } },
      { id: 'b', text: 'Invite attention to what they notice in their voice, body or feelings while speaking, without first explaining it.', weights: { mode: 2, meaning: 2 } },
      { id: 'c', text: 'Clarify the distinctions and meanings in their account, staying close to their own description.', weights: { mode: -2, meaning: 2 } },
      { id: 'd', text: 'Suggest a brief experiential exploration informed by a tentative hypothesis about the pattern, then check what actually happens.', weights: { mode: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q05', title: 'A prolonged silence',
    text: 'There is a prolonged silence. Nothing suggests an immediate safety concern, and you do not yet know what the silence means. Which response feels most natural?',
    options: [
      { id: 'a', text: 'Offer a focused question to help put possible meanings of the silence into words.', weights: { direction: -2, mode: -2 } },
      { id: 'b', text: 'Leave room for the client to decide when to speak and what they noticed in the silence.', weights: { direction: 2, mode: 2 } },
      { id: 'c', text: 'Invite a brief shared attention to the immediate experience of sitting quietly together.', weights: { direction: -2, mode: 2 } },
      { id: 'd', text: 'Ask whether the client would prefer to think together about the silence or take the conversation somewhere else.', weights: { direction: 2, mode: -2 } }
    ]
  },
  {
    id: 'q06', title: 'Being credited for change',
    text: 'A client says, “Working with you has changed things for me.” After acknowledging what they have said, what would you most want to understand?',
    options: [
      { id: 'a', text: 'Whether a tentative account of the recent therapeutic process helps explain what has changed.', weights: { time: -2, meaning: -2 } },
      { id: 'b', text: 'How this experience of receiving help compares with earlier important relationships, in the client’s own words.', weights: { time: 2, meaning: 2 } },
      { id: 'c', text: 'What feels different in the client’s life now, before proposing an explanation for it.', weights: { time: -2, meaning: 2 } },
      { id: 'd', text: 'Whether the change can be understood as a shift in a longstanding way of relating or understanding themselves.', weights: { time: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q07', title: 'A strong but uncertain hypothesis',
    text: 'You have a strong hypothesis about the work, but the evidence is limited. You remain willing to be wrong. What would you tend to do with it?',
    options: [
      { id: 'a', text: 'Agree a focused way to examine the tentative formulation over the next few sessions, including evidence against it.', weights: { structure: -2, meaning: -2 } },
      { id: 'b', text: 'Set the formulation aside for now and follow further descriptions as they emerge.', weights: { structure: 2, meaning: 2 } },
      { id: 'c', text: 'Organise a careful description of specific situations before deciding whether a formulation is needed.', weights: { structure: -2, meaning: 2 } },
      { id: 'd', text: 'Hold the hypothesis provisionally in the background and revisit it when relevant material arises.', weights: { structure: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q08', title: 'A request for exercises',
    text: 'A client asks for something more concrete to do in therapy. Before settling on a format, which offer would be most characteristic of you?',
    options: [
      { id: 'a', text: 'Suggest a particular exercise and a clear way to try and review it, with the client’s agreement.', weights: { structure: -2, direction: -2 } },
      { id: 'b', text: 'Invite the client to choose a useful direction, then develop the activity together as the session unfolds.', weights: { structure: 2, direction: 2 } },
      { id: 'c', text: 'Co-design a repeatable practice in which the client chooses the focus and how progress will be reviewed.', weights: { structure: -2, direction: 2 } },
      { id: 'd', text: 'Offer an improvised in-session exploration that responds to what is happening now rather than a set routine.', weights: { structure: 2, direction: -2 } }
    ]
  },
  {
    id: 'q09', title: 'Working within a time limit',
    text: 'You and the client have a small, agreed number of sessions remaining. Several useful directions remain possible. What would you usually favour?',
    options: [
      { id: 'a', text: 'Make a session-by-session plan around a current recurring difficulty.', weights: { structure: -2, time: -2 } },
      { id: 'b', text: 'Let the client’s emerging material determine which links with earlier experience receive attention.', weights: { structure: 2, time: 2 } },
      { id: 'c', text: 'Agree a bounded review of how earlier learning connects with the concern that brought them here.', weights: { structure: -2, time: 2 } },
      { id: 'd', text: 'Keep each session open to the current situations that feel most relevant as they arise.', weights: { structure: 2, time: -2 } }
    ]
  },
  {
    id: 'q10', title: 'A pattern between you',
    text: 'Something in the therapeutic relationship seems to repeat an important pattern. Which invitation would you be most likely to make first?',
    options: [
      { id: 'a', text: 'Name a specific interaction you have noticed between you and invite examination of it here and now.', weights: { direction: -2, time: -2 } },
      { id: 'b', text: 'Ask what feels familiar from earlier relationships and let the client choose which connection to pursue.', weights: { direction: 2, time: 2 } },
      { id: 'c', text: 'Invite the client to describe what seems to be happening between you now and decide where to take that conversation.', weights: { direction: 2, time: -2 } },
      { id: 'd', text: 'Propose looking at the history of a recurring relational pattern through what is happening in this relationship.', weights: { direction: -2, time: 2 } }
    ]
  },
  {
    id: 'q11', title: 'A recurring apprehension',
    text: 'A client repeatedly feels apprehensive in situations that matter to them. You have agreed to explore this further. Which starting point most appeals?',
    options: [
      { id: 'a', text: 'Map the thoughts, predictions and meanings associated with recent situations.', weights: { mode: -2, time: -2 } },
      { id: 'b', text: 'Attend to how earlier experiences are felt or remembered as the client speaks about the apprehension.', weights: { mode: 2, time: 2 } },
      { id: 'c', text: 'Build a shared account of how these meanings developed through earlier experiences.', weights: { mode: -2, time: 2 } },
      { id: 'd', text: 'Notice the feelings, sensations and impulses present while the client describes a recent example.', weights: { mode: 2, time: -2 } }
    ]
  },
  {
    id: 'q12', title: 'Understanding without much movement',
    text: 'The client says, “I understand it better, but things still feel much the same.” What would you tend to offer next?',
    options: [
      { id: 'a', text: 'Use the shared understanding to design a small practical experiment and review what follows.', weights: { mode: -2, aim: -2 } },
      { id: 'b', text: 'Explore what “still the same” feels like, without requiring that exploration to produce an immediate shift.', weights: { mode: 2, aim: 2 } },
      { id: 'c', text: 'Revisit the account you have built together to find what is still unexplained or does not fit.', weights: { mode: -2, aim: 2 } },
      { id: 'd', text: 'Invite an in-session rehearsal or experiential experiment with a different response.', weights: { mode: 2, aim: -2 } }
    ]
  },
  {
    id: 'q13', title: 'A session without an urgent issue',
    text: 'The client arrives without an urgent issue. Within your existing therapeutic agreement, how would you tend to shape the session?',
    options: [
      { id: 'a', text: 'Return to an agreed goal and choose a tangible next step to work on.', weights: { structure: -2, aim: -2 } },
      { id: 'b', text: 'Follow whatever begins to feel significant, leaving the direction of understanding open.', weights: { structure: 2, aim: 2 } },
      { id: 'c', text: 'Agree one focused question to understand more deeply, without requiring a practical task.', weights: { structure: -2, aim: 2 } },
      { id: 'd', text: 'Follow the material that emerges and use any opening for trying something different.', weights: { structure: 2, aim: -2 } }
    ]
  },
  {
    id: 'q14', title: 'Improvement without an origin story',
    text: 'A client reports meaningful improvement, although you have not explored much of its history. There is no assumption that more historical work is necessary. What would you be most interested in next?',
    options: [
      { id: 'a', text: 'Consolidating what helps in current life and considering the next practical steps.', weights: { time: -2, aim: -2 } },
      { id: 'b', text: 'Understanding how the change sits within the client’s longer personal development.', weights: { time: 2, aim: 2 } },
      { id: 'c', text: 'Considering how earlier strategies have changed and how that understanding could inform future choices.', weights: { time: 2, aim: -2 } },
      { id: 'd', text: 'Deepening the client’s description of what the improvement means in their present life.', weights: { time: -2, aim: 2 } }
    ]
  },
  {
    id: 'q15', title: 'A mismatch in the work',
    text: 'A client says the sessions are interesting but not quite what they had hoped for. You take the concern seriously. Where would you tend to begin?',
    options: [
      { id: 'a', text: 'Offer a tentative account of the mismatch and use their response to propose an adjustment.', weights: { meaning: -2, aim: -2 } },
      { id: 'b', text: 'Stay close to their experience of what has been missing, before explaining it or choosing a solution.', weights: { meaning: 2, aim: 2 } },
      { id: 'c', text: 'Ask for a concrete description of what they hoped for and agree an adjustment grounded in that account.', weights: { meaning: 2, aim: -2 } },
      { id: 'd', text: 'Explore a tentative meaning of the mismatch together before deciding how the work should change.', weights: { meaning: -2, aim: 2 } }
    ]
  }
]
