export type Difficulty = "easy" | "medium" | "hard" | "master"
export type CefrLevel = "pre-a1-starters" | "a1-movers" | "a2-flyers" | "a2-key" | "b1-preliminary" | "b2-first" | "c1-advanced" | "c2-proficiency"

export type LevelBand = "Young learners" | "Basic" | "Independent" | "Proficient"
export type CefrLevelInfo = { id: CefrLevel; code: string; exam: string; band: LevelBand; description: string }

export const cefrLevels: CefrLevelInfo[] = [
  { id: "pre-a1-starters", code: "Pre A1", exam: "Starters", band: "Young learners", description: "Begin recognising familiar words, names and very simple phrases." },
  { id: "a1-movers", code: "A1", exam: "Movers", band: "Young learners", description: "Understand and use familiar everyday expressions in simple exchanges." },
  { id: "a2-flyers", code: "A2", exam: "Flyers", band: "Young learners", description: "Communicate in familiar situations with everyday words and phrases." },
  { id: "a2-key", code: "A2", exam: "Key", band: "Basic", description: "Use written and spoken English in simple, routine situations." },
  { id: "b1-preliminary", code: "B1", exam: "Preliminary", band: "Independent", description: "Handle everyday situations and express main ideas clearly." },
  { id: "b2-first", code: "B2", exam: "First", band: "Independent", description: "Communicate fluently and work with more complex language." },
  { id: "c1-advanced", code: "C1", exam: "Advanced", band: "Proficient", description: "Use English flexibly for academic and professional purposes." },
  { id: "c2-proficiency", code: "C2", exam: "Proficiency", band: "Proficient", description: "Understand and express virtually everything with precision." },
]

export function levelLabel(level: CefrLevel) {
  const item = cefrLevels.find((candidate) => candidate.id === level)
  return item ? `${item.code} ${item.exam}` : level
}

export const topic = {
  id: "reported-speech",
  title: "Reported Speech",
  description: "Transform direct speech, questions and requests with accurate tense and perspective changes.",
}

export type Question = {
  id: string
  difficulty: Difficulty
  prompt: string
  options: string[]
  answer: number
  explanation: string
  /** Optional metadata for backend-generated vocabulary exercises. */
  word?: string
}

const q = (id: string, difficulty: Difficulty, prompt: string, options: string[], answer: number, explanation: string): Question => ({ id, difficulty, prompt, options, answer, explanation })

