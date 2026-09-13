import { CTAPreset } from '../types';

export interface MentorTemplate {
  hook: string;
  caption: string;
  notes: string;
}

export const MENTOR_TEMPLATES_BY_FORMAT: Record<string, MentorTemplate[]> = {
  '🎬 Rolka 7-Sekundowa (Short Reel)': [
    {
      hook: 'The harsh truth that will destroy your excuses in 30 seconds.',
      caption: `Motivation is an illusion for the undisciplined. True winners execute when they hate every single second of the grind. Stop negotiating with weakness. Raise your standard or remain forgotten.

Save this reminder. Execute in silence.

#stoicism #discipline #darkmotivation #mindset #masculinity #success #focus`,
      notes: 'Fast B-roll video, heavy bass drop at 0.5s, large white text with typewriter reveal.'
    },
    {
      hook: 'Nobody is coming to save you. That is your greatest power.',
      caption: `Your life is 100% your own responsibility. The moment you stop waiting for validation, you become dangerous. Disappear for 6 months and outgrow everyone who doubted you.

Execute in silence.

#discipline #selfgrowth #solitude #grind #relentless #stoicmindset`,
      notes: 'Dark atmospheric walking clip, subtle zoom-in, loop connecting the last word to the first.'
    },
    {
      hook: 'You think you lack time. In reality, you lack discipline.',
      caption: `You have roughly 4,000 weeks on this earth. You already burned thousands of hours scrolling meaningless noise. The clock is ticking without mercy. Choose your suffering: discipline or regret.

Drop an excuse or drop a comment.

#timemanagement #stoic #coldtruth #execution #action #hustle`,
      notes: 'Macro hourglass or ticking clock visual, intense dark ambient soundtrack.'
    },
    {
      hook: 'Your comfort zone is quietly burying your potential alive.',
      caption: `Every day you avoid pain is a day you vote for your future mediocrity. The stoic does not seek ease; the stoic seeks mastery through struggle.

Save this reminder if you choose the war over comfort.

#mindsetshift #conquer #stoicphilosophy #disciplineovermotivation`,
      notes: 'Monochrome footage, cut to black at the end to trigger replays.'
    }
  ],
  '🎠 Karuzela 5-Slajdowa (IG / TikTok Slides)': [
    {
      hook: '5 Brutal Stoic Rules to Master Your Mind',
      caption: `Slide 1: You don't lack motivation. You lack non-negotiable standards.
Slide 2: 99% of people lose their day in the first 60 seconds by touching their phone.
Slide 3: Stoic law: Execute what is necessary regardless of internal feelings.
Slide 4: Pick the single task you dread the most every morning and crush it first.
Slide 5: Save this post. Read it tomorrow at 6:00 AM when your brain begs to quit.

#stoicism #disciplinerules #habits #successblueprint #mentalstrength`,
      notes: 'Design using pure black slides with 60% black blur. Cover must use bold white typography.'
    },
    {
      hook: 'Why You Must Disappear in Complete Solitude',
      caption: `Slide 1: The greatest empires were built in rooms where nobody was clapping.
Slide 2: Most people surround themselves with noise just to silence their inner emptiness.
Slide 3: Isolation without a goal breeds depression. Isolation with a mission breeds unmatched power.
Slide 4: Stop explaining your ambition to people who are satisfied with being average.
Slide 5: Silence is your highest leverage. Save and build in the shadows.

#solitude #darkaesthetic #monkmode #focus #growthmindset`,
      notes: 'Use minimalist dark visuals (monolith pillars, dark basalt, foggy skyscrapers).'
    },
    {
      hook: 'The Cost of Being Average in 2026',
      caption: `Slide 1: Average habits create average bank accounts and average lives.
Slide 2: If you do what everyone else is doing, you will suffer what everyone else suffers.
Slide 3: Comfort is the most dangerous drug known to humanity.
Slide 4: Demand more from yourself than anyone else could ever reasonably expect.
Slide 5: Raise your threshold for pain. Save this post for tough days.

#harshreality #zeroexcuses #stoictruth #discipline #relentless`,
      notes: 'High contrast typography, slide 5 must feature a strong call to bookmark.'
    },
    {
      hook: 'The 4 Habits Keeping You Weak and Broke',
      caption: `Slide 1: Complaining about circumstances you actively choose to tolerate.
Slide 2: Consuming cheap dopamine before producing anything of value.
Slide 3: Caring about the opinions of people you would never trade lives with.
Slide 4: Waiting for the "perfect moment" while your youth evaporates.
Slide 5: Break the cycle today. Save this and review your daily habits.

#habits #toxicmindset #selfmastery #stoicism #execution`,
      notes: 'Use dark brutalist backgrounds with high-contrast centered text.'
    },
    {
      hook: 'The Monk Mode Protocol: 60 Days of Total Execution',
      caption: `Slide 1: Eliminate all cheap dopamine. Zero mindless scrolling, zero alcohol, zero junk.
Slide 2: Deep work blocks: 4 hours of uninterrupted, ruthless creation before 12:00 PM.
Slide 3: Non-negotiable physical training. Lift heavy or run until mental resistance breaks.
Slide 4: Speak only when necessary. Guard your energy and starve the need for external validation.
Slide 5: Save this reminder. You are only 60 days of discipline away from an unrecognizable life.

#monkmode #discipline #growth #relentless #execution #deepwork`,
      notes: 'Dark obsidian theme with minimalist typography and stark white accents.'
    },
    {
      hook: '5 Unforgiving Truths About Building High Leverage',
      caption: `Slide 1: If you trade time for money without building equity, you will work until you die.
Slide 2: Focus is the new superpower. In an era of distracted sheep, the focused man is king.
Slide 3: Your reputation is your greatest leverage. Keep your word, especially to yourself.
Slide 4: The market does not care about your effort; it only rewards undeniable competence.
Slide 5: Bookmark this post. Return to it whenever you feel the urge to settle for mediocrity.

#leverage #wealthbuilding #stoicmindset #highperformance #focus`,
      notes: 'Clean brutalist layout, slide 5 call to bookmark.'
    }
  ],
  '❓ Prowokacja / Debate Bait': [
    {
      hook: "If your life depended on today's productivity, would you survive?",
      caption: `Be brutally honest with yourself in the comments below. Most people pretend to work while scrolling and daydreaming. Did you move the needle today or did you just waste oxygen?

Drop your honest answer below.

#productivity #brutalhonesty #stoic #accountability #discipline`,
      notes: 'Static text on deep dark background. Aim for controversial debate in comments.'
    },
    {
      hook: 'How many people in your circle would you trade lives with?',
      caption: `If the answer is zero, why are you still listening to their advice? Why do you care about their opinions on your hustle? Cut the dead weight.

Tell me: who is really in your corner?

#innercircle #standards #truth #stoicmindset #networking`,
      notes: 'Short, sharp delivery. Music should cut out right before the question.'
    },
    {
      hook: 'Most people work 8 hours to fund a lifestyle they need 2 days of alcohol to escape.',
      caption: `Is this really the dream you agreed to? Or did you settle because rebellion requires discipline you refused to develop?

Argue in the comments.

#matrix #escapeaverage #entrepreneurship #stoicphilosophy #wakeuptoreality`,
      notes: 'High contrast black screen with stark white text to maximize comment velocity.'
    }
  ],
  '📜 Minimalistyczny Cytat (One-Liner)': [
    {
      hook: 'A man who conquers himself is greater than one who conquers a thousand men.',
      caption: `Self-mastery is the only true victory. When you control your impulses, nobody can manipulate your destiny.

Save this truth.

#marcusurelius #stoicquotes #selfmastery #discipline #stoicism`,
      notes: 'Pure black background, stark white serif/sans-serif font, zero clutter.'
    },
    {
      hook: 'Do not speak of what you are going to do. Simply do it and let them witness.',
      caption: `Bragging releases cheap dopamine before the work is finished. Keep your plans secret until the results speak so loud they cannot be ignored.

Silence is power.

#silence #execution #darkmotivation #stoicwisdom #deedsnotwords`,
      notes: 'Subtle smoke effect or clean minimalist aesthetic.'
    },
    {
      hook: 'You suffer more often in imagination than in reality.',
      caption: `Seneca knew this 2,000 years ago. Your anxiety is just bad fiction written by an idle mind. Get to work.

Save this reminder for when panic sets in.

#seneca #stoicthought #anxietyrelief #focus #dailygrind`,
      notes: 'Deep graphite background with clean typography and subtle shadow.'
    }
  ]
};

