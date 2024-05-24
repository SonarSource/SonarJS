const dictionaries = {
  // en: () => import('@/dictionaries/en.json').then((module) => module.default),
  pl: () => {},
  // de: () => import('@/dictionaries/de.json').then((module) => module.default),
};

const getDictionary = async (locale) => dictionaries[locale](); // Noncompliant

getDictionary('foo');
