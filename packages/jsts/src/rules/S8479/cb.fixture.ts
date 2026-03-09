import DOMPurify from 'dompurify';

const html = '<div>test</div>';

// Noncompliant: dangerous tags in ADD_TAGS
const clean1 = DOMPurify.sanitize(html, { ADD_TAGS: ['script', 'iframe'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: event handler attributes in ADD_ATTR
const clean2 = DOMPurify.sanitize(html, { ADD_ATTR: ['onclick', 'onerror'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: ALLOW_UNKNOWN_PROTOCOLS set to true
const clean3 = DOMPurify.sanitize(html, { ALLOW_UNKNOWN_PROTOCOLS: true }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: WHOLE_DOCUMENT set to true
const clean4 = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: SAFE_FOR_XML set to false
const clean5 = DOMPurify.sanitize(html, { SAFE_FOR_XML: false }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: SANITIZE_DOM set to false
const clean6 = DOMPurify.sanitize(html, { SANITIZE_DOM: false }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: RETURN_TRUSTED_TYPE set to false
const clean7 = DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: false }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'embed'
const clean8 = DOMPurify.sanitize(html, { ADD_TAGS: ['embed'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'form'
const clean9 = DOMPurify.sanitize(html, { ADD_TAGS: ['form'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                       ^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'svg'
const clean10 = DOMPurify.sanitize(html, { ADD_TAGS: ['svg'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'math'
const clean11 = DOMPurify.sanitize(html, { ADD_TAGS: ['math'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'style'
const clean12 = DOMPurify.sanitize(html, { ADD_TAGS: ['style'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'base'
const clean13 = DOMPurify.sanitize(html, { ADD_TAGS: ['base'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'meta'
const clean14 = DOMPurify.sanitize(html, { ADD_TAGS: ['meta'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: dangerous tag 'link'
const clean15 = DOMPurify.sanitize(html, { ADD_TAGS: ['link'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: event handler 'onmouseover'
const clean16 = DOMPurify.sanitize(html, { ADD_ATTR: ['onmouseover'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: event handler 'onfocus'
const clean17 = DOMPurify.sanitize(html, { ADD_ATTR: ['onfocus'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: event handler 'onload'
const clean18 = DOMPurify.sanitize(html, { ADD_ATTR: ['onload'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^

// Noncompliant: safe tag mixed with dangerous one
const clean19 = DOMPurify.sanitize(html, { ADD_TAGS: ['custom-element', 'script'] }); // Noncompliant {{Review this DOMPurify configuration to ensure it does not weaken sanitization.}}
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Compliant: safe configuration with USE_PROFILES
const safeClean1 = DOMPurify.sanitize(html, {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['custom-element'],
  ADD_ATTR: ['data-custom'],
});

// Compliant: no config argument
const safeClean2 = DOMPurify.sanitize(html);

// Compliant: empty config
const safeClean3 = DOMPurify.sanitize(html, {});

// Compliant: safe tags only
const safeClean4 = DOMPurify.sanitize(html, { ADD_TAGS: ['custom-element', 'my-component'] });

// Compliant: safe attributes
const safeClean5 = DOMPurify.sanitize(html, { ADD_ATTR: ['data-custom', 'aria-label', 'role'] });

// Compliant: SANITIZE_DOM set to true
const safeClean6 = DOMPurify.sanitize(html, { SANITIZE_DOM: true });

// Compliant: SAFE_FOR_XML set to true
const safeClean7 = DOMPurify.sanitize(html, { SAFE_FOR_XML: true });

// Compliant: ALLOW_UNKNOWN_PROTOCOLS set to false
const safeClean8 = DOMPurify.sanitize(html, { ALLOW_UNKNOWN_PROTOCOLS: false });

// Compliant: FORBID_TAGS and FORBID_ATTR
const safeClean9 = DOMPurify.sanitize(html, { FORBID_TAGS: ['script'], FORBID_ATTR: ['onclick'] });

// Compliant: not DOMPurify
function sanitize(html: string, config: object) { return html; }
const notDOMPurify = sanitize(html, { ADD_TAGS: ['script'] });
