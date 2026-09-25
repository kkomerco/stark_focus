import type { ReelDuration } from "../types";
export type NarrativeFormat = "three_phases" | "single_quote" | "four_phrases" | "two_phases";

export type ReelVisualTheme =
  "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist";

export interface ReelTemplate {
  id: string;
  format: NarrativeFormat;
  title: string;
  phrases: string[];
  captionShort: string;
  captionDeep: string;
  hashtags: string[];
  suggestedTheme: ReelVisualTheme;
  suggestedDuration: ReelDuration;
  suggestedBackground?: string;
  backgroundRationale?: string;
}

export const VIRAL_REEL_TEMPLATES: ReelTemplate[] = [
  // --- 3 PHASES (Hook -> Stoic Truth -> Loop) ---
  {
    id: "tp_1",
    format: "three_phases",
    title: "They Want You Distracted",
    phrases: [
      "They want you distracted.",
      "Because a focused mind is impossible to control.",
      "Execute in total silence.",
    ],
    captionShort:
      "A distracted mind is easy to manipulate. Guard your focus with ruthless discipline. Save this reminder and execute in silence.",
    captionDeep:
      "A distracted mind is easy to manipulate. The modern world is engineered to steal your attention before you build your monument.\n\n3 rules to reclaim your sovereignty:\n1. Guard your mornings in absolute silence.\n2. Ignore anything outside your direct control.\n3. Let your results make all the noise.\n\nSave this reel. Follow for daily stoic discipline.",
    hashtags: ["#stoicism", "#discipline", "#focus", "#mindset", "#relentless"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },
  {
    id: "tp_2",
    format: "three_phases",
    title: "Comfort Is Slow Poison",
    phrases: [
      "Comfort is a slow poison.",
      "Every excuse you make is a vote for mediocrity.",
      "Choose your suffering.",
    ],
    captionShort:
      "Comfort kills ambition faster than failure ever could. Choose the pain of discipline over the permanent stain of regret.",
    captionDeep:
      "Comfort kills ambition faster than failure ever will. Every time you negotiate with weakness, you vote against your future.\n\n3 keys to crushing comfort:\n1. Do the hard task first thing in the morning.\n2. Eliminate the excuses before they form.\n3. Remember: Discomfort is where strength is forged.\n\nSave this for your next battle. Follow for daily focus.",
    hashtags: ["#discipline", "#stoicmindset", "#conqueryourself", "#grind", "#focus"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 7,
  },
  {
    id: "tp_3",
    format: "three_phases",
    title: "The Hardest War",
    phrases: [
      "The hardest war you fight,",
      "Is against the weakness you see in the mirror.",
      "Conquer yourself first.",
    ],
    captionShort:
      "Stop searching for outside enemies. The real opponent is the inner voice begging for the easy route. Conquer yourself.",
    captionDeep:
      "Stop looking for external enemies. The opponent is the voice inside urging you to quit, procrastinate, and settle.\n\nHow to win the internal war:\n1. Never negotiate with your feelings.\n2. Hold your standards when nobody is watching.\n3. Self-mastery is the only true freedom.\n\nSave this video. Follow for stoic mastery.",
    hashtags: ["#stoicquotes", "#innerstrength", "#warriorspirit", "#selfmastery"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 7,
  },
  {
    id: "tp_4",
    format: "three_phases",
    title: "Stop Announcing Moves",
    phrases: [
      "Stop announcing your moves.",
      "Results resonate louder than any speech ever could.",
      "Let the work speak.",
    ],
    captionShort:
      "Those who talk the most usually build the least. Keep your blueprints hidden until they stand in stone.",
    captionDeep:
      "Silence is power. Talking about your goals releases cheap dopamine without a single ounce of real execution.\n\nRules of stealth building:\n1. Keep your ambitions in total darkness.\n2. Let your dedication do the talking.\n3. Shock everyone with finished monuments.\n\nSave this reminder. Follow for stoic execution.",
    hashtags: ["#silence", "#stealth", "#actionoverwords", "#stoicexecution"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 7,
  },
  {
    id: "tp_5",
    format: "three_phases",
    title: "No One Is Coming",
    phrases: [
      "No one is coming to save you.",
      "No rescue squad. No magic turnaround.",
      "Stand up and rebuild.",
    ],
    captionShort:
      "Extreme ownership is the foundation of sovereignty. Stop waiting for a savior and build your own fortress.",
    captionDeep:
      "Extreme ownership is the root of freedom. The moment you realize no one is coming to rescue you is the moment you gain control.\n\n3 steps to self-reliance:\n1. Stop blaming your circumstances.\n2. Take 100% responsibility for your actions today.\n3. Build your fortress brick by brick.\n\nSave this post. Follow for daily stoic truth.",
    hashtags: ["#selfreliance", "#radicalownership", "#mentalfortitude", "#unbreakable"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 5,
  },
  {
    id: "tp_6",
    format: "three_phases",
    title: "Pain Is Inevitable",
    phrases: [
      "Pain is inevitable in this life.",
      "Suffering is a choice you make.",
      "Turn your scars into weapons.",
    ],
    captionShort:
      "The obstacle is not in the way—it is the way. Transform every trial into fuel for your relentless growth.",
    captionDeep:
      "Pain is unavoidable, but lingering suffering is a choice of judgment. Convert every hardship into fuel for your character.\n\nMarcus Aurelius taught:\n1. What impedes action advances action.\n2. What stands in the way becomes the way.\n3. Use adversity as your sharpening stone.\n\nSave this reel for tough days. Follow for daily philosophy.",
    hashtags: ["#marcusaurelius", "#seneca", "#stoicwarrior", "#resilience"],
    suggestedTheme: "silver_mist",
    suggestedDuration: 7,
  },
  {
    id: "tp_7",
    format: "three_phases",
    title: "The Silent War Within",
    phrases: [
      "You wait for external peace before you focus.",
      "The world will remain noisy until your final breath.",
      "Rule your mind or it will rule you.",
    ],
    captionShort:
      "Serenity is not the absence of external storms; it is the presence of an inner citadel. Master yourself.",
    captionDeep:
      "If you wait for the world to become quiet before you do your great work, you will die waiting.\n\nInner peace rules:\n- Create quiet within your own thoughts.\n- Silence the fear of other people's opinions.\n- The master finds calmness in the center of the storm.\n\nSave this reel. Follow for stoic mastery.",
    hashtags: ["#innerpeace", "#mindcontrol", "#stoicism", "#focus"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },
  {
    id: "tp_8",
    format: "three_phases",
    title: "The Sunk Cost Delusion",
    phrases: [
      "You hold onto dead weight out of nostalgia.",
      "Tethering your future to mistakes of the past.",
      "Cut the anchor and move forward.",
    ],
    captionShort:
      "Never continue a mistake simply because you spent a long time making it. Seneca commanded ruthless reinvention.",
    captionDeep:
      "Loyalty to your past weakness is betrayal of your future self. Cut the rot without hesitation.\n\nStoic surgery:\n1. Drop toxic habits immediately.\n2. Do not mourn wasted years—redeem today.\n3. Focus strictly on the next honorable move.\n\nSave this for a fresh start. Follow @stark_focus.",
    hashtags: ["#reinvention", "#seneca", "#clarity", "#boldness"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 7,
  },
  {
    id: "tp_9",
    format: "three_phases",
    title: "Discipline In The Dark",
    phrases: [
      "Anyone can train under bright studio lights.",
      "Sovereignty is forged when nobody is keeping score.",
      "Deliver your standard in total silence.",
    ],
    captionShort:
      "The man who only works hard when watched is a fraud. True character is revealed in private devotion.",
    captionDeep:
      "Public praise is fool's gold. The only reputation that cannot be tarnished is the one you build with yourself in empty rooms.\n\nPrivate standards:\n- Never cut a corner in the dark.\n- Honor the vows you made to yourself.\n- Let the work speak when the season arrives.\n\nSave this reminder. Follow for daily grit.",
    hashtags: ["#integrity", "#stealth", "#stoicstandards", "#workethic"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 7,
  },
  {
    id: "tp_10",
    format: "three_phases",
    title: "The Trap of Tomorrow",
    phrases: [
      "Tomorrow is where weak intentions go to rot.",
      "The only real estate you will ever inhabit is now.",
      "Seize this hour without compromise.",
    ],
    captionShort:
      "Putting off duty until tomorrow is the hallmark of spiritual decay. Dominate the immediate second.",
    captionDeep:
      "Death does not care about your five-year plan. What matters is the integrity of this exact heartbeat.\n\nMemento Mori command:\n1. Treat today as a complete lifetime.\n2. Do the hardest thing first.\n3. Sleep with a clean conscience.\n\nSave this quote. Follow for stoic urgency.",
    hashtags: ["#mementomori", "#now", "#action", "#discipline"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 7,
  },

  // --- SINGLE QUOTE (Solid Focus Loop) ---
  {
    id: "sq_1",
    format: "single_quote",
    title: "Discipline vs Desires",
    phrases: ["Discipline is choosing between what you want now and what you want most."],
    captionShort:
      "Instant gratification is the currency of fools. Endure short-term discomfort today for long-term sovereignty tomorrow.",
    captionDeep:
      "Instant gratification is the trap of mediocrity. Long-term triumph belongs exclusively to those who endure today's discomfort for tomorrow's victory.\n\nRemember:\n- Motivation fades in hours.\n- Discipline endures for decades.\n- Choose your standard and protect it.\n\nSave this quote. Follow for daily discipline.",
    hashtags: ["#discipline", "#stoiclife", "#delayedgratification", "#focus"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },
  {
    id: "sq_2",
    format: "single_quote",
    title: "Imagined Suffering",
    phrases: ["We suffer more often in imagination than in reality. Conquer your thoughts."],
    captionShort:
      "Seneca wrote this two thousand years ago and it remains absolute truth. Silence the shadows in your head.",
    captionDeep:
      "Seneca warned us two millennia ago: your anxiety is a phantom. Most of what you fear will never happen.\n\nStoic clarity checklist:\n1. Separate real threats from mental projections.\n2. Focus exclusively on the immediate step.\n3. Calm your breathing and dominate the moment.\n\nSave this reel. Follow for stoic clarity.",
    hashtags: ["#seneca", "#stoicism", "#clarity", "#overcomingfear", "#calmmind"],
    suggestedTheme: "silver_mist",
    suggestedDuration: 7,
  },
  {
    id: "sq_3",
    format: "single_quote",
    title: "Embody Philosophy",
    phrases: ["Do not explain your philosophy. Embody it in every action and choice."],
    captionShort:
      "Epictetus commanded his disciples not to lecture on virtue, but to demonstrate it quietly through relentless conduct.",
    captionDeep:
      "Words are cheap. Epictetus urged that true philosophy is never debated—it is embodied in daily action.\n\nHow to embody it:\n- Don't lecture others on discipline; be disciplined.\n- Don't talk about focus; cut the distractions.\n- Let your character be your testament.\n\nSave this. Follow for real stoic standards.",
    hashtags: ["#epictetus", "#livingstoic", "#integrity", "#leadbyexample"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 7,
  },
  {
    id: "sq_4",
    format: "single_quote",
    title: "Control What Is Yours",
    phrases: ["The more you value things outside your control, the less control you have."],
    captionShort:
      "Divide your world clearly: what is up to you, and what is not. Pour all your strength into your own effort.",
    captionDeep:
      "The core pillar of Stoicism is the Dichotomy of Control. You waste your spirit whenever you obsess over outside events.\n\nFocus strictly on:\n- Your judgment.\n- Your effort.\n- Your response.\n\nLeave the rest to fate. Save this and follow for daily wisdom.",
    hashtags: ["#stoicdichotomy", "#innerpeace", "#unshakable", "#mindcontrol"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 5,
  },
  {
    id: "sq_5",
    format: "single_quote",
    title: "Be A Good Man",
    phrases: ["Waste no more time arguing about what a good man should be. Be one."],
    captionShort:
      "Marcus Aurelius wrote this in his private journal while governing Rome. Stop debating. Take action.",
    captionDeep:
      "No more intellectual theories. Marcus Aurelius reminded himself that character is proven in the heat of daily duty.\n\n3 direct commands:\n1. Act with unshakeable integrity.\n2. Hold no malice or self-pity.\n3. Perform your duty without hesitation.\n\nSave this reminder. Follow for stoic brotherhood.",
    hashtags: ["#marcusaurelius", "#meditations", "#duty", "#manhood", "#virtue"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 5,
  },
  {
    id: "sq_6",
    format: "single_quote",
    title: "He Who Fears Death",
    phrases: ["He who fears death will never do anything worthy of a man who is alive."],
    captionShort:
      "Memento Mori is not an invitation to despair—it is a fierce call to live with urgent courage and conviction.",
    captionDeep:
      "Fear of death paralyzes men from taking bold action. Seneca reminds us that mortality gives life its supreme urgency.\n\nLive with Memento Mori:\n- Every hour is borrowed time.\n- Stop postponing what matters.\n- Act boldly today.\n\nSave this. Follow for unshakeable resolve.",
    hashtags: ["#mementomori", "#fearless", "#urgency", "#stoicpath"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },

  // --- 4 FAST PHRASES (Rhythm of 4 - Linked Narrative Arcs) ---
  {
    id: "fp_1",
    format: "four_phrases",
    title: "The Alarm Trap",
    phrases: [
      "You keep negotiating with your alarm.",
      "As if you can bargain your way to greatness.",
      "Discipline does not care how tired you feel.",
      "Rise now or accept your mediocrity.",
    ],
    captionShort:
      "The morning negotiation is where men lose their sovereignty before the sun even rises. Kill the compromise.",
    captionDeep:
      "When you hit snooze, you tell your subconscious that comfort matters more than your potential.\n\n3 morning non-negotiables:\n1. Feet on the floor at the first chime.\n2. No digital screens for the first 60 minutes.\n3. Attack the heaviest boulder before noon.\n\nSave this for tomorrow morning. Follow for relentless discipline.",
    hashtags: ["#discipline", "#stoicmindset", "#morningroutine", "#relentless", "#grindset"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 9,
  },
  {
    id: "fp_2",
    format: "four_phrases",
    title: "Silence of the Forge",
    phrases: [
      "You crave applause before you lay the first stone.",
      "Broadcasting your moves drains your vital fire.",
      "The grandest empires were planned in isolation.",
      "Disappear until the work cannot be ignored.",
    ],
    captionShort:
      "Talking about your goals gives your brain cheap, unearned dopamine. Shut your mouth and build in the dark.",
    captionDeep:
      "When you announce your ambitions, your brain mistakes speaking for doing. Seal your lips.\n\nMonk mode protocol:\n1. No social announcements for 90 days.\n2. Work in uninterrupted blocks of deep focus.\n3. Let the finished structure shock the spectators.\n\nSave this reminder. Follow for stealth building.",
    hashtags: ["#solitude", "#deepwork", "#monkmode", "#stealth", "#stoicfocus"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    id: "fp_3",
    format: "four_phrases",
    title: "When Motivation Dies",
    phrases: [
      "You only execute when the mood feels right.",
      "That is not discipline. That is emotional dependency.",
      "True power begins the second motivation expires.",
      "Hold the standard especially when you hate it.",
    ],
    captionShort:
      "Amateurs wait to feel inspired. The sovereign mind operates on an unbending schedule. Master your moods.",
    captionDeep:
      "Relying on motivation is like relying on the weather to steer a warship. You will drift aimlessly.\n\nStoic routine rules:\n- Systems outlive emotional highs.\n- The hardest sessions build the unbreakable mind.\n- Keep your promise to yourself regardless of emotion.\n\nSave this reminder. Follow @stark_focus.",
    hashtags: ["#stoicism", "#discipline", "#motivation", "#starkfocus"],
    suggestedTheme: "silver_mist",
    suggestedDuration: 9,
  },
  {
    id: "fp_4",
    format: "four_phrases",
    title: "The Cost of Quitting",
    phrases: [
      "You quit because the burn became uncomfortable.",
      "Yet you endure the permanent agony of regret.",
      "Suffering is guaranteed in this life.",
      "At least choose the suffering that forges you.",
    ],
    captionShort:
      "Discipline weighs ounces. Regret weighs tons. Choose your burden with ruthless stoic clarity.",
    captionDeep:
      "Every man suffers. The only choice you have is between the pain of discipline today or the bitter sting of regret tomorrow.\n\nStoic axiom:\n- Discomfort is temporary; mediocrity is permanent.\n- When your mind screams to stop, you have only reached 40%.\n- Push past the barrier.\n\nSave this reel. Follow for daily grit.",
    hashtags: ["#stoicwisdom", "#painintopower", "#resilience", "#highstandards"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 10,
  },
  {
    id: "fp_5",
    format: "four_phrases",
    title: "The Digital Leash",
    phrases: [
      "You wake up and instantly check other lives.",
      "Surrendering your attention before feet touch earth.",
      "A hijacked mind can never build an empire.",
      "Break the digital leash and reclaim your throne.",
    ],
    captionShort:
      "Your attention is the most valuable currency on earth. Stop giving it away for free to mindless feeds.",
    captionDeep:
      "Every notification you answer is a micro-submission of your sovereign will. Reclaim your focus.\n\nDigital sovereignty checklist:\n1. Phone out of the bedroom overnight.\n2. First 90 minutes of your day are zero-screen.\n3. Guard your mental state like a fortress.\n\nSave this reel. Follow for radical focus.",
    hashtags: ["#focus", "#digitaldetox", "#dopaminedetox", "#sovereignty"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 9,
  },
  {
    id: "fp_6",
    format: "four_phrases",
    title: "Terrified of Solitude",
    phrases: [
      "You fill every quiet room with cheap noise.",
      "Because sitting alone forces you to face yourself.",
      "Solitude is not an enemy to be escaped.",
      "It is the sanctuary where iron is tempered.",
    ],
    captionShort:
      "If you cannot sit alone in an empty room for an hour, you are not sovereign—you are a prisoner of distraction.",
    captionDeep:
      "Modern society fears silence because in silence, your suppressed potential demands an account.\n\nPracticing solitude:\n- Take 30 minutes of screenless silence daily.\n- Journal your unfiltered truths.\n- Reconnect with your core mission without external noise.\n\nSave this reel. Follow for stoic clarity.",
    hashtags: ["#solitude", "#innercitadel", "#stoicism", "#deepfocus"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    id: "fp_7",
    format: "four_phrases",
    title: "The Illusion of Tomorrow",
    phrases: [
      "You act as if you have centuries to spare.",
      "Postponing greatness to a mythical next week.",
      "Death does not wait for you to finish your excuses.",
      "Act today with the ferocity of a dying man.",
    ],
    captionShort:
      "You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius",
    captionDeep:
      "Procrastination is the arrogant belief that the universe owes you another sunrise.\n\nMemento Mori principles:\n1. Treat today as a complete, sovereign lifetime.\n2. Do not leave the most vital work uninitiated.\n3. Make your peace with the clock by executing right now.\n\nSave this reel. Follow for stoic urgency.",
    hashtags: ["#mementomori", "#urgency", "#stoiclife", "#marcusaurelius"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 9,
  },
  {
    id: "fp_8",
    format: "four_phrases",
    title: "The Invisible Labor",
    phrases: [
      "They only cheer on the day of victory.",
      "They ignore the thousand nights in the bitter cold.",
      "Do not look for their approval in the trench.",
      "Your crown was decided when nobody looked.",
    ],
    captionShort:
      "Real triumph is not won on stage. It is won in the unglamorous hours when everyone else is asleep.",
    captionDeep:
      "Spectators only see the peak of the mountain. They never see the frostbite and bleeding knuckles of the climb.\n\nKeep climbing:\n- Do not ask for cheers while laying the foundation.\n- Love the brutal monotony of daily practice.\n- The summit will take care of itself.\n\nSave this post. Follow @stark_focus.",
    hashtags: ["#workhard", "#silentgrind", "#unseenwork", "#stoicpath"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 10,
  },
  {
    id: "fp_9",
    format: "four_phrases",
    title: "The Standard Remains",
    phrases: [
      "You lowered the bar when nobody was watching.",
      "Rationalizing that just this once does not count.",
      "How you do anything is how you do everything.",
      "Raise the standard and never look down.",
    ],
    captionShort:
      "The second you tolerate a crack in your discipline, the entire structure begins to crumble. Guard your code.",
    captionDeep:
      "Greatness is not a single heroic act. It is the uncompromising repetition of high standards when nobody is checking on you.\n\nCode of iron standards:\n- Deliver more than promised.\n- Fix the small defects before they become rot.\n- Never lower your standard to make others comfortable.\n\nSave this post. Follow for daily mastery.",
    hashtags: ["#standards", "#integrity", "#stoicrules", "#neversettle"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    id: "fp_10",
    format: "four_phrases",
    title: "The Debt to Yourself",
    phrases: [
      "You owe your younger self a profound apology.",
      "For settling for less than what you promised him.",
      "The debt cannot be erased with comforting words.",
      "Repay it with relentless, brutal execution.",
    ],
    captionShort:
      "The boy who dreamed of becoming a warrior is watching the man you are today. Do not disappoint him.",
    captionDeep:
      "You made promises to yourself before you learned to make excuses. It is time to honor the contract.\n\nHonor the contract:\n1. Stop accepting mediocre compromises.\n2. Push your physical and mental limits daily.\n3. Become the hero your younger self expected.\n\nSave this reel. Follow for stoic focus.",
    hashtags: ["#selfmastery", "#honor", "#innerwarrior", "#conqueryourself"],
    suggestedTheme: "silver_mist",
    suggestedDuration: 10,
  },
  {
    id: "fp_11",
    format: "four_phrases",
    title: "Fortress Against Fools",
    phrases: [
      "You let the insult of a fool ruin your entire day.",
      "Allowing an untrained stranger to command your emotions.",
      "Nothing touches you unless your judgment permits it.",
      "Build your citadel and become untouchable.",
    ],
    captionShort:
      "If you are pained by any external thing, it is not the thing that disturbs you, but your own estimate of it.",
    captionDeep:
      "When someone offends you, you handed them the remote control to your soul. Take it back.\n\nInner Citadel rules:\n- Insults reflect the speaker, never the target.\n- Pause between the trigger and your response.\n- Unshakeable calm is the ultimate display of dominance.\n\nSave this for chaotic days. Follow for inner strength.",
    hashtags: ["#innercitadel", "#stoicpeace", "#unshakeable", "#epictetus"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 9,
  },
  {
    id: "fp_12",
    format: "four_phrases",
    title: "Gladiators of Nothing",
    phrases: [
      "You exhaust your nervous system on trivial debates.",
      "Fighting battles that will not matter tomorrow.",
      "Preserve your mental steel for your true destiny.",
      "Starve the distraction. Feed the craft.",
    ],
    captionShort:
      "Seneca wrote: We are not given a short life, but we waste much of it. Stop fighting meaningless battles.",
    captionDeep:
      "The world wants you outraged, exhausted, and reactive. Refuse to take the bait.\n\nStoic attention filter:\n- Will this matter in 5 years? If no, ignore it.\n- Is this within my direct sphere of control? If no, release it.\n- Direct 100% of your energy toward your own craft.\n\nSave this post. Follow for daily mastery.",
    hashtags: ["#focus", "#clarity", "#craftsmanship", "#stoicwarrior"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 9,
  },

  // --- 2 PHASES (Problem vs Principle) ---
  {
    id: "tp2_1",
    format: "two_phases",
    title: "Emotion vs Standard",
    phrases: ["The amateur waits for inspiration.", "The stoic works regardless of emotion."],
    captionShort:
      "Moods are transient; standards are permanent. When you base your effort on how you feel, you lose.",
    captionDeep:
      "Amateurs wait for motivation; professionals adhere to an iron routine. Your emotions are not the captain of your ship.\n\nKey distinction:\n- Inspiration is a luxury.\n- Routine is a weapon.\n- Execute even when you don't feel like it.\n\nSave this for low-energy days. Follow for consistency.",
    hashtags: ["#consistency", "#prostandards", "#stoicism", "#disciplineovermotivation"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 7,
  },
  {
    id: "tp2_2",
    format: "two_phases",
    title: "Validation vs Self-Respect",
    phrases: ["The weak crave constant applause.", "The strong require only self-respect."],
    captionShort:
      "If you live for the applause of the crowd, you will die from their silence. Anchor your worth in your code.",
    captionDeep:
      "Addiction to external applause makes you fragile. When the praise stops, so does your effort.\n\nAnchor to this:\n1. Your integrity is your only true audience.\n2. Do what is right because it is right.\n3. Self-respect outlasts any temporary applause.\n\nSave this reminder. Follow for inner strength.",
    hashtags: ["#selfworth", "#innercode", "#stoicpride", "#sovereignmind"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },
  {
    id: "tp2_3",
    format: "two_phases",
    title: "Blaming vs Owning",
    phrases: ["You blame your circumstances.", "Your reaction is the only thing you truly own."],
    captionShort:
      "Events are indifferent. What gives them weight, power, and meaning is your judgment. Take back control.",
    captionDeep:
      "Blaming external events is the hallmark of helplessness. The only thing you can truly command is your own response.\n\nReclaim your power:\n- Event + Reaction = Outcome.\n- Refuse to see yourself as a victim.\n- Stand tall and command the situation.\n\nSave this post. Follow for radical ownership.",
    hashtags: ["#radicalresponsibility", "#dichotomyofcontrol", "#clarity", "#mastery"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 5,
  },
  {
    id: "tp2_4",
    format: "two_phases",
    title: "Talking vs Building",
    phrases: ["Most men waste decades talking.", "The few build quietly in the shadows."],
    captionShort:
      "Silence is power. Don't broadcast your blueprint—reveal only the finished monument.",
    captionDeep:
      "Talking gives your brain unearned satisfaction. Real warriors save their energy for the relentless build.\n\nRules of the silent builder:\n- Don't explain your strategy.\n- Don't ask for opinions from spectators.\n- Let the finished structure speak for you.\n\nSave this and follow for relentless stoic execution.",
    hashtags: ["#moveinsilence", "#stealthmode", "#architect", "#stoicempire"],
    suggestedTheme: "silver_mist",
    suggestedDuration: 7,
  },
  {
    id: "tp2_5",
    format: "two_phases",
    title: "Easy Choice vs Heavy Crown",
    phrases: [
      "Easy choices today forge a bitter tomorrow.",
      "Hard choices today earn an unshakeable peace.",
    ],
    captionShort:
      "Comfort now is paid for in regret later. Choose the weight that builds bone and character.",
    captionDeep:
      "The equation of life is straightforward: Pain now, peace later. Or pleasure now, agony later. Choose wisely.\n\nDaily stoic discipline.\nSave this for tough decisions. Follow @stark_focus.",
    hashtags: ["#choices", "#disciplinedlife", "#stoicpath", "#wisdom"],
    suggestedTheme: "obsidian_void",
    suggestedDuration: 7,
  },
  {
    id: "tp2_6",
    format: "two_phases",
    title: "Seeking Enemies vs The Mirror",
    phrases: [
      "You search the horizon for enemies.",
      "The only saboteur stands before you in the mirror.",
    ],
    captionShort:
      "Nobody can ruin your life without your permission. Conquer the internal traitor first.",
    captionDeep:
      "External rivals cannot stop you. Only the voice inside asking to ease up can bring you down. Slay it daily.\n\nSave this reel. Follow for inner strength.",
    hashtags: ["#selfmastery", "#innervoice", "#mindcontrol", "#stoicism"],
    suggestedTheme: "crimson_eclipse",
    suggestedDuration: 7,
  },
  {
    id: "tp2_7",
    format: "two_phases",
    title: "Fear of Failure vs Fear of Regret",
    phrases: [
      "The coward fears the sting of failure.",
      "The sovereign mind fears the poison of regret.",
    ],
    captionShort:
      "Failure teaches. Regret suffocates. Step onto the battlefield regardless of the outcome.",
    captionDeep:
      "Failure is simply data for the wise man. But dying without knowing what you could have built is a tragedy.\n\nSave this post. Follow @stark_focus.",
    hashtags: ["#courage", "#mementomori", "#nofear", "#relentless"],
    suggestedTheme: "carbon_aura",
    suggestedDuration: 7,
  },
  {
    id: "tp2_8",
    format: "two_phases",
    title: "Consumer vs Creator",
    phrases: [
      "You spend four hours consuming other dreams.",
      "When will you start building your own monument?",
    ],
    captionShort:
      "Stop being a spectator in other people's lives. Step onto the arena and craft your legacy.",
    captionDeep:
      "Every hour spent watching another man's highlight reel is an hour stolen from your own monument.\n\nPut down the screen. Pick up the hammer.\n\nSave this reminder. Follow for daily discipline.",
    hashtags: ["#builder", "#creator", "#legacy", "#focus"],
    suggestedTheme: "emerald_abyss",
    suggestedDuration: 7,
  },
];
