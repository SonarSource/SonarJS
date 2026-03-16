import DOMPurify from 'dompurify';

const html = '<div>test</div>';

// single: dangerous tags
const clean1 = DOMPurify.sanitize(html, { ADD_TAGS: ['script', 'iframe'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'script' and 'iframe' from 'ADD_TAGS'.}}

// single: event handler attributes
const clean2 = DOMPurify.sanitize(html, { ADD_ATTR: ['onclick', 'onerror'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'onclick' and 'onerror' from 'ADD_ATTR'.}}

// single: ALLOW_UNKNOWN_PROTOCOLS
const clean3 = DOMPurify.sanitize(html, { ALLOW_UNKNOWN_PROTOCOLS: true }); // Noncompliant {{To prevent DOM-based attacks, set 'ALLOW_UNKNOWN_PROTOCOLS' to 'false'.}}

// single: WHOLE_DOCUMENT
const clean4 = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true }); // Noncompliant {{To prevent DOM-based attacks, set 'WHOLE_DOCUMENT' to 'false'.}}

// single: SAFE_FOR_XML
const clean5 = DOMPurify.sanitize(html, { SAFE_FOR_XML: false }); // Noncompliant {{To prevent DOM-based attacks, set 'SAFE_FOR_XML' to 'true'.}}

// single: SANITIZE_DOM
const clean6 = DOMPurify.sanitize(html, { SANITIZE_DOM: false }); // Noncompliant {{To prevent DOM-based attacks, set 'SANITIZE_DOM' to 'true'.}}

// single: RETURN_TRUSTED_TYPE
const clean7 = DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: false }); // Noncompliant {{To prevent DOM-based attacks, set 'RETURN_TRUSTED_TYPE' to 'true'.}}