export const ENGLISH_BING_MOTIFS = [
  'Colossal shattered marble statue of Marcus Aurelius submerged in dark rolling fog, dramatic single-source museum key light, chiaroscuro',
  'Monumental brutalist monolithic fortress standing in infinite midnight fog ocean, glowing cyan laser reticle at the summit',
  'Dark Spartan warrior helmet forged from matte black titanium, razor sharp geometric edges, cold electric cyan rim lighting',
  'Massive obsidian geometric monolith with glowing molten gold fracture veins, floating amber embers, pitch black void',
  'Giant ancient Roman temple pillars swallowed by black volcanic dust storm, dramatic cold moonlight slicing through dark clouds',
  'Heavy hourglass forged from dark tungsten metal filled with black magnetic ferrofluid sand, macro cinematic lighting',
  'Solitary cloaked figure standing at the razor edge of a massive dark monolith cliff looking into deep cosmic abyss',
  'Geometric black marble monolith king bathed in dramatic cold cyan laser shadows, brutalist minimalism, hyper-sharp'
];

export const DEFAULT_PRESETS_EN: CTAPreset[] = [
  {
    id: 'preset_1',
    name: '🔥 Zapisz Przypomnienie (Wysoki Zapis / Algorytm IG)',
    cta: 'Save this post. Re-read it when your thumb hesitates before executing.',
    tags: '#stoicism #discipline #darkdiscipline #mentaltoughness #focus #stark_focus'
  },
  {
    id: 'preset_2',
    name: '⚡ Viral Share (TikTok / Reels)',
    cta: 'Send this to someone who feeds on excuses instead of putting in the work. Time is non-refundable.',
    tags: '#darkmotivation #truth #stoic #selfgrowth #discipline #grind #relentless #stark_focus'
  },
  {
    id: 'preset_3',
    name: '◈ Cicha Dominacja (Autorytet & Solitude)',
    cta: 'Silence cannot be misquoted. When you stop announcing your next move, your focus compounds.',
    tags: '#silence #solitude #entrepreneur #stoicmindset #coldblood #execution #stark_focus'
  },
  {
    id: 'preset_4',
    name: '💬 Magnes Komentarzy & Debata',
    cta: 'Most people are addicted to comfort and call it self-care. Disagree in the comments or execute in silence.',
    tags: '#accountability #honesty #discipline #truthbomb #growth #stark_focus'
  }
];
