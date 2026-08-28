import type { CefrLevel } from "./question-bank"

export type TopicTheoryData = {
  title?: string
  concept?: string
  imageUrl?: string
  imageCaption?: string
  formula?: Array<{ label: string; text: string }>
  examples?: Array<{ en: string; es: string; tip?: string }>
  tips?: string[]
  keyWords?: string[]
}

export type TopicDef = {
  slug: string
  level: CefrLevel
  title: string
  description: string
  /** Grammar instructions and linguistic context for this topic */
  focus: string
  theory?: TopicTheoryData | null
  enabled?: boolean
}

export const topicCatalog: TopicDef[] = [
  // ==========================================
  // Pre A1 Starters (16 topics)
  // ==========================================
  {
    slug: "present-simple-to-be",
    level: "pre-a1-starters",
    title: "Present simple forms of 'to be': am/is/are",
    description: "Learn and practise using am, is, and are with pronouns and simple nouns.",
    focus: "Use am/is/are in affirmative, negative, and short question sentences at beginner level.",
  },
  {
    slug: "present-continuous-basics",
    level: "pre-a1-starters",
    title: "Present continuous: I'm doing, I'm not doing, Are you doing?",
    description: "Actions happening right now with -ing forms and be.",
    focus: "Present continuous (am/is/are + verb-ing) for immediate actions.",
  },
  {
    slug: "have-has-got",
    level: "pre-a1-starters",
    title: "Have/Has got",
    description: "Talking about possession and characteristics with have got / has got.",
    focus: "Have got / has got for family, possessions, and physical descriptions.",
  },
  {
    slug: "can-cant-ability-permission",
    level: "pre-a1-starters",
    title: "Can, can't: ability, possibility, permission",
    description: "Expressing what you can or cannot do in everyday situations.",
    focus: "Can and can't followed by bare infinitive for basic abilities and requests.",
  },
  {
    slug: "the-imperative",
    level: "pre-a1-starters",
    title: "The imperative: Sit down! Don't talk!",
    description: "Giving instructions, directions, and classroom commands.",
    focus: "Direct positive and negative imperative verbs (e.g., 'Open the door', 'Don't run').",
  },
  {
    slug: "a-an-plurals",
    level: "pre-a1-starters",
    title: "A/an, plurals: Singular and plural forms",
    description: "Using indefinite articles and regular/irregular plural nouns.",
    focus: "Articles a/an before vowel/consonant sounds and plural endings (-s, -es).",
  },
  {
    slug: "this-that-these-those",
    level: "pre-a1-starters",
    title: "This, that, these, those",
    description: "Demonstrative pronouns and determiners for near and far objects.",
    focus: "Distinguish singular vs plural and near vs far (this/that/these/those).",
  },
  {
    slug: "possessive-adjectives-subject-pronouns",
    level: "pre-a1-starters",
    title: "Possessive adjectives and subject pronouns (I/my, you/your, etc.)",
    description: "Matching subjects with their possessive adjective equivalents.",
    focus: "Subject pronouns (I, you, he, she, it, we, they) and possessive adjectives (my, your, his, her, its, our, their).",
  },
  {
    slug: "there-is-are-was-were",
    level: "pre-a1-starters",
    title: "There is, there are / There was, there were",
    description: "Describing the existence of items in the present and past.",
    focus: "There is / there are for singular/plural existence and past forms was/were.",
  },
  {
    slug: "there-or-it",
    level: "pre-a1-starters",
    title: "There or it",
    description: "Choosing between 'There is' for existence and 'It is' for identification or weather.",
    focus: "Contrasting 'There' (introducing something new) vs 'It' (referring to a specific thing or state).",
  },
  {
    slug: "this-vs-it",
    level: "pre-a1-starters",
    title: "The difference between 'this' and 'it'",
    description: "Pointing out something new (this) vs continuing to talk about it (it).",
    focus: "Using 'this' to introduce or point to something and 'it' to maintain reference.",
  },
  {
    slug: "basic-adjectives",
    level: "pre-a1-starters",
    title: "Adjectives: old, interesting, expensive, etc.",
    description: "Position and use of basic descriptive adjectives before nouns and after be.",
    focus: "Adjectives in attribute (before noun) and predicate (after be) positions with starter vocabulary.",
  },
  {
    slug: "prepositions-of-place-at-in-on",
    level: "pre-a1-starters",
    title: "At, in, on: Prepositions of place",
    description: "Prepositions of location for rooms, buildings, tables, and specific points.",
    focus: "Prepositions of place (at school, in the box, on the table).",
  },
  {
    slug: "prepositions-of-place-movement-positions",
    level: "pre-a1-starters",
    title: "Next to, under, between, in front of, behind, over, etc.",
    description: "Describing exact physical arrangements and positions.",
    focus: "Spatial prepositions (next to, under, between, behind, in front of, over).",
  },
  {
    slug: "questions-word-order-question-words",
    level: "pre-a1-starters",
    title: "Questions: Word order and question words",
    description: "Forming simple questions with Who, What, Where, When, How.",
    focus: "Wh- question words + auxiliary/verb + subject word order.",
  },
  {
    slug: "basic-word-order",
    level: "pre-a1-starters",
    title: "Basic word order in English",
    description: "Subject + Verb + Object standard sentence structures in affirmative and negative sentences.",
    focus: "Subject-Verb-Object (SVO) order and standard adverb/adjective placement.",
  },

  // ==========================================
  // A1 Movers (21 topics)
  // ==========================================
  {
    slug: "present-simple-forms",
    level: "a1-movers",
    title: "Present simple: I do, I don't, Do I?",
    description: "Routine actions, daily habits, third-person -s, negatives, and questions with do/does.",
    focus: "Present simple with third person singular -s/-es and auxiliary do/does.",
  },
  {
    slug: "present-simple-vs-continuous-a1",
    level: "a1-movers",
    title: "Choose between Present simple or present continuous",
    description: "Contrasting everyday habits with actions happening right now.",
    focus: "Contrasting routines (every day, usually) with temporary/now actions (now, at the moment).",
  },
  {
    slug: "adverbs-of-frequency",
    level: "a1-movers",
    title: "Adverbs of frequency with present simple",
    description: "Using always, usually, often, sometimes, never before main verbs and after be.",
    focus: "Position and meaning of frequency adverbs (always, often, sometimes, never).",
  },
  {
    slug: "was-were-past-simple",
    level: "a1-movers",
    title: "Was/were: Past simple of 'be'",
    description: "Talking about past states, locations, and identities.",
    focus: "Past forms was / were / wasn't / weren't and question inversions.",
  },
  {
    slug: "past-simple-regular-irregular",
    level: "a1-movers",
    title: "Past simple: Regular/irregular verbs",
    description: "Affirmative past simple forms with regular -ed and common irregular verbs.",
    focus: "Regular past simple (-ed) and frequent irregular verbs (went, saw, had, came, bought).",
  },
  {
    slug: "past-simple-negatives-questions",
    level: "a1-movers",
    title: "Past simple: Negatives and questions",
    description: "Using 'didn't' and 'Did you...?' with base verb forms.",
    focus: "Past simple questions and negatives using didn't + base verb and Did + subject + base verb.",
  },
  {
    slug: "will-and-shall-future",
    level: "a1-movers",
    title: "'Will' and 'shall': Future",
    description: "Basic future predictions, spontaneous decisions, and polite offers with shall I / we.",
    focus: "Will for future facts/decisions and Shall for first-person offers/suggestions.",
  },
  {
    slug: "be-going-to-plans-predictions",
    level: "a1-movers",
    title: "Be going to: Plans and predictions",
    description: "Expressing intentions, prior plans, and obvious future evidence.",
    focus: "Be going to + base verb for personal intentions and immediate visual evidence.",
  },
  {
    slug: "would-you-like-id-like",
    level: "a1-movers",
    title: "Would you like...? I'd like...",
    description: "Polite offers, requests, and expressing desires in social situations.",
    focus: "Using 'Would you like...?' and 'I would like (I'd like)...' for polite requests and invitations.",
  },
  {
    slug: "verbs-to-infinitive",
    level: "a1-movers",
    title: "Verbs + to + infinitive",
    description: "Common verbs followed by to-infinitive (want, need, hope, learn, plan).",
    focus: "Verb patterns with to-infinitive (want to go, need to study, hope to see).",
  },
  {
    slug: "verbs-ing",
    level: "a1-movers",
    title: "Verbs + -ing",
    description: "Verbs of liking, disliking, and activity followed by gerunds (like, love, hate, enjoy).",
    focus: "Verbs followed by -ing forms (like swimming, enjoy reading, stop playing).",
  },
  {
    slug: "articles-a-an-the-no-article",
    level: "a1-movers",
    title: "A/an, the, no article: The use of articles in English",
    description: "First mention vs second mention and zero article with general plurals.",
    focus: "Choosing between a/an, the, and zero article in everyday contexts.",
  },
  {
    slug: "object-vs-subject-pronouns",
    level: "a1-movers",
    title: "Object pronouns vs subject pronouns: Me or I, she or her?",
    description: "Using me, him, her, us, them after verbs and prepositions.",
    focus: "Distinguishing subject pronouns from object pronouns after verbs and prepositions.",
  },
  {
    slug: "a-some-any-countable-uncountable",
    level: "a1-movers",
    title: "A, some, any: Countable and uncountable nouns",
    description: "Determiners with food, drinks, countable objects, and negative/question sentences.",
    focus: "Countable vs uncountable nouns with a/an, some, and any.",
  },
  {
    slug: "much-many-a-lot-a-little-a-few",
    level: "a1-movers",
    title: "Much, many, a lot of, a little, a few",
    description: "Expressing quantity with countable and uncountable items.",
    focus: "Much (uncountable), many (countable), a lot of (both), a few (count), a little (uncount).",
  },
  {
    slug: "whose-possessive-s",
    level: "a1-movers",
    title: "Whose, possessive 's: Whose is this? It's Mike's",
    description: "Asking whose something is and using Saxon genitive 's.",
    focus: "Question word 'Whose' and noun possessive forms ('s / s').",
  },
  {
    slug: "comparative-adjectives",
    level: "a1-movers",
    title: "Comparative adjectives: Older than, more important than, etc.",
    description: "Comparing two people, places, or items with -er and more.",
    focus: "Short adjectives with -er than and long adjectives with more ... than.",
  },
  {
    slug: "superlative-adjectives",
    level: "a1-movers",
    title: "Superlative adjectives: The oldest, the most important, etc.",
    description: "Identifying extremes in groups using the -est and the most.",
    focus: "Superlative forms (the + adjective-est / the most + adjective).",
  },
  {
    slug: "adverbs-of-manner-vs-adjectives",
    level: "a1-movers",
    title: "Adverbs of manner (slowly) or adjectives (slow)?",
    description: "Describing how an action is performed vs describing a noun.",
    focus: "Adverbs of manner with -ly (quick vs quickly, careful vs carefully, good vs well).",
  },
  {
    slug: "conjunctions-and-but-or-so-because",
    level: "a1-movers",
    title: "Conjunctions: And, but, or, so, because",
    description: "Connecting clauses and expressing addition, contrast, choices, reason, and results.",
    focus: "Basic coordinating and subordinating conjunctions (and, but, or, so, because).",
  },
  {
    slug: "prepositions-of-time-at-in-on",
    level: "a1-movers",
    title: "At, in, on: Prepositions of time",
    description: "Using at for times, in for months/years/seasons, and on for days/dates.",
    focus: "Prepositions of time rules (at 5 o'clock, on Monday, in July, in 2024).",
  },

  // ==========================================
  // A2 Flyers (19 topics)
  // ==========================================
  {
    slug: "past-simple-form-and-use",
    level: "a2-flyers",
    title: "Past simple: Form and use",
    description: "Completed past events, historical facts, and sequential narratives.",
    focus: "Past simple narrative chains with regular and irregular verbs and time markers.",
  },
  {
    slug: "present-simple-vs-continuous-a2",
    level: "a2-flyers",
    title: "Choose between Present simple vs present continuous",
    description: "Permanent truths vs temporary situations and current events.",
    focus: "Distinguishing general facts and permanent states from ongoing and temporary situations.",
  },
  {
    slug: "stative-vs-dynamic-verbs",
    level: "a2-flyers",
    title: "Stative vs dynamic verbs (or non-action vs action verbs)",
    description: "Verbs of emotion, thought, and possession that are rarely used in continuous forms.",
    focus: "Non-continuous state verbs (know, believe, understand, belong, need, want) vs action verbs.",
  },
  {
    slug: "past-continuous-vs-past-simple",
    level: "a2-flyers",
    title: "Choose between Past continuous and past simple",
    description: "Background activities interrupted by shorter past actions with when and while.",
    focus: "Past continuous for ongoing background actions interrupted by past simple with when/while.",
  },
  {
    slug: "will-vs-be-going-to",
    level: "a2-flyers",
    title: "Will vs be going to: Future",
    description: "Spontaneous decisions and predictions vs premeditated intentions and clear evidence.",
    focus: "Contrasting 'will' (spontaneous decisions, predictions) and 'be going to' (prior plans, evidence).",
  },
  {
    slug: "present-continuous-future-arrangements",
    level: "a2-flyers",
    title: "Present continuous for future arrangements",
    description: "Fixed appointments, diary entries, and confirmed social plans.",
    focus: "Using present continuous with future time expressions for fixed arrangements.",
  },
  {
    slug: "have-to-must-mustnt",
    level: "a2-flyers",
    title: "Have to, don't have to, must, mustn't",
    description: "Rules, obligations, lack of necessity, and prohibitions.",
    focus: "Must (obligation), mustn't (prohibition), have to (external rule), don't have to (no obligation).",
  },
  {
    slug: "should-shouldnt",
    level: "a2-flyers",
    title: "Should, shouldn't",
    description: "Giving and asking for advice, opinions, and mild recommendations.",
    focus: "Should and shouldn't + bare infinitive for advice and recommendations.",
  },
  {
    slug: "might-might-not-possibility",
    level: "a2-flyers",
    title: "Might, might not: Possibility",
    description: "Expressing uncertainty about present or future situations.",
    focus: "Might and might not to talk about uncertain possibilities.",
  },
  {
    slug: "may-and-might-difference",
    level: "a2-flyers",
    title: "May and might: What's the difference?",
    description: "Formal permission and possibility with may vs might.",
    focus: "May for formal permission and possibility compared to might for general uncertainty.",
  },
  {
    slug: "purpose-to-and-for",
    level: "a2-flyers",
    title: "Expressing purpose with 'to' and 'for'",
    description: "Explaining why someone does something using to + verb and for + noun/-ing.",
    focus: "Infinitive of purpose (to + verb) vs for + noun / for + -ing.",
  },
  {
    slug: "pronouns-and-possessives-a2",
    level: "a2-flyers",
    title: "Subject pronouns, object pronouns, possessive pronouns, possessive adjectives",
    description: "Consolidating all pronoun and possessive forms (mine, yours, his, hers, ours, theirs).",
    focus: "Full pronoun paradigm: subject, object, possessive adjective (my), possessive pronoun (mine).",
  },
  {
    slug: "indefinite-pronouns-something-anything",
    level: "a2-flyers",
    title: "Something, anything, nothing, etc.",
    description: "Indefinite pronouns for people, things, and places in positive, negative, and question sentences.",
    focus: "Someone/something/somewhere, anyone/anything/anywhere, no one/nothing/nowhere, everyone.",
  },
  {
    slug: "comparative-superlative-adjectives-adverbs",
    level: "a2-flyers",
    title: "Comparative and superlative adjectives and adverbs",
    description: "Irregular adjectives/adverbs (good/well, bad/badly, far) and modifier structures.",
    focus: "Comparatives and superlatives of adverbs (more quickly, the fastest) and irregular forms.",
  },
  {
    slug: "prepositions-of-movement",
    level: "a2-flyers",
    title: "Prepositions of movement: Along, across, over, etc.",
    description: "Directional movement through, past, along, across, into, out of.",
    focus: "Prepositions expressing direction and movement (along, across, into, through, over, towards).",
  },
  {
    slug: "verb-go-uses",
    level: "a2-flyers",
    title: "How to use the verb 'go' in English",
    description: "Collocations: go + -ing (go swimming), go to, go on, go for.",
    focus: "Structures with 'go' (go shopping, go to school, go on holiday, go for a walk).",
  },
  {
    slug: "verb-get-uses",
    level: "a2-flyers",
    title: "The different uses of the verb 'get'",
    description: "Meanings of get: receive, become/change state, arrive, buy.",
    focus: "Core meanings of 'get' (get cold, get a letter, get home, get a ticket).",
  },
  {
    slug: "do-vs-make-a2",
    level: "a2-flyers",
    title: "'Do' vs 'Make': What's the difference?",
    description: "Collocations with do (homework, sports, jobs) vs make (cake, noise, decision, friends).",
    focus: "Collocations with 'do' (activities, duties) vs 'make' (producing, creating, causing).",
  },
  {
    slug: "verbs-with-two-objects",
    level: "a2-flyers",
    title: "Verbs with two objects",
    description: "Direct and indirect objects with verbs like give, send, show, buy, teach.",
    focus: "Verb + indirect object + direct object vs Verb + direct object + to/for + indirect object.",
  },

  // ==========================================
  // A2 Key (KET) (22 topics)
  // ==========================================
  {
    slug: "present-perfect-form-use",
    level: "a2-key",
    title: "Present perfect: Form and use",
    description: "Life experiences and unspecified past actions with have/has + past participle.",
    focus: "Present perfect simple with ever, never, already, just, yet for life experiences.",
  },
  {
    slug: "present-perfect-vs-past-simple-a2",
    level: "a2-key",
    title: "Choose between Present perfect or past simple",
    description: "Finished past time with specific dates/times vs unfinished time connected to the present.",
    focus: "Past simple with finished time markers (yesterday, in 2020) vs Present perfect (so far, ever).",
  },
  {
    slug: "past-perfect-basics",
    level: "a2-key",
    title: "Past perfect",
    description: "Actions that happened before another point in the past with had + past participle.",
    focus: "Had + past participle to indicate an action earlier than a past reference point.",
  },
  {
    slug: "used-to-habits-states",
    level: "a2-key",
    title: "Used to, didn't use to: Past habits and states",
    description: "Past habits and states that are no longer true in the present.",
    focus: "Used to / didn't use to + infinitive for discontinued past habits and states.",
  },
  {
    slug: "first-conditional-future-time",
    level: "a2-key",
    title: "First conditional and future time clauses",
    description: "Real and possible future situations with 'if / when + present simple, will + verb'.",
    focus: "If / when + present simple + will / won't + base form for real future conditions.",
  },
  {
    slug: "second-conditional-a2",
    level: "a2-key",
    title: "Second conditional",
    description: "Hypothetical or imaginary situations in the present/future with 'if + past, would + verb'.",
    focus: "If + past simple + would / wouldn't + base form for hypothetical situations.",
  },
  {
    slug: "passive-present-past-simple",
    level: "a2-key",
    title: "Present and past simple passive: be + past participle",
    description: "Focusing on the action/object rather than the agent with is/are/was/were + done.",
    focus: "Present simple and past simple passive structures (is made, was built, were written).",
  },
  {
    slug: "reported-speech-a2",
    level: "a2-key",
    title: "Reported speech / Indirect speech",
    description: "Reporting statements and commands with basic tense backshifts and pronoun changes.",
    focus: "Reported statements with say/tell and backshifting present tenses to past tenses.",
  },
  {
    slug: "defining-relative-clauses-a2",
    level: "a2-key",
    title: "Defining relative clauses: Who, which, that, where",
    description: "Giving essential information about people, things, and places.",
    focus: "Relative pronouns who (people), which/that (things), where (places) in defining clauses.",
  },
  {
    slug: "infinitives-and-gerunds-patterns",
    level: "a2-key",
    title: "Infinitives and gerunds: Verb patterns",
    description: "Categorizing verbs taking to-infinitive vs -ing forms.",
    focus: "Distinguishing verbs followed by to-infinitive (decide, promise) vs gerund (mind, finish).",
  },
  {
    slug: "phrasal-verbs-transitive-separable",
    level: "a2-key",
    title: "Phrasal verbs: Transitive and intransitive, separable and inseparable",
    description: "Everyday multi-word verbs (turn on, look for, pick up, wake up).",
    focus: "Common A2 phrasal verbs, pronoun object positioning, and particle meanings.",
  },
  {
    slug: "quantifiers-much-many-little-few",
    level: "a2-key",
    title: "Much, many, little, few, some, any: Quantifiers",
    description: "Expressing precise degrees of quantity in affirmative, negative, and question sentences.",
    focus: "Accurate use of quantifiers with countable plural and uncountable nouns.",
  },
  {
    slug: "too-too-much-many-enough",
    level: "a2-key",
    title: "Too, too much, too many, enough",
    description: "Expressing excess and sufficiency before nouns and with adjectives/adverbs.",
    focus: "Too + adjective, too much + uncountable, too many + countable, adjective + enough, enough + noun.",
  },
  {
    slug: "most-most-of-the-most",
    level: "a2-key",
    title: "Most, most of, the most",
    description: "General vs specific groups using most people, most of the people, the most.",
    focus: "Choosing between most (general), most of the (specific group), and the most (superlative).",
  },
  {
    slug: "so-neither-agreement",
    level: "a2-key",
    title: "So, neither: so am I, neither do I, etc.",
    description: "Agreeing with affirmative and negative statements using auxiliary inversion.",
    focus: "So + auxiliary + subject (agreement with positive) and Neither + auxiliary + subject (with negative).",
  },
  {
    slug: "auxiliary-verbs-do-be-have",
    level: "a2-key",
    title: "Auxiliary verbs: do, be and have",
    description: "Role of helper verbs in forming questions, negatives, and short answers.",
    focus: "Auxiliary functions of do, be, and have across primary tenses.",
  },
  {
    slug: "no-longer-any-longer-anymore",
    level: "a2-key",
    title: "No longer, any longer, anymore",
    description: "Expressing that a past state or situation has ceased.",
    focus: "Position and polarity of no longer (mid-position) vs not ... anymore / any longer (end-position).",
  },
  {
    slug: "connectors-however-although-because",
    level: "a2-key",
    title: "However, although, because, so, and time connectors",
    description: "Linking complex ideas with contrast, reason, result, and sequential connectors.",
    focus: "Conjunctions and discourse linkers (although + clause, however + comma, because vs so).",
  },
  {
    slug: "on-time-in-time-at-the-end-in-the-end",
    level: "a2-key",
    title: "On time vs In time, At the end vs In the end",
    description: "Punctuality vs having enough time, and physical endpoints vs eventual conclusions.",
    focus: "Contrasting on time (punctual) vs in time (with time to spare), at the end of vs in the end (finally).",
  },
  {
    slug: "asking-questions-forms",
    level: "a2-key",
    title: "Asking questions in English: Question forms",
    description: "Yes/No questions, Wh- questions, and word order with modal verbs.",
    focus: "Inversion rules, auxiliary placement, and question formulation.",
  },
  {
    slug: "subject-questions-prepositions",
    level: "a2-key",
    title: "Subject questions, questions with preposition",
    description: "Questions without auxiliary (Who wrote this?) and ending with prepositions (Who did you talk to?).",
    focus: "Subject questions (no do/does/did) vs object questions with stranded prepositions.",
  },
  {
    slug: "review-all-verb-tenses-a2",
    level: "a2-key",
    title: "Review of all verb tenses A2",
    description: "Integrated practice across present, past, and future structures at A2 level.",
    focus: "Discrimination between present simple, present continuous, past simple, past continuous, present perfect, and future.",
  },

  // ==========================================
  // B1 Preliminary (PET) (39 topics)
  // ==========================================
  {
    slug: "present-simple-vs-continuous-b1",
    level: "b1-preliminary",
    title: "Choose between Present simple or present continuous",
    description: "Subtle nuances: habitual actions, stative verbs in dynamic senses, and annoying habits with always.",
    focus: "Advanced distinction between present simple and present continuous including changing state verbs.",
  },
  {
    slug: "present-simple-vs-present-perfect",
    level: "b1-preliminary",
    title: "Choose between present simple or present perfect",
    description: "Current states vs states that started in the past and continue into the present with for/since.",
    focus: "Distinguishing current facts (present simple) from duration leading up to now (present perfect + for/since).",
  },
  {
    slug: "present-perfect-simple-vs-continuous-b1",
    level: "b1-preliminary",
    title: "Choose between Present perfect simple and present perfect continuous",
    description: "Completed achievements and quantity vs ongoing duration and visible present results.",
    focus: "Present perfect simple (result, how many) vs continuous (have been doing, duration, activity).",
  },
  {
    slug: "narrative-past-tenses-b1",
    level: "b1-preliminary",
    title: "Past simple, past continuous, past perfect",
    description: "Storytelling using past simple for events, past continuous for background, and past perfect for prior events.",
    focus: "Combining narrative past tenses smoothly in multi-clause storytelling sentences.",
  },
  {
    slug: "future-forms-b1",
    level: "b1-preliminary",
    title: "Future forms: Will, be going to, present continuous",
    description: "Choosing the exact future form for timetables, arrangements, intentions, and predictions.",
    focus: "Accurate selection between present simple (timetables), continuous (arrangements), going to (intentions), will (predictions).",
  },
  {
    slug: "modals-obligation-necessity-advice",
    level: "b1-preliminary",
    title: "Have to, must, should: Obligation, prohibition, necessity, advice",
    description: "Nuanced obligations (internal vs external), prohibition, advice, and absence of obligation (needn't / don't have to).",
    focus: "Must vs have to, mustn't vs don't have to, should/ought to for advice.",
  },
  {
    slug: "modals-ability-possibility",
    level: "b1-preliminary",
    title: "Can, could, be able to: Ability and possibility",
    description: "General past ability (could) vs specific successful occasion (was able to / managed to).",
    focus: "Can, could, and managed to / was able to for specific past achievements.",
  },
  {
    slug: "modal-verbs-of-deduction-b1",
    level: "b1-preliminary",
    title: "Modal verbs of deduction: Must, might, could, can't",
    description: "Logical deduction in the present based on evidence (must be true, can't be true, might be true).",
    focus: "Must (almost certain), can't (impossible), might/could (possible) for present deduction.",
  },
  {
    slug: "used-to-be-used-to-get-used-to-b1",
    level: "b1-preliminary",
    title: "Usually, used to, be used to, get used to",
    description: "Past habits (used to + inf) vs current familiarity (be used to + -ing) vs the process of adapting (get used to + -ing).",
    focus: "Used to + infinitive vs be used to + -ing / get used to + -ing.",
  },
  {
    slug: "had-better-its-time",
    level: "b1-preliminary",
    title: "Had better... it's time",
    description: "Urgent advice with consequences (had better + bare inf) and unreal past expressing urgency (it's time + past).",
    focus: "Had better + bare verb (urgent advice) and It's time / It's high time + past simple.",
  },
  {
    slug: "would-rather-would-sooner",
    level: "b1-preliminary",
    title: "Would rather & Would sooner",
    description: "Expressing personal preference (would rather do) and preferences about other people (would rather you did).",
    focus: "Would rather + bare infinitive (own preference) vs would rather + subject + past (preference for others).",
  },
  {
    slug: "b1-phrasal-verbs-1",
    level: "b1-preliminary",
    title: "B1 Phrasal verbs 1: Exercises and explanation",
    description: "Travel, daily routine, and communication phrasal verbs (set off, get on with, look after, carry on).",
    focus: "Phrasal verbs related to travel and routines with accurate prepositions and objects.",
  },
  {
    slug: "b1-phrasal-verbs-2",
    level: "b1-preliminary",
    title: "B1 Phrasal verbs 2: Exercises and explanation",
    description: "Work, study, and social phrasal verbs (give up, find out, turn down, take up, put off).",
    focus: "Phrasal verbs for study and work with separable and inseparable structures.",
  },
  {
    slug: "b1-phrasal-verbs-3",
    level: "b1-preliminary",
    title: "B1 Phrasal verbs 3: Exercises and explanation",
    description: "Relationship, emotion, and decision phrasal verbs (run out of, come up with, look forward to, make up).",
    focus: "Three-part phrasal verbs (look forward to, run out of, get on well with) followed by nouns/-ing.",
  },
  {
    slug: "first-conditional-future-clauses-b1",
    level: "b1-preliminary",
    title: "First conditional, future time clauses",
    description: "Real future conditions with unless, as soon as, until, provided that, in case.",
    focus: "Future time clauses with as soon as, until, unless, in case + present tense, main clause with will.",
  },
  {
    slug: "second-conditional-b1",
    level: "b1-preliminary",
    title: "Second conditional: Unreal situations",
    description: "Hypothetical advice (If I were you) and unreal present/future possibilities with could/would/might.",
    focus: "If + past subjunctive (were), main clause with would/could/might + base form.",
  },
  {
    slug: "third-conditional-b1",
    level: "b1-preliminary",
    title: "Third conditional: Past unreal situations",
    description: "Regrets, criticisms, and alternative past outcomes with 'if had done, would have done'.",
    focus: "If + had + past participle, main clause with would/could/might have + past participle.",
  },
  {
    slug: "passive-verb-forms-b1",
    level: "b1-preliminary",
    title: "Passive verb forms",
    description: "Continuous and modal passives (is being repaired, was being cleaned, must be done, can be solved).",
    focus: "Forming passives in continuous tenses and with modal verbs (be + past participle).",
  },
  {
    slug: "active-and-passive-voice-b1",
    level: "b1-preliminary",
    title: "Active and passive voice",
    description: "Transforming sentences between active and passive, including appropriate use of 'by + agent'.",
    focus: "Sentence transformations between active and passive voice retaining accurate tense.",
  },
  {
    slug: "reported-speech-b1",
    level: "b1-preliminary",
    title: "Indirect speech / Reported speech",
    description: "Reported questions (asked if / asked where), requests, commands, and reporting verbs (advised, promised, suggested).",
    focus: "Full backshift rules for statements, wh- questions, yes/no questions, and reporting verb patterns.",
  },
  {
    slug: "gerund-or-infinitive-b1",
    level: "b1-preliminary",
    title: "Gerund or infinitive: Do, to do, doing",
    description: "Verbs that change meaning with gerund vs infinitive (remember, stop, forget, try, regret).",
    focus: "Verbs with meaning change depending on gerund or to-infinitive (stop doing vs stop to do).",
  },
  {
    slug: "articles-rules-b1",
    level: "b1-preliminary",
    title: "A(n), the, no article",
    description: "Geographical names, institutions (school, hospital, prison), musical instruments, and transport collocations.",
    focus: "Article conventions for institutions (go to hospital vs go to the hospital), instruments, and geography.",
  },
  {
    slug: "reflexive-pronouns-b1",
    level: "b1-preliminary",
    title: "Reflexive pronouns: Myself, yourself",
    description: "Emphatic use (I did it myself) and reflexive actions vs reciprocal (each other).",
    focus: "Reflexive pronouns (myself, himself, themselves) vs reciprocal pronouns (each other).",
  },
  {
    slug: "quantifiers-all-types-b1",
    level: "b1-preliminary",
    title: "Much, many, a lot, little, few, some, any, no: Quantifiers",
    description: "Comprehensive quantifier mastery across formal, neutral, and informal registers.",
    focus: "Contrasting 'few' vs 'a few', 'little' vs 'a little', and negative polarity with 'any' vs 'no'.",
  },
  {
    slug: "all-both-quantifiers",
    level: "b1-preliminary",
    title: "All, both: Quantifiers",
    description: "Positions of all and both before nouns, with pronouns (all of them, both of us), and in mid-position.",
    focus: "Syntactic distribution of 'all' and 'both' with nouns, determiners, and pronouns.",
  },
  {
    slug: "both-either-neither",
    level: "b1-preliminary",
    title: "Both, either, neither: Quantifiers",
    description: "Referring to pairs: both ... and, either ... or, neither ... nor.",
    focus: "Correlative pairs (both...and, either...or, neither...nor) and singular/plural verb agreements.",
  },
  {
    slug: "any-no-none",
    level: "b1-preliminary",
    title: "Any, no, none: Quantifiers",
    description: "Using 'no' with a noun, 'none' as a standalone pronoun, and 'any' in negative/open contexts.",
    focus: "Distinguishing 'no' + noun, 'none of' + pronoun/determiner, and 'any' for free choice.",
  },
  {
    slug: "another-other-others",
    level: "b1-preliminary",
    title: "Another, other, others, the other, the others",
    description: "Determiners and pronouns for additional or alternative items.",
    focus: "Another (+ singular), other (+ plural), others (pronoun), the other (specific remaining).",
  },
  {
    slug: "relative-clauses-defining-non-defining-b1",
    level: "b1-preliminary",
    title: "Defining and non-defining relative clauses",
    description: "Essential defining clauses vs extra-information non-defining clauses with commas and whose/whom.",
    focus: "Punctuation, omission of object pronouns, and that vs which in relative clauses.",
  },
  {
    slug: "question-tags-b1",
    level: "b1-preliminary",
    title: "Question tags: Aren't you? don't you?",
    description: "Checking information and seeking agreement with inverted polarity tags across tenses.",
    focus: "Forming question tags across tenses, including special forms (I am -> aren't I, Let's -> shall we).",
  },
  {
    slug: "comparatives-superlatives-adjectives-adverbs-b1",
    level: "b1-preliminary",
    title: "Comparative and superlative adjectives and adverbs",
    description: "Structures with as ... as, not as ... as, much/far more, and double comparatives.",
    focus: "Equal comparison (as...as), modified comparatives (a bit slower, much faster), and irregular adverbs.",
  },
  {
    slug: "ed-ing-adjectives-b1",
    level: "b1-preliminary",
    title: "-Ed/-ing adjectives: Adjectives from verbs",
    description: "Feelings and emotional states (-ed: bored, interested) vs cause/characteristic (-ing: boring, interesting).",
    focus: "Contrasting participial adjectives ending in -ed (feeling) vs -ing (causing the feeling).",
  },
  {
    slug: "so-such-such-a-so-much-so-many",
    level: "b1-preliminary",
    title: "So, such, such a, so much, so many",
    description: "Emphasizing qualities and expressing consequences with 'so ... that' and 'such ... that'.",
    focus: "So + adjective, such + a/an + adj + singular noun, such + plural/uncountable, so much/many + noun.",
  },
  {
    slug: "compound-adjectives-with-numbers",
    level: "b1-preliminary",
    title: "Compound adjectives with numbers: 'A two-day trip'",
    description: "Hyphenated number-noun compound modifiers in singular form (a three-hour flight, a 10-pound note).",
    focus: "Hyphenated number + singular noun modifier structures before nouns.",
  },
  {
    slug: "clauses-contrast-purpose-reason-b1",
    level: "b1-preliminary",
    title: "Clauses of contrast, purpose and reason",
    description: "Connecting ideas with in spite of, despite, in order to, so that, due to, because of.",
    focus: "Despite / in spite of + noun/-ing vs although + clause; in order to + verb vs so that + clause.",
  },
  {
    slug: "verb-plus-preposition-b1",
    level: "b1-preliminary",
    title: "Verb + preposition",
    description: "Fixed collocations: depend on, apologize for, believe in, complain about, belong to.",
    focus: "Accurate preposition selection following common B1 verbs.",
  },
  {
    slug: "adjective-plus-preposition-b1",
    level: "b1-preliminary",
    title: "Adjective + preposition",
    description: "Collocations: proud of, interested in, good at, afraid of, keen on, famous for.",
    focus: "Fixed prepositional patterns following descriptive and emotional adjectives.",
  },
  {
    slug: "during-for-while",
    level: "b1-preliminary",
    title: "During, for, while",
    description: "Time periods: during + noun (events), for + duration (time span), while + clause (actions in progress).",
    focus: "During + noun phrase, for + time period, while + subject + verb.",
  },
  {
    slug: "for-since-from",
    level: "b1-preliminary",
    title: "For, since, from: What's the difference?",
    description: "For + duration, since + starting point in past, from ... to / from ... onwards.",
    focus: "Precision with starting points (since), total durations (for), and time ranges (from).",
  },

  // ==========================================
  // B1+ (Intermediate Plus / Pre-FCE) (35 topics)
  // ==========================================
  {
    slug: "present-perfect-simple-vs-continuous-b1plus",
    level: "b1-plus",
    title: "Choose between Present perfect simple or continuous",
    description: "Temporary habits vs permanent situations, state verbs in perfect continuous, and completion vs process.",
    focus: "Advanced distinction between present perfect simple (completion, result) and continuous (side-effects, recent ongoing activity).",
  },
  {
    slug: "narrative-tenses-all-past-b1plus",
    level: "b1-plus",
    title: "Narrative tenses: All past tenses",
    description: "Past simple, past continuous, past perfect simple and past perfect continuous in cohesive writing.",
    focus: "Cohesive integration of past simple, continuous, perfect, and perfect continuous in narratives.",
  },
  {
    slug: "future-continuous-future-perfect-b1plus",
    level: "b1-plus",
    title: "Future continuous and future perfect",
    description: "Actions in progress at a future point (will be doing) and actions completed by a future deadline (will have done).",
    focus: "Future continuous (will be doing) vs Future perfect simple (will have done by ...).",
  },
  {
    slug: "review-all-verb-tenses-b1-b2",
    level: "b1-plus",
    title: "Review of all verb tenses B1-B2",
    description: "Comprehensive synthesis of English verb tenses, time markers, and aspectual contrasts.",
    focus: "Accurate tense selection across complex compound and complex sentences.",
  },
  {
    slug: "neednt-dont-need-to-neednt-have",
    level: "b1-plus",
    title: "Needn't, don't need to, didn't need to, needn't have",
    description: "Distinguishing didn't need to do (unnecessary, may not have done) from needn't have done (done unnecessarily).",
    focus: "Didn't need to (no obligation) vs needn't have + past participle (action done in vain).",
  },
  {
    slug: "past-modal-verbs-deduction",
    level: "b1-plus",
    title: "Past modal verbs of deduction",
    description: "Deducing past events with must have done, can't have done, might have done, could have done.",
    focus: "Must have / can't have / might have / could have + past participle for past deduction.",
  },
  {
    slug: "probability-likely-unlikely-bound-definitely",
    level: "b1-plus",
    title: "Likely, unlikely, bound, definitely, probably: Probability",
    description: "Expressing likelihood with adjectives (be likely to do, be bound to do) and adverbs.",
    focus: "Be likely to / be unlikely to / be bound to + infinitive, and adverb placement.",
  },
  {
    slug: "used-to-be-used-to-get-used-to-b1plus",
    level: "b1-plus",
    title: "Used to, be used to, get used to",
    description: "Syntactic mastery of past habit structures vs noun/-ing complements for familiarity and adaptation.",
    focus: "Transformations between past habit (used to + base) and familiarity (be/get used to + gerund).",
  },
  {
    slug: "would-and-used-to-past-habits",
    level: "b1-plus",
    title: "Would and used to: Past habits and repeated actions",
    description: "Using 'would' for repeated past actions (not states) vs 'used to' for both states and habits.",
    focus: "Restricting 'would' to repeated past actions while using 'used to' for past states and verbs of being.",
  },
  {
    slug: "verbs-of-the-senses-b1plus",
    level: "b1-plus",
    title: "Verbs of the senses: Look, sound, feel, etc.",
    description: "Perception verbs followed by adjective, like + noun, and as if / as though + clause.",
    focus: "Look/sound/smell/taste/feel + adjective vs + like + noun vs + as if / as though + clause.",
  },
  {
    slug: "do-or-make-which-is-it",
    level: "b1-plus",
    title: "Do or Make: Which is it?",
    description: "Advanced collocations: do business, make an effort, do research, make a impression, do wonders.",
    focus: "Advanced idiomatic and professional collocations with 'do' vs 'make'.",
  },
  {
    slug: "zero-first-conditional-future-time",
    level: "b1-plus",
    title: "Zero and first conditional and future time clauses",
    description: "General scientific facts (zero) vs specific future contingencies with provided, as long as, on condition that.",
    focus: "Zero conditional for universal truths, first conditional with advanced linkers (provided that, assuming).",
  },
  {
    slug: "when-i-do-vs-when-i-have-done",
    level: "b1-plus",
    title: "When I do vs When I have done: Future time clauses",
    description: "Emphasizing completion before the main clause starts (when I have finished vs when I finish).",
    focus: "Present perfect in future time clauses (when/as soon as/after + have done) to indicate prior completion.",
  },
  {
    slug: "second-third-conditionals-b1plus",
    level: "b1-plus",
    title: "Second and third conditionals: Unreal conditionals",
    description: "Contrasting present hypothetical consequences with past hypothetical reflections and regrets.",
    focus: "Contrasting second conditional (present unreal) vs third conditional (past counterfactual).",
  },
  {
    slug: "wishes-and-regrets-wish-if-only",
    level: "b1-plus",
    title: "Wishes and regrets: I wish / if only",
    description: "Wishes about the present (wish + past), past regrets (wish + past perfect), and annoying habits (wish + would).",
    focus: "Wish/If only + past simple (present wish), + past perfect (past regret), + would (irritation/change).",
  },
  {
    slug: "the-passive-voice-all-tenses",
    level: "b1-plus",
    title: "The passive voice: All tenses",
    description: "Transforming all tenses (including perfect and continuous) and handling verbs with prepositions in passive voice.",
    focus: "Comprehensive passive voice conversion across all tenses and prepositional verbs.",
  },
  {
    slug: "passive-reporting-verbs-it-is-said",
    level: "b1-plus",
    title: "The passive with reporting verbs: It is said that...",
    description: "Impersonal reporting: 'It is believed that...' and personal passive 'He is believed to be...'.",
    focus: "Impersonal passives (It is reported that...) vs personal subject passives (He is said to have escaped).",
  },
  {
    slug: "have-something-done-causative",
    level: "b1-plus",
    title: "Have something done",
    description: "Arranging for services (have/get + object + past participle) and experiencing misfortunes.",
    focus: "Causative have/get + object + past participle for professional services and accidents.",
  },
  {
    slug: "gerund-infinitive-verb-patterns-b1plus",
    level: "b1-plus",
    title: "Gerund or infinitive: Verb patterns",
    description: "Complex patterns: verb + object + to-infinitive (encourage someone to do), verb + preposition + gerund.",
    focus: "Verb complements with objects and prepositions followed by to-infinitive or gerunds.",
  },
  {
    slug: "would-rather-would-prefer",
    level: "b1-plus",
    title: "Would rather, would prefer: Expressing preference",
    description: "Syntactic structures with would rather (bare inf / past tense) vs would prefer (to-inf / object + to-inf).",
    focus: "Would rather + bare verb vs would prefer + to-infinitive vs prefer + -ing + to + -ing.",
  },
  {
    slug: "reporting-verbs-patterns-b1plus",
    level: "b1-plus",
    title: "Reporting verbs: Admit doing, refuse to do, etc.",
    description: "Reporting speech concisely: admit + -ing, refuse + to do, remind + object + to do, accuse + of + -ing.",
    focus: "Direct conversion into varied reporting verb structures without using that-clauses.",
  },
  {
    slug: "quantifiers-all-most-both-either-neither",
    level: "b1-plus",
    title: "Quantifiers: All, most, both, either, neither, any, no, none",
    description: "Subject-verb agreement and pronoun reference with compound and distributive quantifiers.",
    focus: "Subject-verb agreement (singular vs plural) with either of, neither of, none of, each of.",
  },
  {
    slug: "whatever-whenever-wherever-whoever-however",
    level: "b1-plus",
    title: "Whatever, whenever, wherever, whoever, however",
    description: "Compound relative pronouns expressing 'it doesn't matter what/when/where/who/how'.",
    focus: "Compound -ever words in nominal and adverbial concession clauses.",
  },
  {
    slug: "auxiliary-verbs-different-uses-b1plus",
    level: "b1-plus",
    title: "Auxiliary verbs: Different uses",
    description: "Emphatic do (I do want to help), echo questions, short responses, and avoiding repetition.",
    focus: "Emphatic do/does/did, auxiliary ellipsis, and polite tag questions.",
  },
  {
    slug: "the-the-comparatives",
    level: "b1-plus",
    title: "The ... the ... comparatives",
    description: "Proportional comparisons: 'The more you practice, the easier it becomes.'",
    focus: "The + comparative clause, the + comparative clause for parallel progression.",
  },
  {
    slug: "participles-as-adjectives-ed-ing",
    level: "b1-plus",
    title: "Participles as adjectives: -ed/-ing adjectives",
    description: "Advanced participle adjectives modifying nouns (overwhelming news, relieved passengers, rewarding work).",
    focus: "Pre-modifying and post-modifying participial adjectives with subtle connotations.",
  },
  {
    slug: "so-such-a-so-much-so-many-b1plus",
    level: "b1-plus",
    title: "So, such (a), so much, so many",
    description: "Complex sentence modification expressing causes, intensity, and extreme outcomes.",
    focus: "Intensifiers so/such and result clauses in formal and informal registers.",
  },
  {
    slug: "adjectives-without-noun",
    level: "b1-plus",
    title: "Adjectives without noun",
    description: "Using 'the + adjective' for groups in society (the elderly, the unemployed, the rich) and abstract concepts.",
    focus: "The + adjective functioning as plural noun phrases referring to social groups.",
  },
  {
    slug: "adjective-order-b1plus",
    level: "b1-plus",
    title: "Adjective order",
    description: "Royal order of adjectives: Opinion, Size, Age, Shape, Colour, Origin, Material, Purpose + Noun.",
    focus: "Correct sequential order of multiple cumulative adjectives before a noun.",
  },
  {
    slug: "already-still-yet-difference",
    level: "b1-plus",
    title: "Already, still, yet: What's the difference?",
    description: "Timing and expectation in present, perfect, and continuous contexts.",
    focus: "Still (continuing state), yet (expected completion in negatives/questions), already (sooner than expected).",
  },
  {
    slug: "pretty-rather-quite-fairly-graders",
    level: "b1-plus",
    title: "Pretty, rather, quite, fairly",
    description: "Subtle grading of gradable and ungradable adjectives (quite good vs quite extraordinary).",
    focus: "Modifiers of degree (fairly < quite < pretty < rather) and modifier order with articles (quite a...).",
  },
  {
    slug: "clauses-contrast-purpose-b1plus",
    level: "b1-plus",
    title: "Clauses of contrast and purpose",
    description: "Whereas, while, even though, so as not to, in order that, with a view to.",
    focus: "Formal contrast linkers (whereas, despite the fact that) and purpose linkers (so as to, in order that).",
  },
  {
    slug: "questions-different-types-b1plus",
    level: "b1-plus",
    title: "Questions: Different types",
    description: "Negative questions (Didn't you see him?), rhetorical questions, and echo questions.",
    focus: "Form and pragmatic force of negative questions and reply questions.",
  },
  {
    slug: "indirect-questions-b1plus",
    level: "b1-plus",
    title: "Indirect questions",
    description: "Polite inquiries: 'Could you tell me where the station is?' with affirmative word order.",
    focus: "Embedded and indirect question structures maintaining statement word order (no do/does/did).",
  },
  {
    slug: "position-of-adverbs-adverb-phrase",
    level: "b1-plus",
    title: "Position of adverbs and adverb phrase",
    description: "Front, mid, and end position of manner, place, time, frequency, and viewpoint adverbs.",
    focus: "Manner-Place-Time order at sentence end, and mid-position rules around auxiliary verbs.",
  },

  // ==========================================
  // B2 First (FCE) (32 topics)
  // ==========================================
  {
    slug: "narrative-tenses-used-to-would-b2",
    level: "b2-first",
    title: "Narrative tenses, used to, would",
    description: "Sophisticated storytelling combining narrative tenses with used to and would for background atmosphere.",
    focus: "Advanced narrative pacing using past tenses, habitual would, and used to.",
  },
  {
    slug: "future-forms-b2",
    level: "b2-first",
    title: "Future forms: Expressing future time",
    description: "Nuanced future time expression: future continuous for polite queries, future perfect continuous for duration.",
    focus: "Future continuous for polite questions and future perfect continuous for ongoing future duration.",
  },
  {
    slug: "other-ways-express-future-b2",
    level: "b2-first",
    title: "Other ways to express future: Be about to, be due to, etc.",
    description: "Formal future expressions: be on the verge of, be bound to, be to, be due to, be set to.",
    focus: "Phrasal modal expressions for the imminent or scheduled future (be about to, be due to, be on the brink of).",
  },
  {
    slug: "future-in-the-past-b2",
    level: "b2-first",
    title: "Future in the past",
    description: "Expressing intentions that were never fulfilled or anticipated from a past perspective (was going to, was to).",
    focus: "Was/were going to, would, was/were to have + past participle for unfulfilled past intentions.",
  },
  {
    slug: "modal-verbs-advanced-b2",
    level: "b2-first",
    title: "Modal verbs: permission, obligation, prohibition, necessity",
    description: "Nuanced modals: be allowed to, be forbidden to, feel obliged to, be required to.",
    focus: "Formal and semi-modal expressions of permission, obligation, and necessity.",
  },
  {
    slug: "speculation-and-deduction-b2",
    level: "b2-first",
    title: "Speculation and deduction: Modal verbs and expressions",
    description: "Speculating with varied certainty: bound to, certain to, can't possibly, must have been.",
    focus: "Advanced modal combinations and adjective phrases expressing degree of certainty.",
  },
  {
    slug: "verbs-of-the-senses-b2",
    level: "b2-first",
    title: "Verbs of the senses",
    description: "Perception structures: see/hear + object + bare infinitive (complete) vs -ing (action in progress).",
    focus: "See/hear/watch/feel + object + bare infinitive (completed action) vs + object + -ing (ongoing).",
  },
  {
    slug: "get-different-meanings-b2",
    level: "b2-first",
    title: "Get: Different meanings",
    description: "Idiomatic expressions and phrasal uses with get (get over, get by, get across, get around to).",
    focus: "Idiomatic phrasal verbs and collocations with 'get'.",
  },
  {
    slug: "all-conditionals-mixed-inversion-b2",
    level: "b2-first",
    title: "All conditionals: mixed conditionals, alternatives to if, inversion",
    description: "Conditional mastery: mixed types, inversion (Had I known, Were you to), and conjunction alternatives.",
    focus: "Comprehensive conditional structures, alternative conjunctions, and inverted conditional clauses.",
  },
  {
    slug: "mixed-conditionals-b2",
    level: "b2-first",
    title: "Mixed conditionals: If I were you, I wouldn't have done it",
    description: "Combining past condition with present result (If had done, would be) and present condition with past result.",
    focus: "Type 2/3 mixed conditionals (past cause with present effect, or ongoing state with past consequence).",
  },
  {
    slug: "unreal-past-wish-rather-if-only-its-time",
    level: "b2-first",
    title: "Wish, rather, if only, it's time: unreal uses of past tenses",
    description: "Unreal past subjunctive forms expressing counterfactual desires and high time imperatives.",
    focus: "Subjunctive and past tense morphology after wish, if only, would rather, and it's (high) time.",
  },
  {
    slug: "conditionals-unless-even-if-provided",
    level: "b2-first",
    title: "Unless, even if, provided, as long as, etc.: Other expressions in conditionals",
    description: "Conditional connectives: on condition that, assuming that, suppose/supposing, in the event of.",
    focus: "Advanced conditional linkers replacing 'if' with nuanced semantic conditions.",
  },
  {
    slug: "distancing-expressions-passive-reporting",
    level: "b2-first",
    title: "Distancing: Expressions and passive of reporting verbs",
    description: "Softening assertions and academic distancing: It appears that, it would seem, is believed to have been.",
    focus: "Structures of caution and hedging (seem, appear, tend, passive reporting) in formal English.",
  },
  {
    slug: "passive-verbs-two-objects-b2",
    level: "b2-first",
    title: "Passive verbs with two objects",
    description: "Transforming ditransitive verbs into passive voice with personal subject vs direct object subject.",
    focus: "Transforming ditransitive verbs (give, send, offer, award) into primary and secondary passive forms.",
  },
  {
    slug: "verb-object-infinitive-gerund-patterns",
    level: "b2-first",
    title: "Verb + object + infinitive/gerund: Verb patterns",
    description: "Patterns: persuade someone to do, forbid someone from doing, enable someone to do, resent someone doing.",
    focus: "Complex verb complementation involving object pronouns followed by to-infinitive, bare infinitive, or gerund.",
  },
  {
    slug: "gerunds-infinitives-complex-forms",
    level: "b2-first",
    title: "Gerunds and infinitives: Complex forms",
    description: "Passive and perfect gerunds/infinitives (having done, being done, to have done, to be done).",
    focus: "Perfect gerunds (having seen), passive gerunds (being treated), and perfect infinitives (to have completed).",
  },
  {
    slug: "reflexive-reciprocal-pronouns-b2",
    level: "b2-first",
    title: "Reflexive and reciprocal pronouns",
    description: "Idiomatic uses of reflexive pronouns (by myself, make yourself at home, pride oneself on) vs reciprocal forms.",
    focus: "Fixed idioms with reflexive pronouns and reciprocal distinction (each other vs one another).",
  },
  {
    slug: "generic-common-gender-pronouns",
    level: "b2-first",
    title: "Generic or common-gender pronouns",
    description: "Singular 'they/them/their' for indefinite persons, and one/you for general truths.",
    focus: "Singular they/them/their for gender-neutral references and pronoun agreement.",
  },
  {
    slug: "compound-nouns-possessive-forms",
    level: "b2-first",
    title: "Compound nouns and possessive forms",
    description: "Noun + noun combinations, plural compound nouns, and complex possessive phrases.",
    focus: "Distinguishing noun + noun compounds (coffee cup) from possessive 's (the driver's door).",
  },
  {
    slug: "possessive-s-time-expressions",
    level: "b2-first",
    title: "Possessive 's with time expressions: Two hours' walk",
    description: "Using genitive 's and s' with time, distance, and duration measurements.",
    focus: "Possessive apostrophe placement with time and duration noun phrases (a day's work, three weeks' holiday).",
  },
  {
    slug: "relative-clauses-defining-non-defining-b2",
    level: "b2-first",
    title: "Relative clauses: Defining and non-defining",
    description: "Preposition placement (to whom, with which), sentential relative clauses (which surprised us), and whose.",
    focus: "Formal relative clauses with prepositions before relative pronouns, and comment clauses with 'which'.",
  },
  {
    slug: "preparatory-subjects-there-it",
    level: "b2-first",
    title: "'There' and 'it': Preparatory subjects",
    description: "Dummy subjects: 'It is essential that...', 'There is no point in doing...', 'It takes two hours to...'.",
    focus: "Preparatory 'it' with adjectives and that-clauses, and 'there' in existential and modal constructions.",
  },
  {
    slug: "have-auxiliary-or-main-verb",
    level: "b2-first",
    title: "Have: Auxiliary or main verb",
    description: "Contrasting auxiliary have (perfect tenses) with main verb have (possession, experiences, activities).",
    focus: "Question formation and negative auxiliary behavior with main verb 'have' vs auxiliary 'have'.",
  },
  {
    slug: "ellipsis-and-substitution",
    level: "b2-first",
    title: "Ellipsis and substitution",
    description: "Omitting words to avoid repetition (so, not, do so, one/ones, reduced infinitives).",
    focus: "Substitution with so/neither/one, and ellipsis of verbs and clauses after to-infinitives.",
  },
  {
    slug: "modifying-comparatives-b2",
    level: "b2-first",
    title: "Modifying comparatives",
    description: "Precision modifiers: marginally, significantly, substantially, slightly, nowhere near as... as.",
    focus: "Degree modifiers with comparatives (substantially higher, slightly less, far and away the best).",
  },
  {
    slug: "compound-adjectives-b2",
    level: "b2-first",
    title: "Compound adjectives in English",
    description: "Adjective/noun + participle compounds (hard-working, well-behaved, time-consuming, open-minded).",
    focus: "Formation and hyphenation of compound adjectives modifying nouns.",
  },
  {
    slug: "inversion-with-negative-adverbials",
    level: "b2-first",
    title: "Inversion with negative adverbials",
    description: "Emphasis with fronted negatives: Never have I seen..., Seldom do we..., Hardly had she arrived when...",
    focus: "Subject-auxiliary inversion following initial negative and limiting adverbials (hardly, scarcely, seldom, rarely, no sooner).",
  },
  {
    slug: "50-common-noun-preposition-collocations",
    level: "b2-first",
    title: "50 common Noun + Preposition collocations",
    description: "Fixed collocations: reaction to, solution to, demand for, increase in, reason for, decrease in.",
    focus: "Accurate preposition selection following key B2 abstract and academic nouns.",
  },
  {
    slug: "clauses-contrast-purpose-reason-result-b2",
    level: "b2-first",
    title: "Clauses of contrast, purpose, reason and result",
    description: "Advanced linkers: notwithstanding, given that, seeing that, with the intention of, so as to.",
    focus: "Complex cohesive subordinators and transitions connecting clauses in formal English.",
  },
  {
    slug: "discourse-markers-linking-words",
    level: "b2-first",
    title: "Discourse markers: Linking words",
    description: "Signposting ideas in essays and speaking: furthermore, nevertheless, on the other hand, in conclusion.",
    focus: "Discourse markers for structuring essays and conversations (furthermore, in contrast, consequently).",
  },
  {
    slug: "participle-clauses-b2",
    level: "b2-first",
    title: "Participle clauses",
    description: "Concise adverbial clauses with present (-ing) and past (-ed) participles (Having seen the film, she left).",
    focus: "Present, past, and perfect participle clauses expressing time, reason, and condition.",
  },
  {
    slug: "cleft-sentences-emphasis",
    level: "b2-first",
    title: "Cleft sentences: Adding emphasis",
    description: "Focusing information with It-clefts ('It was John who called') and Wh-clefts ('What I need is a holiday').",
    focus: "It-clefts (It is/was X that/who...) and pseudo-clefts (What I really want is...) for emphasis.",
  },
  // ==========================================
  // Phonetics & Pronunciation Topics per Level
  // ==========================================
  {
    slug: "phonetics-pronunciation-starters",
    level: "pre-a1-starters",
    title: "Pronunciation & Phonetics: Letters, Vowels & Basic Sounds",
    description: "Discover the sounds of English letters, basic vowels, and clear word pronunciation with audio.",
    focus: "Phonetics of single vowel sounds (/æ/, /e/, /ɪ/, /ɒ/, /ʌ/) and basic consonant articulation.",
  },
  {
    slug: "phonetics-pronunciation-movers",
    level: "a1-movers",
    title: "Pronunciation & Phonetics: Short vs Long Vowels & Plural -s",
    description: "Master the difference between short and long vowel sounds (/ɪ/ vs /iː/) and -s endings (/s/, /z/, /ɪz/).",
    focus: "Distinguishing short and long vowel pairs and correct plural/third-person -s endings.",
  },
  {
    slug: "phonetics-pronunciation-flyers",
    level: "a2-flyers",
    title: "Pronunciation & Phonetics: Past -ed Endings & Silent Letters",
    description: "Practise pronouncing regular past tense -ed endings (/t/, /d/, /ɪd/) and common silent letters.",
    focus: "Pronunciation rules for regular past verbs (-ed) and silent consonants in English words.",
  },
  {
    slug: "phonetics-pronunciation-key",
    level: "a2-key",
    title: "Pronunciation & Phonetics: Syllable Stress & Common Diphthongs",
    description: "Understand primary syllable stress (ˈ) and gliding diphthong sounds (/eɪ/, /aɪ/, /əʊ/, /aʊ/).",
    focus: "Syllable stress patterns in compound and multi-syllable everyday vocabulary.",
  },
  {
    slug: "phonetics-pronunciation-preliminary",
    level: "b1-preliminary",
    title: "Pronunciation & Phonetics: The Schwa (/ə/) & Connected Speech",
    description: "Master the most common English sound—the schwa /ə/—and weak forms of auxiliary verbs.",
    focus: "Unstressed syllables, the schwa /ə/, and natural rhythm in connected speech.",
  },
  {
    slug: "phonetics-pronunciation-b1-plus",
    level: "b1-plus",
    title: "Pronunciation & Phonetics: Sentence Stress & Intonation Patterns",
    description: "Explore expressive intonation (rising vs falling tones) and contrastive sentence stress.",
    focus: "Intonation patterns for questions, statements, attitude, and contrastive sentence stress.",
  },
  {
    slug: "phonetics-pronunciation-first",
    level: "b2-first",
    title: "Pronunciation & Phonetics: Advanced Linking, Elision & Assimilation",
    description: "Refine natural English fluency with consonant-to-vowel linking, elision, and sound assimilation.",
    focus: "Advanced connected speech features: catenation (linking /r/, /j/, /w/), elision, and assimilation.",
  },
]

