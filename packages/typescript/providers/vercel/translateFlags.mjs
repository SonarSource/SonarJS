// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
function createFlagTranslations(nativeFlags, classicFlags) {
  return Object.entries(nativeFlags).flatMap(([name, native]) => {
    const classic = classicFlags[name];
    return typeof native === 'number' &&
      native > 0 &&
      (native & (native - 1)) === 0 &&
      typeof classic === 'number'
      ? [[native, classic]]
      : [];
  });
}
function translateFlags(translations, flags) {
  let translated = 0;
  for (const [nativeFlag, classicFlag] of translations) {
    if (flags & nativeFlag) {
      translated |= classicFlag;
    }
  }
  return translated;
}
export { createFlagTranslations, translateFlags };
