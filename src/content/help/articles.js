// Reviewed product help, not generated answers. Keep implementation evidence in
// docs/help-centre.md; never put private Notion links or client data in this bundle.
export const HELP_REVIEW_DATE = '2026-09-27'
export const HELP_CATEGORIES = ['Clients', 'Care', 'Sessions', 'Reflection']

export const HELP_ARTICLES = [
  {
    id: 'client-workspace', category: 'Clients',
    title: 'Find your way around a client',
    summary: 'The Client Workspace holds the ongoing relationship. A Session Workspace holds one meeting. Here is how to move between them.',
    keywords: ['client area', 'clinical workspace', 'open client', 'recent sessions', 'timeline', 'documents', 'archive', 'restore'],
    sections: [
      { heading: 'Start with the client, then choose the piece of work', paragraphs: [
        'Open a person from Clients when you need the overall context: what matters now, what you are working towards, practical follow-ups and previous sessions. This is different from opening a particular session to work on its summary or reflection.',
        'Before next session is the preparation area. Recent sessions is a route back into a particular meeting. Supporting material holds the broader Care view, Timeline, Documents, Transcripts, Measures, Resources and Client Details. A timeline entry tells you what happened and when; it is not a fresh interpretation of the history.'
      ] },
      { heading: 'Choose the right action', steps: [
        'To revisit a past meeting, find it in Recent sessions and choose Open summary. Use that dated entry rather than starting a new session.',
        'To enter the current session workflow, use Clinical Workspace. Helios may resume an existing session or create one when needed; this is not always a read-only action.',
        'To prepare a document for this client, use Create Document. The composer is separate from the session screen, and opening it does not save a document.',
        'To prepare reflective material for supervision, use the deliberate supervision-selection workflow. Selecting material is not emailing it to someone.'
      ] },
      { heading: 'When a client is archived', paragraphs: [
        'Archiving changes the active-client state rather than deleting the history. You can consult historical material, but restore the client before starting new work where Helios requires it. An active session can prevent archiving.'
      ] }
    ], related: ['prepare-next-session', 'care-suggestions', 'session-material']
  },
  {
    id: 'prepare-next-session', category: 'Clients',
    title: 'Prepare for a returning client',
    summary: 'Use current focus, aims and follow-ups for different purposes, then open the relevant session without rebuilding the whole history.',
    keywords: ['before next session', 'current focus', 'aims', 'objectives', 'follow ups', 'next appointment', 'reminder'],
    sections: [
      { heading: 'Use this before the next appointment', paragraphs: [
        'You do not need to turn preparation into another full session note. Current focus is a short client-level reminder of what matters now. Aims and objectives are separate Care entries describing what the work is moving towards. Follow-ups are practical things to return to. The appointment area answers when the next recorded meeting is due.'
      ] },
      { heading: 'A practical preparation sequence', steps: [
        'Read Current focus. When it needs updating, choose Edit, revise the note and Save current focus. That does not edit an aim or the previous session summary.',
        'Review Aims and objectives. Use View Care when you need the broader working understanding rather than just this short list.',
        'Check Follow-ups. Mark an item complete when it is done, or reopen it when further work is needed. Completing a follow-up is not deleting it or sending an email.',
        'Open the relevant dated summary in Recent sessions for detail. Return to the client view when you need to place that meeting in the wider context.'
      ] },
      { heading: 'Example: three entries, three jobs', example: 'Fictional example: Current focus might say "Return to how evenings have felt since the change at work." An aim might concern reducing the effect of work worry on home life. A follow-up might be "Prepare the agreed information sheet." Keeping them separate avoids burying a practical task inside clinical working material.' },
      { heading: 'What carries forward', paragraphs: [
        'The client-level focus, Care entries and follow-ups have their own save or update actions. Merely opening an old summary does not update them. Choose the place that matches the purpose of what you want to retain.'
      ] }
    ], related: ['client-workspace', 'care-suggestions']
  },
  {
    id: 'care-suggestions', category: 'Care',
    title: 'Turn an observation into a reviewed Care change',
    summary: 'Reflect on Care proposes changes to the ongoing working view. You compare the suggestion, accept or decline it, and save only what you choose.',
    keywords: ['reflect on care', 'care plan', 'suggestions', 'accept', 'decline', 'save accepted changes', 'lens', 'gentle cbt', 'integrative'],
    sections: [
      { heading: 'Why use Care rather than another session note?', paragraphs: [
        'Care is a working view that can remain useful across meetings. Use it when your understanding, an aim, something being tried or what has been noticed needs updating. It is not a chronological transcript, and Reflect on Care is not the private Therapist Reflection area.',
        'The Lens selector changes the headings and framing. Gentle CBT uses Aims and objectives, Shared Understanding, Trying, Change Noticed and Learning. This selector is separate from Perspective in the client-summary composer.'
      ] },
      { heading: 'From your thought to a saved change', steps: [
        'Open + Reflect on Care. Type your observation or use Dictate to speak your own text into the field. Review the wording before generating.',
        'Choose a suggestion emphasis if useful, then Generate suggestions. This requests proposals; it does not change the saved Care view.',
        'Read the proposed wording, its source label and the reason given. For an update, compare it with Current understanding. "Clinical inference" is not a direct client statement.',
        'Choose Accept for a proposal you want to consider keeping, or Decline to leave it out. Acceptance stages the proposal and makes its wording editable.',
        'Review the accepted wording, then use the Save accepted changes button. Its label includes the number of accepted changes. This separate save makes the changes durable.'
      ] },
      { heading: 'Example: update the understanding, not the record', example: 'Fictional example: an existing aim concerns evenings disrupted by work worry. You note that a wind-down routine was possible on some evenings but not others. A proposal to explore those differences is something to review, not evidence that the routine caused improvement. You can soften, rewrite or decline it before saving.' },
      { heading: 'What changes and what does not', paragraphs: [
        'A saved update moves the earlier Care item into history and adds the new wording. Current, Less relevant, Paused and Earlier are item states, not measures of clinical progress. Care changes do not automatically become an approved Clinical Record.',
        'When a save fails, read the message and inspect the current view before retrying. Do not assume that generating or accepting a proposal has saved it.'
      ] }
    ], related: ['dictate', 'prepare-next-session', 'private-reflection']
  },
  {
    id: 'dictate', category: 'Care',
    title: 'Speak your own text into a field with Dictate',
    summary: 'Dictate is an alternative to typing. Speak a thought, stop recording, then review the words in the field before using them.',
    keywords: ['microphone', 'mic', 'voice', 'speech', 'dictation', 'recording', 'cannot type', 'transcribe', 'transcription'],
    sections: [
      { heading: 'What Dictate is for', paragraphs: [
        'In Reflect on Care, Dictate lets you put your own thought into the input field by speaking. It does not import a therapy-session transcript, record the client session or ask AI to decide what you meant. The resulting text is working input for you to check.',
        'Dictation controls are not present beside every field in Helios. This article describes the Dictate control where it is available, particularly in Reflect on Care.'
      ] },
      { heading: 'Use the microphone instead of the keyboard', steps: [
        'Choose Dictate and allow microphone access when the browser asks.',
        'Speak the words you want to put in the field. Choose Stop recording when you have finished.',
        'Wait for the text to appear. In Reflect on Care it is added to any existing thought, so check for duplication as well as recognition mistakes.',
        'Edit the wording just as you would typed text. Choose Generate suggestions only when you are ready to use that input.'
      ] },
      { heading: 'If the microphone is unavailable', paragraphs: [
        'You can continue by typing. Check the browser permission for the Helios site and that the intended microphone is available. A blocked or failed recording is not confirmation that any words were saved.',
        'Putting words in the field is separate from generating suggestions and from saving accepted Care changes. Use those actions deliberately after reviewing your input.'
      ] }
    ], related: ['care-suggestions', 'private-reflection']
  },
  {
    id: 'session-material', category: 'Sessions',
    title: 'Understand summaries, source material and Clinical Records',
    summary: 'A transcript, working summary, client document and approved Clinical Record do different jobs. Generating one does not automatically create the others.',
    keywords: ['session summary', 'clinical record', 'notes', 'transcript', 'approve', 'amendment', 'session capture', 'save'],
    sections: [
      { heading: 'Choose by purpose, not by a similar name', paragraphs: [
        'The session screen has Session Summary and Clinical Record as its main tabs. View transcript opens the available source transcript; Therapist reflection opens your private reflective area. These expandable areas are not extra approved records.',
        'The regular session-bound summary concerns that meeting. The client-facing document composer is a separate workflow with document details, an evidence window and its own save/finalise actions. Do not assume that text generated on one screen is already saved or approved on the other.'
      ] },
      { heading: 'How the regular session summary is saved', paragraphs: [
        'On the Session Summary tab, successful Generate summary creates or updates an editable draft in that client\'s Documents. Open in Client Documents takes you to the saved document. Edits in this session screen are saved after a short pause; a save error means you should not assume the latest wording was retained.',
        'The separate client document composer works differently: Generate client summary puts draft text into the composer, and you then choose Save Draft or Finalise PDF. Always use the saving behaviour of the screen you are actually working in.'
      ] },
      { heading: 'Preparing a formal Clinical Record', steps: [
        'Open Clinical Record for the relevant session and check what source material is available. An availability indicator tells you that material exists; it is not a checkbox selecting it for inclusion.',
        'Use the preparation option available for that session. An empty draft lets you start from your own wording. Where eligible reviewed Session Capture material is available, a separate preparation path can offer capture fields to select.',
        'Review and edit the draft, save it and follow the ready-for-review and explicit approval steps. Preparing or generating draft text does not approve it.',
        'Use the amendment workflow for a correction after approval rather than expecting to overwrite the approved record.'
      ] },
      { heading: 'Where private reflection belongs', paragraphs: [
        'Private Therapist Reflection remains separate. Its existence may be shown as source availability, but the reflection is not automatically copied into the client summary or formal record. Keep the purpose of each destination in mind when deciding what to write.'
      ] }
    ], related: ['client-summary', 'private-reflection', 'client-workspace']
  },
  {
    id: 'client-summary', category: 'Sessions',
    title: 'Create a client summary using the last three reviewed sessions',
    summary: 'The selected anchor sets the end of the evidence window. Last 3 reviewed sessions means up to three eligible reviewed captures, not the latest three appointments.',
    keywords: ['last 3 sessions', 'last three sessions', 'three reviewed sessions', 'continuity', 'anchor', 'evidence window', 'create session summary', 'pdf', 'finalise', 'email'],
    sections: [
      { heading: 'Use this to connect recent work for the client', paragraphs: [
        'Open the client document composer using Create session summary in the client Documents area, or choose the session-summary document type in Create Document. This is not the same as opening the regular summary for one session.',
        'Choose Perspective for the framing and Continuity for the source window. Summary anchored to identifies the reviewed session the document is centred on. Evidence window shows the dates actually included. Therapist additions lets you supply context, corrections or emphasis.'
      ] },
      { heading: 'How the window is chosen', paragraphs: [
        'This session only uses the eligible reviewed capture for the selected session. Last 3 reviewed sessions looks backwards from the chosen anchor and selects up to three eligible reviewed Session Captures. Later sessions are outside that anchored window.',
        'A completed appointment alone does not establish that reviewed capture material is available. A window may contain only one or two eligible sources. Check the displayed evidence dates rather than assuming that selecting three guarantees three sources.'
      ] },
      { heading: 'An anchored-window example', example: 'Fictional example: reviewed sessions exist on 2, 9, 16 and 23 September. A summary anchored to 16 September can use 2, 9 and 16 September. It does not include 23 September just because that is now the most recent appointment. The dates here illustrate the rule; the evidence window in your composer is the one to check.' },
      { heading: 'Generate, review, then choose the destination', steps: [
        'Check the anchor, source dates and your additions, then Generate client summary. The result is editable draft wording, not an automatically saved document.',
        'Review the text for accuracy, emphasis and suitability for the client. Permitted current Care context can inform it; private reflections and supervision material are not automatically brought into this workflow.',
        'Use Save Draft to keep the document editable, or Finalise PDF when it is ready to become a finalised document. Finalising this document is not approving a Clinical Record.',
        'When using Prepare email, review the email draft, attach the PDF yourself and send it through your email application. Preparing the email does not send or attach it automatically.'
      ] },
      { heading: 'If no eligible source is listed', paragraphs: [
        'Do not assume that a transcript or completed appointment automatically qualifies as reviewed Session Capture material. Check the selected session and the evidence message. Contact product support when the expected reviewed source is still unavailable; avoid generating from the wrong session simply to obtain text.'
      ] }
    ], related: ['session-material', 'practice-map']
  },
  {
    id: 'private-reflection', category: 'Reflection',
    title: 'Follow a reflection from the session into your Practice Map',
    summary: 'Write your account, optionally name your response, save it privately, then return to the library or Map. The map uses labels you entered, not an AI interpretation of your prose.',
    keywords: ['where does my reflection go', 'save reflection', 'therapist reflection', 'private', 'mapping', 'inner position', 'saved thinking', 'reflective practice'],
    sections: [
      { heading: 'Why there are two kinds of input', paragraphs: [
        'Open a session, stay on Session Summary and expand Therapist reflection. The first prompts are for your account of what stayed with you, your own response, uncertainty and questions. The optional mapping fields do a different job: they record a response in your own words so it can be revisited alongside other mapped entries.',
        'Writing about a response in the reflection text does not automatically create an Inner position label. You decide whether to map it and what to call it. This is not a parts assessment or a personality classification.'
      ] },
      { heading: 'One example from input to result', example: 'Fictional example: you write, "I noticed myself filling the silence with a plan." In optional mapping you name the Inner position "Wanting to organise", describe what seemed to bring it forward, and note that slowing down helped. After saving, the reflection can be reopened in Reflections. If another saved mapping uses the same label, Practice Map can group those entries together. It has not independently decided that you are an organising type.' },
      { heading: 'Write, save and revisit', steps: [
        'Use the reflection prompts for the experience you want to retain. Questions can remain questions; you do not need to turn uncertainty into a conclusion.',
        'Optionally complete What was happening in you? Name the inner position, its possible purpose, trigger, effect, what created space and a question to carry forward.',
        'Choose Save private reflection and wait for the saved confirmation. This retains both the reflection and any optional mapping for that session.',
        'Open Reflect, then Reflections, to find the saved entry. View Full Detail reads it; Open session or Edit in session takes you back to the original session-linked workspace.',
        'Open Reflect, then Map, to see how entered mapping labels and recorded themes recur in the loaded reflective material.'
      ] },
      { heading: 'What saving does not do', paragraphs: [
        'Saving does not automatically add the reflection to a supervision pack, put it into a client Clinical Record or request an AI response. Those are separate choices. The private reflection remains professional material in your own workspace.'
      ] }
    ], related: ['practice-map', 'reflection-ai', 'supervision-pack']
  },
  {
    id: 'practice-map', category: 'Reflection',
    title: 'Understand recurrence and change in Practice Map',
    summary: 'Practice Map groups your named responses and compares recorded theme frequency across two 30-day periods. It is a way to revisit your material, not a score or a clinical conclusion.',
    keywords: ['over time', 'overtime', 'continuity engine', 'recurrence', 'patterns', 'last 30 days', 'theme movement', 'map counts', 'repeated labels'],
    sections: [
      { heading: 'What the Map draws on', paragraphs: [
        'Go to Reflect, then Map. Practice Map works from saved private reflections loaded into the reflective workspace. Inner-position groupings come from the optional mapping fields you completed. Theme movement comes from recorded themes. Helios does not silently invent an inner-position label by reading the prose.',
        'Matching labels are grouped without treating capitalisation as a difference; different descriptions are not automatically merged. A count of two means that label appeared in two mapped reflections, not that the response was helpful or harmful twice.'
      ] },
      { heading: 'How to use it', steps: [
        'Check the activity counts and source coverage before interpreting a pattern. Last 30 days and Previous 30 days count recorded reflections in the respective periods.',
        'Look at a recurring position you named. Consider the recent context shown with it, then return to the reflection library when you need the full account.',
        'Use recent triggers and what created space as reminders of what you actually recorded, not as explanations that the system has independently verified.',
        'Treat Theme movement as frequency: more, less or no change in recorded mentions. A less frequent theme does not establish that the difficulty resolved.'
      ] },
      { heading: 'Why the Map may be sparse', paragraphs: [
        'Saved reflection text can exist without any optional mapping or theme. In that case the library can contain useful entries while a Map section remains empty. Add mapping only when it is useful; the empty state is not an instruction to invent a category.',
        'The current reflective workspace loads up to 100 recent reflections. The Map is therefore not an unlimited analysis of every entry you have ever made. Its counts describe that loaded material.'
      ] },
      { heading: 'Not the same as last-three-session continuity', paragraphs: [
        'The client-summary Continuity selector chooses reviewed session sources for a client-facing draft. Practice Map organises your own reflective material across time. They use different inputs and have different purposes. Do not expect changing the client-summary window to change the Practice Map.'
      ] }
    ], related: ['private-reflection', 'client-summary', 'supervision-pack']
  },
  {
    id: 'reflection-ai', category: 'Reflection',
    title: 'Revisit a saved reflection with optional AI prompts',
    summary: 'Reflect with AI uses the selected reflection after confirmation. Its questions and perspectives do not overwrite your original entry or become an approved record.',
    keywords: ['reflect with ai', 'reflection assistant', 'rephrase', 'alternative perspectives', 'view full detail', 'ai reflection', 'search reflections'],
    sections: [
      { heading: 'Find the reflection first', paragraphs: [
        'Open Reflect, then Reflections. Search the saved entries or narrow them by a recorded theme. The theme filter is not a client filter. Use the entry actions to View Full Detail and check the client/session context where one is linked.',
        'Use this when you want additional questions about an entry you have already made, rather than when you want to change the client Care plan. Reflect with AI and Reflect on Care are different workflows.'
      ] },
      { heading: 'Request prompts deliberately', steps: [
        'Choose Reflect with AI from the selected entry or its detail view.',
        'Read the confirmation. Continue sends that selected private reflection to the AI service for reflective prompts; Cancel leaves without requesting them.',
        'Consider the response as optional questions, possible themes or perspectives. Rephrasing, copying and discarding are separate actions. Keep what is useful rather than treating the response as a verdict.'
      ] },
      { heading: 'Where the result goes', paragraphs: [
        'The response is not automatically saved and does not replace your original reflection. Return to the source session workspace to edit a session-linked reflection deliberately. Asking for AI prompts is not approval of a Clinical Record or selection for supervision.',
        'If the request fails, your saved original entry is still the material to return to. Avoid interpreting a loading or error state as a completed response.'
      ] }
    ], related: ['private-reflection', 'care-suggestions', 'supervision-pack']
  },
  {
    id: 'supervision-pack', category: 'Reflection',
    title: 'Choose private material for supervision',
    summary: 'Saving a reflection, including it in a pack and selecting it for a report are separate decisions. Preparing or exporting a report does not send it.',
    keywords: ['supervision', 'pack', 'report', 'include in pack', 'add to supervision', 'export', 'cpd'],
    sections: [
      { heading: 'Keep the selection deliberate', paragraphs: [
        'A reflection can be useful without being ready to share. Use the reflection actions or Add to Supervision Pack in the detail view when you decide to make that entry available for supervision preparation. Simply saving a reflection does not select it.',
        'The supervision workspace lets you work with included material. Inclusion in the pack and selection for a particular report are different: do not assume that every included entry must appear in every report.'
      ] },
      { heading: 'Before sharing a report', steps: [
        'Read the source reflection and make sure it is the material you intend to use.',
        'Include the relevant entry for supervision, then review the selection in the supervision workspace.',
        'Prepare and preview the report, checking both the selected entries and the generated or prepared wording.',
        'Review identifying detail before copying, printing or exporting. Case aliases do not automatically remove names or other identifying information from free text.',
        'Choose how to share it through your established professional arrangements. Selection, preparation and export are not an external send.'
      ] },
      { heading: 'What remains separate', paragraphs: [
        'Using a private reflection for supervision does not automatically place it in the client Clinical Record. Preserve the distinction between your professional reflection, a report prepared for discussion, and the formal client record.'
      ] }
    ], related: ['private-reflection', 'reflection-ai', 'practice-map']
  },
  {
    id: 'therapeutic-stance', category: 'Reflection',
    title: 'Use the therapeutic-stance exercise for reflection',
    summary: 'Explore hypothetical practice choices, review your responses and deliberately save a dated practice reflection. It is not an assessment of competence.',
    keywords: ['therapeutic stance', 'practice reflection', 'quiz', 'growth', 'development', 'learning'],
    sections: [
      { heading: 'A different source of reflection', paragraphs: [
        'From Review Reflections, open Reflect on your therapeutic stance. This exercise uses hypothetical practice scenarios rather than material from a particular client session. It provides another way to consider how you approach the work.',
        'Your choices, the interpretation of those choices and any reflection you add are not interchangeable. The exercise is not a diagnosis, personality test, competence score or a judgement about which clients you should see.'
      ] },
      { heading: 'Review before retaining', steps: [
        'Work through the scenarios and review your choices. Use the interpretation as a starting point for your thinking, not a definitive description of you.',
        'Review or amend the reflective report where offered. Exporting text and saving to the private reflection library are separate actions.',
        'Use the explicit save-to-library action to retain a dated Practice reflection, then find it in Reflect > Reflections. It is not automatically linked to a client or added to supervision.'
      ] },
      { heading: 'Do not read progress into repeated exercises', paragraphs: [
        'Saving another dated response does not itself run a longitudinal comparison or create a Practice Map finding. Differences in how you answer hypothetical situations are not automatically evidence of improvement or deterioration.',
        'Growth opens the Development view for themes and learning prompts. In the version reviewed for this Help release, it is not a persistent CPD-goal tracker.'
      ] }
    ], related: ['private-reflection', 'practice-map']
  }
]

export function getHelpArticle(id) {
  return typeof id === 'string' ? HELP_ARTICLES.find(article => article.id === id) || null : null
}