export function topicsForLevel(level: CefrLevel): TopicDef[] {
  return topicCatalog.filter((topic) => topic.level === level)
}

export function findTopic(slug: string, level: CefrLevel): TopicDef | null {
  return topicCatalog.find((topic) => topic.slug === slug && topic.level === level) ?? null
}

export function resolveTopicSlug(slug: string, level: CefrLevel): TopicDef | null {
  const clean = slug.toLowerCase().trim()
  const list = topicsForLevel(level)

  // 1. Exact slug match
  const exact = list.find((t) => t.slug === clean)
  if (exact) return exact

  // 2. Starts with / prefix match
  const prefix = list.find((t) => t.slug.startsWith(clean) || clean.startsWith(t.slug))
  if (prefix) return prefix

  // 3. Keyword / partial slug match
  const words = clean.split(/[-_]+/).filter((w) => w.length > 2)
  if (words.length > 0) {
    const match = list.find((t) => {
      const topicWords = t.slug.split("-")
      return words.every((w) => topicWords.some((tw) => tw.includes(w) || w.includes(tw)))
    })
    if (match) return match
  }

  // 4. Title match
  const titleMatch = list.find((t) => t.title.toLowerCase().includes(clean.replace(/-/g, " ")))
  if (titleMatch) return titleMatch

  return null
}