export const questions: Question[] = [
  q("e01","easy",'Mia said, “I am tired.”',["Mia said that she was tired.","Mia said that I am tired.","Mia said that she is tired yesterday."],0,"Present simple usually shifts to past simple after a past reporting verb."),
  q("e02","easy",'Tom said, “I work from home.”',["Tom said that he worked from home.","Tom said that he works from home yesterday.","Tom said that I worked from home."],0,"Work shifts to worked, and I changes to he."),
  q("e03","easy",'Nora said, “We are ready.”',["Nora said that they were ready.","Nora said that we are ready.","Nora said they had ready."],0,"Are shifts to were, and we changes according to the speaker."),
  q("e04","easy",'Leo said, “I saw Ben.”',["Leo said that he had seen Ben.","Leo said that he has saw Ben.","Leo said that I saw Ben."],0,"Past simple commonly backshifts to past perfect."),
  q("e05","easy",'Ana said, “I have finished.”',["Ana said that she had finished.","Ana said that she finished tomorrow.","Ana said that I have finished."],0,"Present perfect shifts to past perfect."),
  q("e06","easy",'Sam said, “I will call you.”',["Sam said that he would call me.","Sam said that he will called me.","Sam said that I would call you."],0,"Will shifts to would and pronouns change with perspective."),
  q("e07","easy",'Eva said, “I can swim.”',["Eva said that she could swim.","Eva said that she can swam.","Eva said that I could swim."],0,"Can normally shifts to could."),
  q("e08","easy",'Max said, “This is my book.”',["Max said that it was his book.","Max said that this is my book.","Max said that it had his book."],0,"This and my change to match the new context."),
  q("e09","easy",'Lily said, “I am cooking.”',["Lily said that she was cooking.","Lily said that she cooked now.","Lily said that I am cooking."],0,"Present continuous shifts to past continuous."),
  q("e10","easy",'Dan said, “We bought a car.”',["Dan said that they had bought a car.","Dan said that we buy a car.","Dan said that they have buy a car."],0,"Bought backshifts to had bought."),
  q("e11","easy",'Ivy said, “My sister is here.”',["Ivy said that her sister was there.","Ivy said my sister is here.","Ivy said that his sister had been here."],0,"My becomes her, is becomes was, and here becomes there."),
  q("e12","easy",'Omar said, “I need help.”',["Omar said that he needed help.","Omar said that I need help.","Omar said that he had need help."],0,"Need shifts from present to past simple."),
  q("e13","easy",'Zoe said, “I do not agree.”',["Zoe said that she did not agree.","Zoe said that she does not agreed.","Zoe said that I had not agree."],0,"Do not agree shifts to did not agree."),
  q("e14","easy",'Ben said, “They are leaving.”',["Ben said that they were leaving.","Ben said that they had leaving.","Ben said that we are leaving."],0,"Present continuous becomes past continuous."),
  q("e15","easy",'Kim said, “I may be late.”',["Kim said that she might be late.","Kim said that she may was late.","Kim said that I might late."],0,"May commonly shifts to might."),

  q("m01","medium",'“Where do you live?” she asked me.',["She asked me where I lived.","She asked me where did I live.","She asked where do you live."],0,"Reported questions use statement word order and no auxiliary do."),
  q("m02","medium",'“Are you busy?” Paul asked.',["Paul asked if I was busy.","Paul asked was I busy.","Paul said if am I busy."],0,"Yes/no questions use if or whether plus statement word order."),
  q("m03","medium",'“Please sit down,” the doctor said.',["The doctor asked me to sit down.","The doctor said me sit down.","The doctor asked that I sat down."],0,"Polite requests are often reported with asked + object + to-infinitive."),
  q("m04","medium",'“Do not touch it,” she said.',["She told me not to touch it.","She told me do not touch it.","She said me not touching it."],0,"Negative commands use told + object + not to-infinitive."),
  q("m05","medium",'“I will finish this tomorrow,” Raj said.',["Raj said that he would finish it the next day.","Raj said he will finish this tomorrow.","Raj said that he finished it yesterday."],0,"Will becomes would; this and tomorrow shift with context."),
  q("m06","medium",'“We met here yesterday,” they said.',["They said that they had met there the day before.","They said that we met here yesterday.","They said they have met there tomorrow."],0,"Here becomes there and yesterday becomes the day before."),
  q("m07","medium",'“What are you doing?” he asked.',["He asked what I was doing.","He asked what was I doing.","He asked what am I doing."],0,"Wh-questions keep the question word but use statement order."),
  q("m08","medium",'“Can you help me?” Sara asked.',["Sara asked if I could help her.","Sara asked could I help me.","Sara said if I can help her."],0,"Can shifts to could and pronouns follow the new viewpoint."),
  q("m09","medium",'“Open the window,” the teacher said.',["The teacher told us to open the window.","The teacher said us open the window.","The teacher asked that we opened the window."],0,"Commands use told + object + to-infinitive."),
  q("m10","medium",'“I am meeting Jo tonight,” Alex said.',["Alex said that he was meeting Jo that night.","Alex said he is meeting Jo tonight yesterday.","Alex said that he had met Jo tomorrow."],0,"Present continuous backshifts and tonight becomes that night."),
  q("m11","medium",'“Have you seen my keys?” she asked.',["She asked whether I had seen her keys.","She asked had I seen my keys.","She said if have I seen her keys."],0,"Present perfect becomes past perfect in a reported yes/no question."),
  q("m12","medium",'“Why did you leave early?” he asked.',["He asked why I had left early.","He asked why did I leave early.","He asked why I leave early."],0,"Past simple backshifts and the auxiliary disappears."),
  q("m13","medium",'“I cannot come today,” June said.',["June said that she could not come that day.","June said she cannot came today.","June said that I could not come yesterday."],0,"Cannot becomes could not, and today becomes that day."),
  q("m14","medium",'“Wait for me,” Luis said to Eva.',["Luis told Eva to wait for him.","Luis said Eva wait for me.","Luis asked that Eva waited for him."],0,"A command names its listener after told and uses to-infinitive."),
  q("m15","medium",'“When will the train arrive?” she asked.',["She asked when the train would arrive.","She asked when would the train arrive.","She asked when will arrive the train."],0,"Will becomes would and reported questions use statement order."),

  q("h01","hard",'“You must submit it today,” the editor said.',["The editor said that I had to submit it that day.","The editor said that I must submitted it today.","The editor asked whether I submit it.","The editor said me to submitted it."],0,"Must for obligation normally becomes had to."),
  q("h02","hard",'“If I were you, I would wait,” Lena said.',["Lena advised me to wait.","Lena suggested me to waited.","Lena asked if she were me.","Lena denied waiting."],0,"Advice can be reported naturally with advised + object + to-infinitive."),
  q("h03","hard",'“I might move next year,” Kai said.',["Kai said that he might move the following year.","Kai said that he must move next year.","Kai said he might moved the previous year.","Kai told that he may move tomorrow."],0,"Might usually stays unchanged; next year shifts to the following year."),
  q("h04","hard",'“I have to leave now,” Priya said.',["Priya said that she had to leave then.","Priya said she has to left now.","Priya said that I had leave then.","Priya told she must leaving."],0,"Have to backshifts to had to and now becomes then."),
  q("h05","hard",'The guide said, “The Earth moves around the Sun.”',["The guide said that the Earth moves around the Sun.","The guide said the Earth had moved around the Sun.","The guide asked whether the Earth moved.","The guide said that the Sun moved around Earth."],0,"A fact that remains universally true does not need backshift."),
  q("h06","hard",'“I was sleeping when you called,” Noor said.',["Noor said that she had been sleeping when I had called.","Noor said she was sleep when I call.","Noor said that I had slept when she called.","Noor told she has been sleeping."],0,"Past continuous can shift to past perfect continuous; past simple shifts to past perfect."),
  q("h07","hard",'“Shall I carry your bag?” he said.',["He offered to carry my bag.","He asked that I carried his bag.","He told me carrying the bag.","He denied carrying my bag."],0,"Shall I...? expressing help is best reported with offered to."),
  q("h08","hard",'“Let us take a break,” Maya said.',["Maya suggested taking a break.","Maya told us to took a break.","Maya asked if we take a break.","Maya denied the break."],0,"Let us suggestions can use suggested + gerund."),
  q("h09","hard",'“You should see a specialist,” Dan said to me.',["Dan advised me to see a specialist.","Dan suggested me seeing a specialist.","Dan said me that I should saw one.","Dan asked me to have seen one."],0,"Advice is naturally reported with advised + object + to-infinitive."),
  q("h10","hard",'“I did not break the vase,” Eli said.',["Eli denied breaking the vase.","Eli refused that he broke the vase.","Eli suggested not to break the vase.","Eli asked if the vase broke."],0,"Deny is followed by a gerund."),
  q("h11","hard",'“Yes, I copied the file,” Bea said.',["Bea admitted copying the file.","Bea denied to copy the file.","Bea promised copying the file.","Bea asked to copy the file."],0,"Admit is followed by a gerund."),
  q("h12","hard",'“I will not tell anyone,” Mo said.',["Mo promised not to tell anyone.","Mo denied to tell anyone.","Mo suggested not telling him.","Mo asked whether anyone told."],0,"A commitment about future behavior can be reported with promised not to."),
  q("h13","hard",'“Could you send this by Friday?” she asked.',["She asked me to send it by Friday.","She asked could I sent this by Friday.","She told whether I send it.","She said me sending that."],0,"A polite request can be reported with asked + object + to-infinitive."),
  q("h14","hard",'“You may use my desk,” the manager said.',["The manager said that I could use her desk.","The manager said I may used my desk.","The manager asked if she used my desk.","The manager told that I can using it."],0,"May expressing permission commonly becomes could."),
  q("h15","hard",'“I would have called if I had known,” Ava said.',["Ava said that she would have called if she had known.","Ava said she will call if she knew.","Ava said that she had called if she knows.","Ava told she would call if I had known."],0,"Third conditional forms normally remain unchanged."),

  q("x01","master",'“I never took the documents,” the clerk said.',["The clerk denied taking the documents.","The clerk refused taking the documents.","The clerk objected to take the documents.","The clerk warned not taking the documents."],0,"Deny + gerund accurately reports a rejected accusation."),
  q("x02","master",'“Remember to lock the side door,” Ren said.',["Ren reminded me to lock the side door.","Ren remembered me locking the side door.","Ren suggested me to lock the door.","Ren accused me of locking the door."],0,"Remind takes an object followed by a to-infinitive."),
  q("x03","master",'“It was your fault that we missed the train,” Inez said to Cal.',["Inez blamed Cal for missing the train.","Inez accused Cal to miss the train.","Inez denied Cal missing the train.","Inez warned Cal of miss the train."],0,"Blame takes object + for + gerund."),
  q("x04","master",'“Do not invest in that scheme,” the adviser said.',["The adviser warned me not to invest in that scheme.","The adviser prevented me to invest in the scheme.","The adviser denied investing in that scheme.","The adviser insisted me not investing."],0,"Warn takes an object and a negative to-infinitive."),
  q("x05","master",'“Why do we not revise the proposal?” Mina said.',["Mina suggested revising the proposal.","Mina suggested us to revise the proposal.","Mina asked why did we not revised it.","Mina insisted to revise the proposal."],0,"Why do we not...? can report a suggestion; suggest takes a gerund."),
  q("x06","master",'“I am sorry I interrupted you,” Theo said.',["Theo apologized for interrupting me.","Theo apologized to interrupt me.","Theo admitted to interrupt me sorry.","Theo regretted me interrupting."],0,"Apologize uses for + gerund to state the reason."),
  q("x07","master",'“No, I will not resign,” the director said.',["The director refused to resign.","The director denied to resign.","The director objected resigning.","The director promised not resigning."],0,"Refuse is followed by a to-infinitive."),
  q("x08","master",'“You stole my idea,” Pat said to Lee.',["Pat accused Lee of stealing the idea.","Pat blamed Lee to steal the idea.","Pat warned Lee for stealing my idea.","Pat denied Lee had stolen the idea."],0,"Accuse takes object + of + gerund."),
  q("x09","master",'“I really must pay for dinner,” Jo said.',["Jo insisted on paying for dinner.","Jo insisted to pay for dinner.","Jo suggested me paying for dinner.","Jo warned that dinner had paid."],0,"Insist on is followed by a gerund."),
  q("x10","master",'“I wish I had accepted the offer,” Uma said.',["Uma regretted not accepting the offer.","Uma denied accepting the offer.","Uma promised to accept the offer.","Uma suggested not to accept the offer."],0,"Regret + gerund reports remorse about a past action."),
  q("x11","master",'“If you share this password, you will lose access,” IT said.',["IT warned us that we would lose access if we shared the password.","IT said we will lose access if we share this password yesterday.","IT accused us of losing access.","IT suggested us not share the password."],0,"Both clauses backshift in a real future conditional reported later."),
  q("x12","master",'“I need not attend the meeting,” Val said.',["Val said that she did not have to attend the meeting.","Val said that she must not attend the meeting.","Val denied to attend the meeting.","Val asked whether she need attend it."],0,"Need not means absence of obligation, reported as did not have to."),
  q("x13","master",'“How about launching in May?” the team lead said.',["The team lead suggested launching in May.","The team lead offered us to launch in May.","The team lead asked how did we launch in May.","The team lead reminded launching in May."],0,"How about...? is a suggestion and takes a gerund pattern."),
  q("x14","master",'“I can meet you here next Monday,” Sal said yesterday.',["Sal said yesterday that he could meet me here next Monday.","Sal said that he could meet me there the following Monday.","Sal said he can met me here last Monday.","Sal told yesterday he had met me there."],0,"Because the report is still anchored to yesterday, here and next Monday may remain unchanged."),
  q("x15","master",'“You ought to have checked the figures,” Ari said.',["Ari said that I ought to have checked the figures.","Ari said that I had to checked the figures.","Ari advised that I ought checking the figures.","Ari asked whether I check the figures."],0,"Ought to, especially in a past criticism, normally remains unchanged."),
]

export function questionsForLevel(level: CefrLevel) {
  const allowed: Difficulty[] = level === "b1-preliminary" ? ["easy", "medium"] : level === "b2-first" ? ["hard", "master"] : []
  return questions.filter((question) => allowed.includes(question.difficulty))
}

export function hasTopics(level: CefrLevel) {
  return level === "b1-preliminary" || level === "b2-first"
}
