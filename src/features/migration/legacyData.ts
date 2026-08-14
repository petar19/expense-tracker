// Snapshot of fixes.json and categories.yaml from the original Python script,
// bundled statically for the one-time migration tool (editable here if new
// corrections are needed before a re-run).

export const LEGACY_FIXES: Record<string, string> = {
  'Pekarna, 17,5': 'Pekarna, 17.5',
  'Kruh, 7,5': 'Kruh, 7.5',
  'Pekara, 11,5': 'Pekara, 11.5',
  'Kruh, 8,5': 'Kruh, 8.5',
  'Režije, 1200,69': 'Režije, 1200.69',
  'Veronika, 10,.82': 'Veronika, 10.82',
  'Mlijeko,sir,jaja 12': 'Mlijeko,sir,jaja, 12',
  'Režije, 248,94': 'Režije, 248.94',
  '3*7.72': '23',
};

export const LEGACY_CATEGORIES: { name: string; keywords: string[] }[] = [
  {
    name: 'hrana',
    keywords: [
      'plodine', 'lidl', 'konzum', 'kaufland', 'spar', 'mesnica', 'meso', 'kobasic',
      'slasti', 'grožđe', 'mineraln', 'kupus', 'slanina', 'piletina', 'tjesten', 'jaja',
      'zdenka', 'pekara', 'pekarna', 'kruh', 'interspar', 'kava', 'jagode', 'dm',
      'garfield', 'sir', 'lonia', 'pan pek', 'sol', 'muller', 'pizza', 'gon hrana',
      'vilma', 'maca hrana', 'ribe', 'janje', 'torta', 'mljeveno', 'mcdonald', 'ćurak',
      'špek i kobasica', 'plac', 'dolac', 'vino', 'kesten', 'med', 'zelena t', 'voće',
      'aurelia tjestenina', 'špar', 'mandarine', 'češnjak', 'slastičarna', 'pan-pek',
      'teletina', 'sok', 'junetina', 'peradarstvo', 'mek', 'krastavci', 'paprike',
      'cikla', 'lubenic', 'krumpir', 'gablec', 'želuci', 'mlijek', 'breskv', 'puter',
      'roštilj', 'mlinar', 'nogice', 'palenta', 'fanta', 'jajca', 'veronika', 'sofra',
      'maslinovo ulje', 'maslin', 'eurospin', 'limun', 'jabuke',
    ],
  },
  {
    name: 'rezije',
    keywords: ['rezije', 'internet', 'režije', 'bon', 'struja', 'komunalna'],
  },
  {
    name: 'auti',
    keywords: [
      'gorivo', 'goriva', 'clio', 'dacia', 'plin', 'registracija', 'logan', 'sandero',
      'gume', 'vulkanizer',
    ],
  },
  {
    name: 'zivotinje',
    keywords: ['veterinar', 'veter', 'zoo', 'gon', 'mack', 'mačk', 'pas'],
  },
];