/**
 * Returns complete pedagogical theory for any topic.
 * Young Learners (Pre A1 Starters, A1 Movers, A2 Flyers) get rich, child-friendly bilingual (EN/ES) explanations.
 */
export function getDefaultTopicTheoryData(topic: TopicDef, level: CefrLevel): TopicTheoryData {
  if (topic.theory) return topic.theory

  const slug = (topic.slug || "").toLowerCase()
  const isYoungLearner =
    level === "pre-a1-starters" ||
    level === "a1-movers" ||
    level === "a2-flyers" ||
    topic.level === "pre-a1-starters" ||
    topic.level === "a1-movers" ||
    topic.level === "a2-flyers"

  // -------------------------------------------------------------------------
  // 1. TO BE / WAS-WERE
  // -------------------------------------------------------------------------
  if (slug.includes("to-be") || slug.includes("was-were")) {
    const isPast = slug.includes("was-were")
    if (isYoungLearner) {
      return {
        concept: isPast
          ? "The verb 'to be' in the past (was / were) means 'era', 'fue' o 'estaba'. 🇪🇸 En español: Usamos 'was' (era/estaba) para una sola persona (I, He, She, It) y 'were' (éramos/estaban) para varias personas (You, We, They)."
          : "The verb 'to be' means 'ser' o 'estar'. In the present simple, it has three forms: am, is, and are. 🇪🇸 En español: El verbo 'to be' significa 'ser' o 'estar'. Usamos 'am' (soy/estoy), 'is' (es/está) y 'are' (somos/son/están).",
        formula: isPast
          ? [
              { label: "AFIRMATIVO / AFFIRMATIVE", text: "I / He / She / It + was (era/estaba) | You / We / They + were (éramos/estaban)" },
              { label: "NEGATIVO / NEGATIVE", text: "was not (wasn't) | were not (weren't)" },
              { label: "PREGUNTAS / QUESTIONS", text: "Was I/he/she/it...? | Were you/we/they...?" },
            ]
          : [
              { label: "AFIRMATIVO / AFFIRMATIVE", text: "I + am (Yo soy/estoy) | He / She / It + is (Él/Ella/Eso es/está) | You / We / They + are (Tú eres, Nosotros somos, Ellos son)" },
              { label: "NEGATIVO / NEGATIVE", text: "I am not (I'm not) | He/She/It is not (isn't) | You/We/They are not (aren't)" },
              { label: "PREGUNTAS / QUESTIONS", text: "Am I...? | Is he/she/it...? | Are you/we/they...?" },
            ],
        examples: isPast
          ? [
              { en: "I was at the park yesterday.", es: "Yo estaba en el parque ayer.", tip: "Usamos 'was' porque habla de 'I' (yo) en el pasado." },
              { en: "They were very happy with the puppies.", es: "Ellos estaban muy felices con los perritos.", tip: "Usamos 'were' porque 'they' son varias personas (plural)." },
            ]
          : [
              { en: "I am a student.", es: "Yo soy estudiante.", tip: "Usamos 'am' únicamente con el pronombre 'I' (yo)." },
              { en: "The cat is on the sofa.", es: "El gato está en el sofá.", tip: "Usamos 'is' con una sola persona, animal o cosa (singular)." },
              { en: "We are best friends.", es: "Nosotros somos mejores amigos.", tip: "Usamos 'are' para grupos de dos o más personas (plural) y con 'you'." },
            ],
        tips: [
          "🇪🇸 ¡Regla de oro! 'I' siempre va con 'am'. Nunca digas 'I is'.",
          "🇪🇸 Truco fácil: Si hablas de uno solo (He, She, It, el perro, la casa), usa 'is'.",
          "🇪🇸 Truco fácil: Si hablas de varios (We, They, mis amigos), usa 'are'.",
          "🇪🇸 Recuerda: 'You' siempre usa 'are' (presente) o 'were' (pasado).",
        ],
        keyWords: isPast ? ["yesterday", "last night", "was", "were", "ago"] : ["am", "is", "are", "student", "teacher", "happy", "school", "friends"],
      }
    }
    return {
      concept: isPast
        ? "The verb 'to be' in the past simple has two forms: was and were. It describes past states, emotions, locations, or identities."
        : "The verb 'to be' is the most fundamental verb in English. In the present simple, it has three forms: am, is, and are.",
      formula: isPast
        ? [
            { label: "Affirmative", text: "I / He / She / It + was | You / We / They + were" },
            { label: "Negative", text: "Subject + was not (wasn't) / were not (weren't)" },
            { label: "Questions", text: "Was / Were + Subject + ... ?" },
          ]
        : [
            { label: "Affirmative", text: "I + am | He / She / It + is | You / We / They + are" },
            { label: "Negative", text: "Subject + am not / is not (isn't) / are not (aren't)" },
            { label: "Questions", text: "Am / Is / Are + Subject + ... ?" },
          ],
      examples: isPast
        ? [
            { en: "She was at the library yesterday.", es: "Ella estaba en la biblioteca ayer.", tip: "Use 'was' with singular third person." },
            { en: "They were very excited about the game.", es: "Ellos estaban muy emocionados por el partido.", tip: "Use 'were' with plural subjects." },
          ]
        : [
            { en: "I am a student at the language center.", es: "Soy estudiante en el centro de idiomas.", tip: "Only use 'am' with pronoun 'I'." },
            { en: "The book is on the desk.", es: "El libro está sobre el escritorio.", tip: "Use 'is' with singular nouns and he/she/it." },
          ],
      tips: [
        "In spoken English and informal writing, contractions (I'm, she's, they're, isn't, weren't) are standard.",
        "Remember that 'You' always takes 'are' (present) or 'were' (past), even when referring to one person.",
      ],
      keyWords: isPast ? ["yesterday", "last night", "ago", "were", "was"] : ["always", "today", "now", "student", "teacher"],
    }
  }

  // -------------------------------------------------------------------------
  // 2. PRESENT CONTINUOUS
  // -------------------------------------------------------------------------
  if (slug.includes("present-continuous")) {
    if (isYoungLearner) {
      return {
        concept: "The Present Continuous (am/is/are + verb-ing) describes actions happening RIGHT NOW! 🇪🇸 En español: Se usa para acciones que están pasando en este mismo momento (jugando, comiendo, durmiendo).",
        formula: [
          { label: "AFIRMATIVO / AFFIRMATIVE", text: "Subject + am / is / are + verb-ing (I am playing / He is eating / They are running)" },
          { label: "NEGATIVO / NEGATIVE", text: "Subject + am not / isn't / aren't + verb-ing (She isn't sleeping)" },
          { label: "PREGUNTAS / QUESTIONS", text: "Am / Is / Are + Subject + verb-ing...? (Are you listening?)" },
        ],
        examples: [
          { en: "Look! The boy is jumping.", es: "¡Mira! El niño está saltando.", tip: "Palabras como 'Look!' o 'Now' indican que pasa en este momento." },
          { en: "They are playing football in the garden.", es: "Ellos están jugando fútbol en el jardín.", tip: "Usamos 'are' porque 'they' son varias personas." },
        ],
        tips: [
          "🇪🇸 ¡No olvides el verbo to be! No digas 'He playing', di 'He is playing'.",
          "🇪🇸 Para formar el '-ing': play -> playing, read -> reading, jump -> jumping.",
          "🇪🇸 Si el verbo termina en 'e' muda, se quita la 'e': dance -> dancing, write -> writing.",
        ],
        keyWords: ["now", "right now", "playing", "eating", "reading", "running", "look", "listen"],
      }
    }
    return {
      concept: "The Present Continuous (am/is/are + verb-ing) describes actions taking place right now, temporary situations, or definite future plans.",
      formula: [
        { label: "Affirmative", text: "Subject + am/is/are + verb-ing" },
        { label: "Negative", text: "Subject + am/is/are + not + verb-ing" },
        { label: "Questions", text: "Am/Is/Are + Subject + verb-ing ... ?" },
      ],
      examples: [
        { en: "She is writing an email right now.", es: "Ella está escribiendo un correo ahora mismo.", tip: "Actions happening at the moment of speaking." },
        { en: "Look! They are playing in the garden.", es: "¡Mira! Están jugando en el jardín.", tip: "Words like 'Look!' or 'Listen!' signal present continuous." },
      ],
      tips: [
        "Stative verbs (like love, know, understand, believe, want) are rarely used in continuous tenses.",
        "Spelling rule: verbs ending in consonant-vowel-consonant double the last consonant (run -> running, sit -> sitting).",
      ],
      keyWords: ["now", "right now", "at the moment", "look", "listen"],
    }
  }

  // -------------------------------------------------------------------------
  // 3. HAVE / HAS GOT
  // -------------------------------------------------------------------------
  if (slug.includes("have-has-got") || slug.includes("have-has")) {
    if (isYoungLearner) {
      return {
        concept: "We use 'have got' and 'has got' to talk about possessions, family, and physical features. 🇪🇸 En español: Significa 'tener'. Se usa para hablar de cosas que tenemos, de nuestra familia o de cómo somos físicamente.",
        formula: [
          { label: "AFIRMATIVO / AFFIRMATIVE", text: "I / You / We / They + have got ('ve got) | He / She / It + has got ('s got)" },
          { label: "NEGATIVO / NEGATIVE", text: "haven't got (no tener) | hasn't got (él/ella no tiene)" },
          { label: "PREGUNTAS / QUESTIONS", text: "Have you got...? (¿Tienes...?) | Has he/she got...? (¿Tiene él/ella...?)" },
        ],
        examples: [
          { en: "I have got a new blue bicycle.", es: "Tengo una bicicleta azul nueva.", tip: "Con 'I' (yo) usamos 'have got'." },
          { en: "She has got two brothers and green eyes.", es: "Ella tiene dos hermanos y ojos verdes.", tip: "Con 'She' (ella) usamos 'has got'." },
        ],
        tips: [
          "🇪🇸 Cuidado con He / She / It: siempre llevan 'has got', nunca 'have got'.",
          "🇪🇸 Respuestas cortas: 'Yes, I have' / 'No, I haven't' (¡no agregues 'got' al final!).",
        ],
        keyWords: ["have", "has", "got", "eyes", "hair", "brother", "sister", "bicycle", "pet"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. CAN / CAN'T (ABILITY & PERMISSION)
  // -------------------------------------------------------------------------
  if (slug.includes("can-cant") || slug.includes("ability")) {
    if (isYoungLearner) {
      return {
        concept: "We use 'can' and 'can't' for things we are able to do or allowed to do. 🇪🇸 En español: Significa 'poder' o 'saber hacer algo' (ej. saber nadar, poder correr, pedir permiso).",
        formula: [
          { label: "AFIRMATIVO / AFFIRMATIVE", text: "Subject + can + verb (I can swim / Birds can fly)" },
          { label: "NEGATIVO / NEGATIVE", text: "Subject + cannot / can't + verb (Fish can't walk)" },
          { label: "PREGUNTAS / QUESTIONS", text: "Can + Subject + verb...? (Can you jump high?)" },
        ],
        examples: [
          { en: "A monkey can climb tall trees.", es: "Un mono puede trepar árboles altos.", tip: "Después de 'can' el verbo va en su forma simple (sin 'to' ni '-ing')." },
          { en: "I can't speak Italian, but I can speak English.", es: "No sé hablar italiano, pero sé hablar inglés.", tip: "'Can't' es la forma corta de 'cannot'." },
        ],
        tips: [
          "🇪🇸 ¡Súper fácil! 'Can' es igual para todas las personas (I can, you can, he can, they can).",
          "🇪🇸 Nunca pongas 'to' después de 'can' (di 'I can swim', NO 'I can to swim').",
        ],
        keyWords: ["can", "cant", "swim", "fly", "jump", "sing", "dance", "speak", "play"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. THIS, THAT, THESE, THOSE
  // -------------------------------------------------------------------------
  if (slug.includes("this-that") || slug.includes("demonstrative") || slug.includes("this-vs-it")) {
    if (isYoungLearner) {
      return {
        concept: "This and That are for ONE thing. These and Those are for TWO OR MORE things! 🇪🇸 En español: 'This' (esto/este) y 'These' (estos/estas) para lo que está CERCA. 'That' (eso/aquel) y 'Those' (esos/aquellos) para lo que está LEJOS.",
        formula: [
          { label: "CERCA / NEAR (en la mano o aquí)", text: "THIS IS (1 cosa cerca) | THESE ARE (varias cosas cerca)" },
          { label: "LEJOS / FAR (allá a la distancia)", text: "THAT IS (1 cosa lejos) | THOSE ARE (varias cosas lejos)" },
        ],
        examples: [
          { en: "This is my red pencil in my hand.", es: "Este es mi lápiz rojo en mi mano.", tip: "Está cerca y es uno solo -> This is." },
          { en: "Those birds are flying high in the sky.", es: "Aquellos pájaros están volando alto en el cielo.", tip: "Están lejos y son varios -> Those are." },
        ],
        tips: [
          "🇪🇸 Singular (1): This / That -> van con 'is'.",
          "🇪🇸 Plural (2+): These / Those -> van con 'are'.",
          "🇪🇸 'This' suena corto (/ðɪs/), 'These' suena con 'i' larga (/ðiːz/).",
        ],
        keyWords: ["this", "that", "these", "those", "here", "there", "near", "far"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. A / AN & PLURALS
  // -------------------------------------------------------------------------
  if (slug.includes("a-an") || slug.includes("plural")) {
    if (isYoungLearner) {
      return {
        concept: "Use 'a' before consonant sounds and 'an' before vowel sounds (a, e, i, o, u). 🇪🇸 En español: 'A' y 'an' significan 'un' o 'una'. Usamos 'an' antes de vocal para que suene fluido (an apple, an elephant). Para plural agregamos '-s'.",
        formula: [
          { label: "A + SONIDO CONSONANTE", text: "a book, a dog, a car, a banana, a teacher" },
          { label: "AN + SONIDO VOCAL (A, E, I, O, U)", text: "an apple, an elephant, an ice cream, an orange, an umbrella" },
          { label: "PLURAL (+S / +ES)", text: "1 cat -> 2 cats | 1 box -> 2 boxes | 1 bus -> 2 buses" },
        ],
        examples: [
          { en: "I have an orange and a sandwich in my bag.", es: "Tengo una naranja y un sándwich en mi mochila.", tip: "'Orange' empieza con sonido vocal (an), 'sandwich' con consonante (a)." },
          { en: "Look at the three big dogs in the park.", es: "Mira los tres perros grandes en el parque.", tip: "En plural no usamos 'a' ni 'an', agregamos '-s' al sustantivo." },
        ],
        tips: [
          "🇪🇸 'A' y 'an' solo se usan con UNA sola cosa (singular). Nunca digas 'a books'.",
          "🇪🇸 Palabras que terminan en -s, -ss, -sh, -ch, -x agregan '-es' en plural (box -> boxes, watch -> watches).",
        ],
        keyWords: ["apple", "elephant", "orange", "umbrella", "book", "dog", "cats", "boxes"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. THERE IS / THERE ARE
  // -------------------------------------------------------------------------
  if (slug.includes("there-is") || slug.includes("there-are") || slug.includes("there-or-it")) {
    if (isYoungLearner) {
      return {
        concept: "There is (1 thing) and There are (2+ things) mean 'HAY' in Spanish! 🇪🇸 En español: 'There is' = hay una sola cosa. 'There are' = hay dos o más cosas.",
        formula: [
          { label: "PRESENTE / PRESENT", text: "There is + singular (There is a cat) | There are + plural (There are five dogs)" },
          { label: "PASADO / PAST", text: "There was + singular (Había uno) | There were + plural (Había varios)" },
          { label: "PREGUNTAS / QUESTIONS", text: "Is there a...? (¿Hay uno...?) | Are there any...? (¿Hay algunos...?)" },
        ],
        examples: [
          { en: "There is a big clock on the wall.", es: "Hay un reloj grande en la pared.", tip: "Usamos 'There is' porque es un solo reloj." },
          { en: "There are four apples in the basket.", es: "Hay cuatro manzanas en la canasta.", tip: "Usamos 'There are' porque son cuatro (plural)." },
        ],
        tips: [
          "🇪🇸 Para una sola cosa: There is (forma corta: There's).",
          "🇪🇸 Para varias cosas: There are (no se puede abreviar en afirmación).",
          "🇪🇸 Para preguntar, invierte el orden: 'Is there...?' o 'Are there...?'",
        ],
        keyWords: ["there", "is", "are", "was", "were", "clock", "table", "room", "basket"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 8. POSSESSIVE ADJECTIVES (MY, YOUR, HIS, HER, OUR, THEIR)
  // -------------------------------------------------------------------------
  if (slug.includes("possessive") || slug.includes("pronouns")) {
    if (isYoungLearner) {
      return {
        concept: "Possessive adjectives show who owns something! 🇪🇸 En español: Indican de quién es cada cosa: my (mi), your (tu), his (su de él), her (su de ella), our (nuestro), their (su de ellos).",
        formula: [
          { label: "PRONOMBRES Y POSESIVOS", text: "I -> my (mi) | you -> your (tu) | he -> his (su de él) | she -> her (su de ella) | it -> its (su de un animal/cosa) | we -> our (nuestro) | they -> their (su de ellos)" },
        ],
        examples: [
          { en: "This is my jacket and that is his backpack.", es: "Esta es mi chaqueta y esa es la mochila de él.", tip: "'His' significa 'su' cuando pertenece a un niño o varón." },
          { en: "Emma is playing with her new doll.", es: "Emma está jugando con su muñeca nueva.", tip: "'Her' significa 'su' cuando pertenece a una niña o mujer." },
        ],
        tips: [
          "🇪🇸 ¡Cuidado especial! Para un chico usa 'his', para una chica usa 'her'.",
          "🇪🇸 'Our' es para 'nosotros' (our school = nuestra escuela).",
          "🇪🇸 'Their' es para 'ellos' (their house = la casa de ellos).",
        ],
        keyWords: ["my", "your", "his", "her", "its", "our", "their", "bag", "toy", "family"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 9. PREPOSITIONS OF PLACE (IN, ON, AT, UNDER, NEXT TO, BEHIND)
  // -------------------------------------------------------------------------
  if (slug.includes("preposition") || slug.includes("place") || slug.includes("at-in-on")) {
    if (isYoungLearner) {
      return {
        concept: "Prepositions of place tell us WHERE something is! 🇪🇸 En español: Indican dónde está un objeto o persona: in (adentro), on (sobre/encima), under (debajo), next to (al lado), behind (detrás), in front of (delante de).",
        formula: [
          { label: "IN (ADENTRO)", text: "in the box, in the room, in the bag (dentro de un espacio cerrado)" },
          { label: "ON (SOBRE LA SUPERFICIE)", text: "on the table, on the floor, on the wall (tocando la superficie)" },
          { label: "POSICIONES", text: "under (debajo) | next to (al lado) | behind (detrás) | in front of (delante)" },
        ],
        examples: [
          { en: "The cat is sleeping under the table.", es: "El gato está durmiendo debajo de la mesa.", tip: "'Under' significa debajo." },
          { en: "My books are in the schoolbag.", es: "Mis libros están dentro de la mochila.", tip: "'In' significa adentro." },
          { en: "The teacher is in front of the board.", es: "La maestra está delante de la pizarra.", tip: "'In front of' significa delante de." },
        ],
        tips: [
          "🇪🇸 'On' toca la superficie (on the desk). 'In' está adentro cerrado (in the box).",
          "🇪🇸 'Next to' va siempre con 'to' (next to the door = al lado de la puerta).",
        ],
        keyWords: ["in", "on", "under", "next to", "behind", "in front of", "between", "box", "table"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 10. PAST SIMPLE (REGULAR & IRREGULAR) - MOVERS / FLYERS
  // -------------------------------------------------------------------------
  if (slug.includes("past-simple") || slug.includes("regular-irregular")) {
    if (isYoungLearner) {
      return {
        concept: "We use the Past Simple for actions that finished in the past (yesterday, last week). 🇪🇸 En español: El pasado simple se usa para contar cosas que ya pasaron (jugó, comió, fue). A los verbos regulares les agregamos '-ed'.",
        formula: [
          { label: "REGULARES (+ED)", text: "play -> played | watch -> watched | walk -> walked" },
          { label: "IRREGULARES (MEMORIA)", text: "go -> went | see -> saw | have -> had | eat -> ate | do -> did" },
          { label: "NEGATIVO Y PREGUNTAS", text: "didn't + verbo base (I didn't go) | Did you + verbo base...? (Did you see?)" },
        ],
        examples: [
          { en: "Yesterday, I played video games with my brother.", es: "Ayer jugué videojuegos con mi hermano.", tip: "Palabras como 'yesterday' indican que la acción terminó en el pasado." },
          { en: "She went to the zoo last Saturday.", es: "Ella fue al zoológico el sábado pasado.", tip: "'Went' es el pasado irregular de 'go'." },
        ],
        tips: [
          "🇪🇸 Cuando usas 'didn't' o 'Did...?', el verbo vuelve a su forma normal (di 'I didn't play', NO 'I didn't played').",
          "🇪🇸 Palabras clave de tiempo pasado: yesterday (ayer), last night (anoche), last week (la semana pasada), ago (hace...).",
        ],
        keyWords: ["yesterday", "last", "played", "went", "saw", "had", "ate", "did", "didn't"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 11. COMPARATIVES & SUPERLATIVES - MOVERS / FLYERS
  // -------------------------------------------------------------------------
  if (slug.includes("comparative") || slug.includes("superlative")) {
    if (isYoungLearner) {
      return {
        concept: "Comparatives compare 2 things (-er than). Superlatives show the #1 of all (the -est). 🇪🇸 En español: Comparativos (más que): taller than (más alto que). Superlativos (el más): the tallest (el más alto).",
        formula: [
          { label: "COMPARATIVO (+ER THAN)", text: "fast -> faster than | big -> bigger than | small -> smaller than" },
          { label: "SUPERLATIVO (THE +EST)", text: "the fastest (el más rápido) | the biggest | the smallest" },
          { label: "IRREGULARES", text: "good -> better than -> the best | bad -> worse than -> the worst" },
        ],
        examples: [
          { en: "An elephant is bigger than a lion.", es: "Un elefante es más grande que un león.", tip: "Comparamos 2 animales -> bigger than." },
          { en: "The blue whale is the biggest animal in the world.", es: "La ballena azul es el animal más grande del mundo.", tip: "Es el número 1 de todos -> the biggest." },
        ],
        tips: [
          "🇪🇸 Siempre pon 'than' después del comparativo (taller than, bigger than).",
          "🇪🇸 Siempre pon 'the' antes del superlativo (the tallest, the best).",
        ],
        keyWords: ["bigger", "smaller", "faster", "taller", "the biggest", "the best", "than"],
      }
    }
  }

  // -------------------------------------------------------------------------
  // 12. PHONETICS & PRONUNCIATION
  // -------------------------------------------------------------------------
  if (slug.includes("phonetic") || slug.includes("pronunciation")) {
    return {
      concept: isYoungLearner
        ? "In English, words sound different from how they are written! 🇪🇸 En español: En inglés las letras pueden sonar diferente. Haz clic en el botón de audio 🔊 en cada palabra para escuchar cómo se pronuncia con acento nativo."
        : "English is not a phonetic language—words are often pronounced differently from how they are spelled. Mastering IPA and word stress builds clear listening and speaking skills.",
      formula: [
        { label: "Vowel Sounds", text: "Short vowels (/ɪ/, /e/, /æ/, /ʌ/, /ɒ/, /ʊ/) vs Long vowels (/iː/, /ɑː/, /ɔː/, /uː/, /ɜː/)" },
        { label: "Diphthongs", text: "Two vowel sounds gliding together (/eɪ/, /aɪ/, /ɔɪ/, /aʊ/, /əʊ/, /ɪə/, /eə/)" },
        { label: "Word Stress", text: "The mark (ˈ) indicates the primary stressed syllable in the phonetic transcription." },
      ],
      examples: [
        { en: "Ship (/ʃɪp/) vs Sheep (/ʃiːp/)", es: "Diferencia entre vocal corta /ɪ/ (barco) y vocal larga /iː/ (oveja).", tip: "El largo del sonido vocal cambia totalmente el significado de la palabra." },
        { en: "Cat (/kæt/) vs Cut (/kʌt/)", es: "Diferencia entre sonido /æ/ (gato) y /ʌ/ (cortar).", tip: "Abre la boca un poco más para el sonido /æ/ de 'cat'." },
      ],
      tips: [
        "🔊 Haz clic en el parlante al lado de cada palabra para escuchar la pronunciación.",
        "👂 Repite en voz alta después de escuchar para mejorar tu entonación y confianza.",
      ],
      keyWords: ["pronunciation", "vowel", "consonant", "accent", "syllable", "sound", "listen"],
    }
  }

  // -------------------------------------------------------------------------
  // 13. SMART BILINGUAL GENERATOR FOR ALL OTHER YOUNG LEARNERS TOPICS
  // -------------------------------------------------------------------------
  if (isYoungLearner) {
    return {
      concept: `${topic.title}: ${topic.description || "Learn and practise this fundamental English topic."} 🇪🇸 En español: ${topic.description || "Aprende y practica este tema paso a paso con explicaciones sencillas y ejemplos para principiantes."}`,
      formula: [
        { label: "REGLA PRINCIPAL / MAIN RULE", text: topic.focus || "Aprende la estructura básica y practica con oraciones cortas." },
        { label: "USO Y CONTEXTO", text: "Usa palabras y vocabulario cotidiano adecuado para el nivel " + level.toUpperCase() },
      ],
      examples: [
        {
          en: `Practise ${topic.title} with everyday English.`,
          es: `Practica ${topic.title} con oraciones sencillas y claras en español.`,
          tip: "Presta atención al sujeto y al orden de las palabras.",
        },
      ],
      tips: [
        "🇪🇸 Lee la oración completa con atención antes de elegir tu respuesta.",
        "🇪🇸 Si te equivocas, lee la explicación en español para entender la regla.",
        "🇪🇸 ¡La práctica diaria te ayudará a ganar confianza en inglés!",
      ],
      keyWords: ["practice", "english", "learn", "words", "sentence", "grammar", "easy"],
    }
  }

  // -------------------------------------------------------------------------
  // 14. DEFAULT PEDAGOGICAL BREAKDOWN (HIGHER LEVELS B1-C2)
  // -------------------------------------------------------------------------
  return {
    concept: topic.description || `Understanding and applying the grammar principles of "${topic.title}".`,
    formula: [
      { label: "Grammar Focus", text: topic.focus || "Core linguistic structure" },
      { label: "Application", text: "Use appropriate sentence structures and register appropriate for CEFR " + level.toUpperCase() },
    ],
    examples: [
      {
        en: `Practise ${topic.title} in real-world contexts.`,
        es: "Ejemplo contextualizado según el nivel correspondiente.",
        tip: "Pay attention to word order, auxiliary verbs, and nuance.",
      },
    ],
    tips: [
      "Read each sentence carefully and identify the time markers and subject-verb agreement.",
      "Review explanations after each question to reinforce the grammar rule.",
    ],
    keyWords: ["grammar", "practice", "sentence", "context", "accuracy"],
  }
}

