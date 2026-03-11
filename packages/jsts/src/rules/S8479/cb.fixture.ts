import DOMPurify from 'dompurify';

const html = '<div>test</div>';

// dangerous tags in ADD_TAGS
const clean1 = DOMPurify.sanitize(html, { ADD_TAGS: ['script', 'iframe'] }); // Noncompliant {{Remove 'script' and 'iframe' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// event handler attributes in ADD_ATTR
const clean2 = DOMPurify.sanitize(html, { ADD_ATTR: ['onclick', 'onerror'] }); // Noncompliant {{Remove 'onclick' and 'onerror' from 'ADD_ATTR' to prevent introducing event handler attributes.}}

// ALLOW_UNKNOWN_PROTOCOLS set to true
const clean3 = DOMPurify.sanitize(html, { ALLOW_UNKNOWN_PROTOCOLS: true }); // Noncompliant {{Set 'ALLOW_UNKNOWN_PROTOCOLS' to 'false' to prevent injection through dangerous URI schemes like javascript:.}}

// WHOLE_DOCUMENT set to true
const clean4 = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true }); // Noncompliant {{Set 'WHOLE_DOCUMENT' to 'false' to avoid processing the full document including dangerous head elements.}}

// SAFE_FOR_XML set to false
const clean5 = DOMPurify.sanitize(html, { SAFE_FOR_XML: false }); // Noncompliant {{Set 'SAFE_FOR_XML' to 'true' to enable XML-specific sanitization.}}

// SANITIZE_DOM set to false
const clean6 = DOMPurify.sanitize(html, { SANITIZE_DOM: false }); // Noncompliant {{Set 'SANITIZE_DOM' to 'true' to enable protection against DOM clobbering attacks.}}

// RETURN_TRUSTED_TYPE set to false
const clean7 = DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: false }); // Noncompliant {{Set 'RETURN_TRUSTED_TYPE' to 'true' to leverage Trusted Types for additional XSS protection.}}

// dangerous tag 'embed'
const clean8 = DOMPurify.sanitize(html, { ADD_TAGS: ['embed'] }); // Noncompliant {{Remove 'embed' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'form'
const clean9 = DOMPurify.sanitize(html, { ADD_TAGS: ['form'] }); // Noncompliant {{Remove 'form' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'svg'
const clean10 = DOMPurify.sanitize(html, { ADD_TAGS: ['svg'] }); // Noncompliant {{Remove 'svg' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'math'
const clean11 = DOMPurify.sanitize(html, { ADD_TAGS: ['math'] }); // Noncompliant {{Remove 'math' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'style'
const clean12 = DOMPurify.sanitize(html, { ADD_TAGS: ['style'] }); // Noncompliant {{Remove 'style' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'base'
const clean13 = DOMPurify.sanitize(html, { ADD_TAGS: ['base'] }); // Noncompliant {{Remove 'base' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'meta'
const clean14 = DOMPurify.sanitize(html, { ADD_TAGS: ['meta'] }); // Noncompliant {{Remove 'meta' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// dangerous tag 'link'
const clean15 = DOMPurify.sanitize(html, { ADD_TAGS: ['link'] }); // Noncompliant {{Remove 'link' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

// event handler 'onmouseover'
const clean16 = DOMPurify.sanitize(html, { ADD_ATTR: ['onmouseover'] }); // Noncompliant {{Remove 'onmouseover' from 'ADD_ATTR' to prevent introducing event handler attributes.}}

// event handler 'onfocus'
const clean17 = DOMPurify.sanitize(html, { ADD_ATTR: ['onfocus'] }); // Noncompliant {{Remove 'onfocus' from 'ADD_ATTR' to prevent introducing event handler attributes.}}

// event handler 'onload'
const clean18 = DOMPurify.sanitize(html, { ADD_ATTR: ['onload'] }); // Noncompliant {{Remove 'onload' from 'ADD_ATTR' to prevent introducing event handler attributes.}}

// safe tag mixed with dangerous one
const clean19 = DOMPurify.sanitize(html, { ADD_TAGS: ['custom-element', 'script'] }); // Noncompliant {{Remove 'script' from 'ADD_TAGS' to prevent introducing dangerous HTML elements.}}

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
