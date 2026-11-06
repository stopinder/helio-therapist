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


/**
 * Alternate authored form. It mirrors the same editorial dimension pairings as the
 * original form so switching forms changes the situations without changing the
 * interpretation model.
 */
export const therapistQuestionsAlternate = [
  {
    id: 'q01', title: 'A client wants a recommendation',
    text: 'A client says, “If you were me, what would you do?” You have enough context to respond thoughtfully. What would usually be your first move?',
    options: [
      { id: 'a', text: 'Offer one tentative recommendation and agree how the client might test whether it helps.', weights: { direction: -2, aim: -2 } },
      { id: 'b', text: 'Invite the client to stay with the dilemma and decide what feels most important to explore.', weights: { direction: 2, aim: 2 } },
      { id: 'c', text: 'Help the client identify their own preferred course and turn it into a practical next step.', weights: { direction: 2, aim: -2 } },
      { id: 'd', text: 'Share your reading of the dilemma and use it to deepen the conversation rather than settle the decision.', weights: { direction: -2, aim: 2 } }
    ]
  },
  {
    id: 'q02', title: 'Wondering about a label',
    text: 'A client asks whether a psychological label might help them make sense of themselves. Within your role, where would you most naturally begin?',
    options: [
      { id: 'a', text: 'Offer a provisional formulation and explain how it differs from a formal diagnosis.', weights: { direction: -2, meaning: -2 } },
      { id: 'b', text: 'Ask what the label would mean to them and which parts of their experience they most want understood.', weights: { direction: 2, meaning: 2 } },
      { id: 'c', text: 'Ask focused questions about their current experiences before discussing any explanatory framework.', weights: { direction: -2, meaning: 2 } },
      { id: 'd', text: 'Invite them to describe the explanations they already hold and follow the meaning they attach to them.', weights: { direction: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q03', title: 'Emotion rising in the room',
    text: 'A client becomes tearful while remaining grounded and engaged with you. After checking that it feels okay to continue, what would you tend to offer?',
    options: [
      { id: 'a', text: 'Create a brief structure for understanding what happened, what they thought and what it means now.', weights: { structure: -2, mode: -2 } },
      { id: 'b', text: 'Stay close to the unfolding feeling and let the client determine where the experience goes.', weights: { structure: 2, mode: 2 } },
      { id: 'c', text: 'Offer a short experiential exercise with a clear frame and an easy way to stop.', weights: { structure: -2, mode: 2 } },
      { id: 'd', text: 'Follow the meanings and associations that emerge without imposing a sequence.', weights: { structure: 2, mode: -2 } }
    ]
  },
  {
    id: 'q04', title: 'A very coherent account',
    text: 'A client can explain a difficult relationship in great detail and with clear logic. You are curious rather than assuming this is avoidance. What would you explore first?',
    options: [
      { id: 'a', text: 'Offer a tentative interpretation of what this explanatory style may be doing and ask whether it fits.', weights: { mode: -2, meaning: -2 } },
      { id: 'b', text: 'Invite attention to present-moment feeling, sensation or tone while they describe the relationship.', weights: { mode: 2, meaning: 2 } },
      { id: 'c', text: 'Clarify the distinctions and meanings in their account before adding an interpretation.', weights: { mode: -2, meaning: 2 } },
      { id: 'd', text: 'Suggest a brief experiential test of a hypothesis and then compare the experience with your initial idea.', weights: { mode: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q05', title: 'The conversation stops',
    text: 'The room goes quiet for longer than usual. There is no sign of immediate risk and you do not know what the pause means. What feels most natural?',
    options: [
      { id: 'a', text: 'Ask a focused question that gives the client a way to put the pause into words.', weights: { direction: -2, mode: -2 } },
      { id: 'b', text: 'Allow the silence to continue until the client chooses whether and how to speak.', weights: { direction: 2, mode: 2 } },
      { id: 'c', text: 'Invite the client to notice together what the silence feels like right now.', weights: { direction: -2, mode: 2 } },
      { id: 'd', text: 'Ask whether they want to think about the silence or move to something else.', weights: { direction: 2, mode: -2 } }
    ]
  },
  {
    id: 'q06', title: 'The client thanks you',
    text: 'A client says, “You have really helped me change.” Once you have received the comment, what would you be most interested in understanding?',
    options: [
      { id: 'a', text: 'Whether a tentative account of what has happened in therapy helps explain the change.', weights: { time: -2, meaning: -2 } },
      { id: 'b', text: 'How receiving help from you connects with earlier experiences of relying on other people.', weights: { time: 2, meaning: 2 } },
      { id: 'c', text: 'What is concretely different in their life now, before proposing why it changed.', weights: { time: -2, meaning: 2 } },
      { id: 'd', text: 'Whether the change reflects a shift in a longer-standing pattern of relating or self-understanding.', weights: { time: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q07', title: 'An idea you may be wrong about',
    text: 'A pattern in the work makes you think you understand something important, but the evidence is still thin. How would you tend to hold that idea?',
    options: [
      { id: 'a', text: 'Agree a focused way to test the formulation over the next sessions, including what would count against it.', weights: { structure: -2, meaning: -2 } },
      { id: 'b', text: 'Leave the idea aside and continue gathering the client’s descriptions without organising them around it.', weights: { structure: 2, meaning: 2 } },
      { id: 'c', text: 'Use a structured description of specific situations before deciding whether the idea is useful.', weights: { structure: -2, meaning: 2 } },
      { id: 'd', text: 'Keep the idea provisionally in mind and return to it only if later material makes it relevant.', weights: { structure: 2, meaning: -2 } }
    ]
  },
  {
    id: 'q08', title: 'Wanting something practical',
    text: 'A client says they would like therapy to include something they can actively practise. Which offer sounds most like you?',
    options: [
      { id: 'a', text: 'Suggest a specific exercise, agree how to try it and set a point to review what happened.', weights: { structure: -2, direction: -2 } },
      { id: 'b', text: 'Ask the client what kind of practice would feel useful and build it together as the conversation develops.', weights: { structure: 2, direction: 2 } },
      { id: 'c', text: 'Co-design a repeatable practice where the client chooses the focus and how they will judge usefulness.', weights: { structure: -2, direction: 2 } },
      { id: 'd', text: 'Use an improvised in-session exercise that grows directly from what is happening between you now.', weights: { structure: 2, direction: -2 } }
    ]
  },
  {
    id: 'q09', title: 'Only a few sessions left',
    text: 'You and the client know that therapy will end after a small number of remaining sessions. Several worthwhile areas are still open. What would you usually favour?',
    options: [
      { id: 'a', text: 'Create a simple plan for each remaining session around one current recurring difficulty.', weights: { structure: -2, time: -2 } },
      { id: 'b', text: 'Let what emerges in each session guide whether links with earlier experience need attention.', weights: { structure: 2, time: 2 } },
      { id: 'c', text: 'Agree a bounded review connecting earlier learning with the concern that brought them to therapy.', weights: { structure: -2, time: 2 } },
      { id: 'd', text: 'Keep the remaining sessions open to whichever present-life situations feel most important at the time.', weights: { structure: 2, time: -2 } }
    ]
  },
  {
    id: 'q10', title: 'A familiar relational moment',
    text: 'A moment between you and the client resembles a pattern that seems important elsewhere in their life. What would you be most likely to do first?',
    options: [
      { id: 'a', text: 'Name the specific interaction you have noticed and invite the client to examine it with you now.', weights: { direction: -2, time: -2 } },
      { id: 'b', text: 'Ask whether anything about the moment feels familiar from earlier relationships and let them choose the link.', weights: { direction: 2, time: 2 } },
      { id: 'c', text: 'Invite them to describe what they think is happening between you before deciding where to take it.', weights: { direction: 2, time: -2 } },
      { id: 'd', text: 'Suggest exploring the history of the wider relational pattern through what is happening between you.', weights: { direction: -2, time: 2 } }
    ]
  },
  {
    id: 'q11', title: 'Anxiety before important moments',
    text: 'A client often becomes apprehensive before situations that matter to them. You have agreed to explore the pattern. Where would you tend to start?',
    options: [
      { id: 'a', text: 'Map the predictions, interpretations and thoughts that show up in recent examples.', weights: { mode: -2, time: -2 } },
      { id: 'b', text: 'Notice how earlier experiences are felt or remembered while the client talks about the anxiety.', weights: { mode: 2, time: 2 } },
      { id: 'c', text: 'Build a shared account of how the present meanings developed from earlier experiences.', weights: { mode: -2, time: 2 } },
      { id: 'd', text: 'Attend to present sensations, feelings and impulses while they describe a recent situation.', weights: { mode: 2, time: -2 } }
    ]
  },
  {
    id: 'q12', title: 'Insight has not changed much',
    text: 'A client says they can now explain their pattern clearly, but their day-to-day response has barely shifted. What would you tend to offer?',
    options: [
      { id: 'a', text: 'Turn the shared understanding into a small behavioural experiment and review the outcome.', weights: { mode: -2, aim: -2 } },
      { id: 'b', text: 'Explore the experience of still feeling stuck without requiring an immediate change.', weights: { mode: 2, aim: 2 } },
      { id: 'c', text: 'Revisit the formulation together to see what remains unclear, missing or contradictory.', weights: { mode: -2, aim: 2 } },
      { id: 'd', text: 'Invite an in-session experiential rehearsal of responding differently and notice what happens.', weights: { mode: 2, aim: -2 } }
    ]
  },
  {
    id: 'q13', title: 'Nothing pressing today',
    text: 'A client arrives saying there is nothing urgent to discuss. Within your existing agreement, how would you tend to use the session?',
    options: [
      { id: 'a', text: 'Return to an agreed therapeutic aim and choose one concrete next step.', weights: { structure: -2, aim: -2 } },
      { id: 'b', text: 'Follow whatever begins to feel significant without fixing the direction in advance.', weights: { structure: 2, aim: 2 } },
      { id: 'c', text: 'Agree one focused question worth understanding more deeply without requiring an action task.', weights: { structure: -2, aim: 2 } },
      { id: 'd', text: 'Follow what emerges and use any useful opening to experiment with something different.', weights: { structure: 2, aim: -2 } }
    ]
  },
  {
    id: 'q14', title: 'Things improved without going back',
    text: 'A client is doing noticeably better even though the work has focused mainly on present life rather than origins. What would interest you most next?',
    options: [
      { id: 'a', text: 'Consolidate what is helping now and identify practical ways to support it.', weights: { time: -2, aim: -2 } },
      { id: 'b', text: 'Understand how the improvement fits into the client’s longer developmental story.', weights: { time: 2, aim: 2 } },
      { id: 'c', text: 'Explore how earlier coping patterns have shifted and what that suggests for future choices.', weights: { time: 2, aim: -2 } },
      { id: 'd', text: 'Deepen the client’s description of what the improvement means in their life now.', weights: { time: -2, aim: 2 } }
    ]
  },
  {
    id: 'q15', title: 'Therapy is not quite landing',
    text: 'A client says they value the conversations but therapy is not quite meeting what they hoped for. Where would you begin?',
    options: [
      { id: 'a', text: 'Offer a tentative explanation for the mismatch and use their response to suggest an adjustment.', weights: { meaning: -2, aim: -2 } },
      { id: 'b', text: 'Stay with their experience of what feels absent before offering an explanation or solution.', weights: { meaning: 2, aim: 2 } },
      { id: 'c', text: 'Ask for a concrete description of what they wanted and agree a practical adjustment from that.', weights: { meaning: 2, aim: -2 } },
      { id: 'd', text: 'Explore what the mismatch may mean together before deciding how the work should change.', weights: { meaning: -2, aim: 2 } }
    ]
  }
]

export const THERAPIST_QUESTION_SETS = {
  original: therapistQuestions,
  alternate: therapistQuestionsAlternate
}

export function getTherapistQuestions(questionSetId = 'original') {
  return THERAPIST_QUESTION_SETS[questionSetId] || null
}

export function otherTherapistQuestionSet(questionSetId = 'original') {
  return questionSetId === 'alternate' ? 'original' : 'alternate'
}
