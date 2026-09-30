/* ============================================================
   Cancer in the Commonwealth — Risk Calculator question bank
   Point values are simplified, additive weights derived from the
   strength-of-association scale published alongside the Your
   Disease Risk relative-risk reference (Siteman Cancer Center /
   Washington University in St. Louis, building on the Harvard
   Cancer Risk Index): weak = 1pt, moderate = 2pt, strong = 3pt,
   very strong = 4pt, applied in the same direction (+ raises,
   - lowers) as the underlying relative risk. See the "How this
   calculator works" panel on risk-calculator.html for the full
   source list. This is a simplified educational model, not a
   clinical instrument.
   ============================================================ */

const RISK_CALC_QUESTIONS = [
  {
    section: "About you",
    intro: "These first two don't affect your score — they just help us frame your result.",
    items: [
      {
        id: "age",
        contextOnly: true,
        prompt: "What's your age range?",
        choices: [
          { label: "Under 18", value: "under18" },
          { label: "18–39", value: "18to39" },
          { label: "40–59", value: "40to59" },
          { label: "60 or older", value: "60plus" },
          { label: "Prefer not to say", value: "na" },
        ],
      },
      {
        id: "location",
        short: "Where you live",
        prompt: "Do you live in Appalachian Kentucky, or another rural area with limited access to health care?",
        note: "This isn't about biology — it reflects documented gaps in screening access and later-stage diagnoses in medically underserved areas (see Module 1).",
        choices: [
          { label: "Yes", points: 1 },
          { label: "No", points: 0 },
          { label: "Not sure", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Tobacco",
    items: [
      {
        id: "smoking",
        short: "Tobacco use",
        prompt: "Do you currently smoke cigarettes or use other tobacco products?",
        choices: [
          { label: "No, never smoked", points: 0 },
          { label: "No, but I used to (quit)", points: 1 },
          { label: "Yes, occasionally / less than half a pack a day", points: 2 },
          { label: "Yes, about half a pack to a pack a day", points: 3 },
          { label: "Yes, more than a pack a day", points: 4 },
          { label: "Prefer not to say", points: 0 },
        ],
      },
      {
        id: "secondhand",
        short: "Secondhand smoke",
        prompt: "Are you regularly around someone else's tobacco smoke at home, work, or school?",
        choices: [
          { label: "Yes", points: 1 },
          { label: "No", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Alcohol",
    items: [
      {
        id: "alcohol",
        short: "Alcohol use",
        prompt: "How often do you drink alcohol?",
        choices: [
          { label: "Never / rarely", points: 0 },
          { label: "A few drinks a week", points: 1 },
          { label: "One or more drinks almost every day", points: 2 },
          { label: "Prefer not to say", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Diet & activity",
    items: [
      {
        id: "diet_fv",
        short: "Fruit & vegetable intake",
        prompt: "On most days, do you eat 5 or more servings of fruits and vegetables?",
        choices: [
          { label: "Yes", points: -1 },
          { label: "No", points: 0 },
        ],
      },
      {
        id: "diet_meat",
        short: "Processed/red meat intake",
        prompt: "Do you eat processed or red meat (hot dogs, bacon, deli meat, burgers) 3 or more times a week?",
        choices: [
          { label: "Yes", points: 1 },
          { label: "No", points: 0 },
        ],
      },
      {
        id: "activity",
        short: "Physical activity",
        prompt: "Do you get at least 30 minutes of physical activity on most days?",
        choices: [
          { label: "Yes", points: -2 },
          { label: "No", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Sun exposure",
    items: [
      {
        id: "sunburn",
        short: "Severe sunburn history",
        prompt: "Have you ever had a severe sunburn that blistered or peeled?",
        choices: [
          { label: "Never", points: 0 },
          { label: "Once or twice", points: 2 },
          { label: "Three or more times", points: 3 },
        ],
      },
      {
        id: "tanning_bed",
        short: "Tanning bed use",
        prompt: "Have you ever used a tanning bed?",
        choices: [
          { label: "Yes", points: 2 },
          { label: "No", points: 0 },
        ],
      },
      {
        id: "sun_protection",
        short: "Sun protection habits",
        prompt: "When you're outdoors for a long time, do you regularly use sunscreen, seek shade, or wear protective clothing?",
        choices: [
          { label: "Yes", points: -1 },
          { label: "No", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Family history",
    items: [
      {
        id: "family_history",
        short: "Family history of cancer",
        prompt: "Has a parent or sibling been diagnosed with any type of cancer?",
        choices: [
          { label: "No", points: 0 },
          { label: "Yes, one", points: 2 },
          { label: "Yes, two or more", points: 3 },
          { label: "Not sure", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Vaccination",
    items: [
      {
        id: "hpv",
        short: "HPV vaccination",
        prompt: "Have you received the HPV vaccine? (It protects against the virus linked to several types of cancer.)",
        choices: [
          { label: "Yes, completed the series", points: -2 },
          { label: "No / not sure", points: 0 },
        ],
      },
    ],
  },
  {
    section: "Home & environment",
    items: [
      {
        id: "radon",
        short: "Radon / industrial exposure",
        prompt: "Which best describes your home or work environment?",
        choices: [
          { label: "Tested for radon (result was low), and no nearby mining/industrial sites", points: 0 },
          { label: "Home has never been tested for radon, OR I live/work near mining, manufacturing, or heavy industrial sites", points: 2 },
          { label: "Not sure", points: 1 },
        ],
      },
    ],
  },
];

/* Point total -> risk tier. Realistic range is roughly -6 to +19. */
const RISK_CALC_TIERS = [
  { max: -3, label: "Well below average", tone: "well-below" },
  { max: 0, label: "Below average", tone: "below" },
  { max: 3, label: "About average", tone: "average" },
  { max: 7, label: "Above average", tone: "above" },
  { max: Infinity, label: "Well above average", tone: "well-above" },
];