// single: dangerous tag 'embed'
const clean8 = DOMPurify.sanitize(html, { ADD_TAGS: ['embed'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'embed' from 'ADD_TAGS'.}}

// single: dangerous tag 'form'
const clean9 = DOMPurify.sanitize(html, { ADD_TAGS: ['form'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'form' from 'ADD_TAGS'.}}

// single: dangerous tag 'svg'
const clean10 = DOMPurify.sanitize(html, { ADD_TAGS: ['svg'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'svg' from 'ADD_TAGS'.}}

// single: dangerous tag 'math'
const clean11 = DOMPurify.sanitize(html, { ADD_TAGS: ['math'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'math' from 'ADD_TAGS'.}}

// single: dangerous tag 'style'
const clean12 = DOMPurify.sanitize(html, { ADD_TAGS: ['style'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'style' from 'ADD_TAGS'.}}

// single: dangerous tag 'base'
const clean13 = DOMPurify.sanitize(html, { ADD_TAGS: ['base'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'base' from 'ADD_TAGS'.}}

// single: dangerous tag 'meta'
const clean14 = DOMPurify.sanitize(html, { ADD_TAGS: ['meta'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'meta' from 'ADD_TAGS'.}}

// single: dangerous tag 'link'
const clean15 = DOMPurify.sanitize(html, { ADD_TAGS: ['link'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'link' from 'ADD_TAGS'.}}

// single: event handler 'onmouseover'
const clean16 = DOMPurify.sanitize(html, { ADD_ATTR: ['onmouseover'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'onmouseover' from 'ADD_ATTR'.}}

// single: event handler 'onfocus'
const clean17 = DOMPurify.sanitize(html, { ADD_ATTR: ['onfocus'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'onfocus' from 'ADD_ATTR'.}}

// single: event handler 'onload'
const clean18 = DOMPurify.sanitize(html, { ADD_ATTR: ['onload'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'onload' from 'ADD_ATTR'.}}

// single: safe tag mixed with dangerous one
const clean19 = DOMPurify.sanitize(html, { ADD_TAGS: ['custom-element', 'script'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'script' from 'ADD_TAGS'.}}

// two issues: both shown
const multi1 = DOMPurify.sanitize(html, { ADD_TAGS: ['script'], SANITIZE_DOM: false }); // Noncompliant {{To prevent DOM-based attacks, remove 'script' from 'ADD_TAGS', and set 'SANITIZE_DOM' to 'true'.}}

// three issues: two shown, one overflow
const multi2 = DOMPurify.sanitize(html, { ADD_TAGS: ['script'], ADD_ATTR: ['onclick'], SANITIZE_DOM: false }); // Noncompliant {{To prevent DOM-based attacks, remove 'script' from 'ADD_TAGS', and remove 'onclick' from 'ADD_ATTR'. Plus 1 more issue. Read 'How to fix it' for all details.}}

// five issues: two shown, three overflow
const multi3 = DOMPurify.sanitize(html, { // Noncompliant {{To prevent DOM-based attacks, remove 'script' and 'iframe' from 'ADD_TAGS', and remove 'onclick' from 'ADD_ATTR'. Plus 3 more issues. Read 'How to fix it' for all details.}}
  ADD_TAGS: ['script', 'iframe'],
  ADD_ATTR: ['onclick'],
  ALLOW_UNKNOWN_PROTOCOLS: true,
  WHOLE_DOCUMENT: true,
  SANITIZE_DOM: false,
});

// mix of dangerous and safe: only dangerous ones count
const multi4 = DOMPurify.sanitize(html, { // Noncompliant {{To prevent DOM-based attacks, remove 'iframe' from 'ADD_TAGS', and set 'ALLOW_UNKNOWN_PROTOCOLS' to 'false'.}}
  ADD_TAGS: ['custom-element', 'iframe'],
  ADD_ATTR: ['data-custom', 'aria-label'],
  SANITIZE_DOM: true,
  ALLOW_UNKNOWN_PROTOCOLS: true,
});

// ALLOWED_ATTR with event handler (the useSafeInnerHTML pattern)
const clean20 = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'img'], ALLOWED_ATTR: ['class', 'src', 'onerror'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'onerror' from 'ALLOWED_ATTR'.}}

// ALLOWED_TAGS with dangerous tag
const clean21 = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'script'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'script' from 'ALLOWED_TAGS'.}}

// ALLOWED_TAGS and ALLOWED_ATTR both dangerous
const clean22 = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'iframe'], ALLOWED_ATTR: ['onclick'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'iframe' from 'ALLOWED_TAGS', and remove 'onclick' from 'ALLOWED_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with href
const clean23 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['href'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'href' from 'ADD_URI_SAFE_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with src
const clean24 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['src'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'src' from 'ADD_URI_SAFE_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with action
const clean25 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['action'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'action' from 'ADD_URI_SAFE_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with formaction
const clean26 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['formaction'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'formaction' from 'ADD_URI_SAFE_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with xlink:href
const clean27 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['xlink:href'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'xlink:href' from 'ADD_URI_SAFE_ATTR'.}}

// single: ADD_URI_SAFE_ATTR with data
const clean28 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['data'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'data' from 'ADD_URI_SAFE_ATTR'.}}

// mixed: safe and dangerous URI attrs
const clean29 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['my-custom-attr', 'href'] }); // Noncompliant {{To prevent DOM-based attacks, remove 'href' from 'ADD_URI_SAFE_ATTR'.}}

// ALLOWED_URI_REGEXP without ^ anchor (partial match bypass)
const clean30 = DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /https?:\/\/safe\.example\.com/ }); // Noncompliant {{To prevent DOM-based attacks, anchor the 'ALLOWED_URI_REGEXP' pattern with '^' to prevent partial URI matches.}}

// ALLOWED_URI_REGEXP: only scheme without anchor
const clean31 = DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /https?:/ }); // Noncompliant {{To prevent DOM-based attacks, anchor the 'ALLOWED_URI_REGEXP' pattern with '^' to prevent partial URI matches.}}

// Compliant: ALLOWED_TAGS and ALLOWED_ATTR with safe values only
const safeClean10 = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], ALLOWED_ATTR: ['class', 'src', 'href'] });

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

// Compliant: ADD_URI_SAFE_ATTR with non-URI attribute
const safeClean11 = DOMPurify.sanitize(html, { ADD_URI_SAFE_ATTR: ['my-custom-attr', 'data-value'] });

// Compliant: ALLOWED_URI_REGEXP anchored with ^
const safeClean12 = DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /^https?:\/\/safe\.example\.com/ });

// Compliant: ALLOWED_URI_REGEXP anchored, with flags
const safeClean13 = DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /^https?:/i });

// Compliant: not DOMPurify
function sanitize(html: string, config: object) { return html; }
const notDOMPurify = sanitize(html, { ADD_TAGS: ['script'] });
