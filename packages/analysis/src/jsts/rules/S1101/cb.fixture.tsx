// Same accessible name, different destination: Noncompliant, with secondary location.
  <a href="/docs/react">Documentation</a>;
//^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/docs/vue">Documentation</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 2.}}

// Accessible name is normalized (trim, collapse whitespace, case-fold) before comparison.
  <a href="/pricing/enterprise"> Enterprise   Plan </a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/pricing/starter">enterprise plan</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 7.}}

// http and https are treated as an equivalent scheme: compliant.
  <a href="http://example.com/about">About us</a>;
  <a href="https://example.com/about">About us</a>;

// A different host is a different destination, even with the same scheme and path: Noncompliant.
  <a href="https://example.com/contact">Contact us</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="https://other.com/contact">Contact us</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 16.}}

// A protocol-relative href keeps its host too, rather than collapsing onto the local path: Noncompliant.
  <a href="//cdn.example.com/widget">Widget docs</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/widget">Widget docs</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 21.}}

// Different query string is a different destination: Noncompliant.
  <a href="/search?q=cats">Search</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/search?q=dogs">Search</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 26.}}

// A bare in-page fragment is discarded before comparing: compliant.
  <a href="/article#intro">Read more</a>;
  <a href="/article#conclusion">Read more</a>;

// A routing-style fragment (leading #/ or #!) is kept as significant: Noncompliant.
  <a href="/app#/profile">Account</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/app#/settings">Account</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 35.}}

// A dynamic href cannot be resolved statically: the anchor is excluded, never flagged.
  <a href={url}>Dashboard</a>;
  <a href="/dashboard">Dashboard</a>;

// aria-label establishes the accessible name, even when the visible text differs.
  <a href="/help/en" aria-label="Get help">FAQ</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/help/fr" aria-label="Get help">Support</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 44.}}

// Compliant: same visible text, but distinct aria-labels give each link a different accessible
// name, so the identical "Read more" text alone never causes them to be compared.
const distinctAriaLabelsSameParent = (
  <div>
    <a href="/posts/1" aria-label="Read more about the first post">Read more</a>
    <a href="/posts/2" aria-label="Read more about the second post">Read more</a>
  </div>
);

// A numeric expression child renders as visible text and makes the names differ: compliant.
  <a href="/items/1">Item {1}</a>;
  <a href="/items/2">Item {2}</a>;

// The numeric contribution is compared, not dropped: same number, different target is Noncompliant.
  <a href="/items/3">Item {3}</a>;
//^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/items/4">Item {3}</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 62.}}

// No accessible name at all: excluded from this rule (see S6827).
  <a href="/settings"><Icon /></a>;
  <a href="/profile"><Icon /></a>;

// The alt text of a nested image contributes to the accessible name.
  <a href="/team/alice"><img src="alice.png" alt="Team member" /></a>;
//^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/team/bob"><img src="bob.png" alt="Team member" /></a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 71.}}

// Content hidden from screen readers is skipped when computing the accessible name.
  <a href="/cart"><span aria-hidden="true">→</span> View cart</a>;
//^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/checkout"><span aria-hidden="true">→</span> View cart</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 76.}}

// title is used as a last resort accessible name, when there is no text content.
  <a href="/download/en" title="Download the file" />;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/download/fr" title="Download the file" />; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 81.}}

// Only native/JSX "a" elements are considered; role="link" is out of scope for v1.
  <span role="link" onClick={goHome}>Home</span>;
  <span role="link" onClick={goWork}>Home</span>;

// An unresolved spread attribute could set href, aria-label or title: excluded conservatively.
  <a {...linkProps} href="/one">Learn more</a>;
  <a href="/two">Learn more</a>;

// A resolvable spread that could set a visibility prop (hidden/aria-hidden/style) is also treated
// as unresolvable: excluded conservatively, so it is never wrongly compared as a visible link.
  <a {...{ hidden: true }} href="/hidden-spread/1">Spread hidden</a>;
  <a href="/hidden-spread/2">Spread hidden</a>;

// Each mismatch is reported against the closest preceding link, not the original first occurrence.
  <a href="/plans/basic">View plans</a>;
//^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/plans/pro">View plans</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 99.}}
//^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/plans/basic">View plans</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 101.}}
//^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/plans/enterprise">View plans</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 103.}}

// ---------------------------------------------------------------------------------------------
// Parent-scoping: only anchors sharing the same immediate JSX parent are compared.
// ---------------------------------------------------------------------------------------------

// Compliant: links under different parent containers are never compared, even with identical
// text - the surrounding context (a distinct <article>) disambiguates each link (WCAG 2.4.4).
const differentParents = (
  <>
    <article>
      <a href="/posts/1">Read more</a>
    </article>
    <article>
      <a href="/posts/2">Read more</a>
    </article>
  </>
);

// Compliant: nested-but-distinct parents are still different parents.
const nestedDistinctParents = (
  <>
    <div><span><a href="/contact/x">Contact</a></span></div>
    <div><span><a href="/contact/y">Contact</a></span></div>
  </>
);

// Reports an issue: same immediate parent, same text, different targets. Wrapped in an array so
// the trailing comment sits in expression position rather than raw JSX-children text.
const sameParent = (
  <div>
    {[
      <a href="/user/1/edit">Edit</a>,
    //^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
      <a href="/user/2/edit">Edit</a>, // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 137.}}
    ]}
  </div>
);

// Compliant: same parent, same text, same target.
const sameParentSameTarget = (
  <div>
    <a href="/help">Help</a>
    <a href="/help">Help</a>
  </div>
);

// ---------------------------------------------------------------------------------------------
// Hidden links are excluded from comparison entirely.
// ---------------------------------------------------------------------------------------------

// Compliant: a link hidden via aria-hidden is excluded from comparison.
const hiddenAriaHidden = (
  <div>
    <a href="/hidden/1" aria-hidden="true">Hidden</a>
    <a href="/hidden/2">Hidden</a>
  </div>
);

// Compliant: a link hidden via the boolean `hidden` attribute is excluded from comparison.
const hiddenAttribute = (
  <div>
    <a href="/hattr/1" hidden>Hattr</a>
    <a href="/hattr/2">Hattr</a>
  </div>
);

// Compliant: a link hidden via an object-form inline style is excluded from comparison.
const hiddenDisplayNoneObject = (
  <div>
    <a href="/style/1" style={{ display: 'none' }}>Styled</a>
    <a href="/style/2">Styled</a>
  </div>
);

// Compliant: a link hidden via a raw style string is excluded from comparison.
const hiddenDisplayNoneString = (
  <div>
    <a href="/rawstyle/1" style="display:none">Rawstyled</a>
    <a href="/rawstyle/2">Rawstyled</a>
  </div>
);

// ---------------------------------------------------------------------------------------------
// Mutually exclusive conditional branches are never compared against each other.
// ---------------------------------------------------------------------------------------------

// Compliant: the two branches of a ternary never render together.
const ternaryBranches = (
  <div>
    {condition ? (
      <a href="/branch/1">Branch</a>
    ) : (
      <a href="/branch/2">Branch</a>
    )}
  </div>
);

// Compliant: an if/else pair returned directly by a function falls back to the enclosing
// function as scope, and the two branches are mutually exclusive.
function Toggle({ condition }) {
  if (condition) {
    return <a href="/toggle/1">Toggle</a>;
  }
  return <a href="/toggle/2">Toggle</a>;
}

// Compliant: a ternary returned directly by a function falls back to the enclosing function as
// scope, and its two branches are mutually exclusive.
function renderAnchor(isHome) {
  return isHome ? <a href="/home">Login</a> : <a href="/">Login</a>;
}

// Reports an issue: the guard's consequent does not always exit (no return/throw), so the
// following link is not actually exclusive with it - both can render on the same pass.
function NotAGuard({ condition }) {
  if (condition) {
    <a href="/notaguard/1">Track</a>;
  //^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  }
  return <a href="/notaguard/2">Track</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 222.}}
}

// Reports an issue: a conditional link is still compared against an unconditional sibling; wrapped in an array so trailing comments sit in expression position.
const conditionalVsBaseline = (
  <div>
    {[
      <a href="/version/1">Version</a>,
    //^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
      condition && <a href="/version/2">Version</a>, // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 232.}}
    ]}
  </div>
);

// Reports an issue: same case as above with the conditional link written first. Source order
// must not change whether the conflict is detected.
const baselineVsConditional = (
  <div>
    {[
      condition && <a href="/release/1">Release</a>,
                 //^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
      <a href="/release/2">Release</a>, // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 244.}}
    ]}
  </div>
);

// Reports an issue: two unrelated conditions (isAdmin, loggedIn) are not mutually exclusive -
// both can be true at once, so these can render together with the same text and different targets.
function RoleMenu({ isAdmin, loggedIn }) {
  return (
    <ul>
      {[
        isAdmin && <a href="/admin">Settings</a>,
                 //^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
        loggedIn && <a href="/user">Settings</a>, // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 257.}}
      ]}
    </ul>
  );
}

// Reports an issue: both anchors merely follow the same early-return guard (an implicit "else"
// for the unrelated "Retry" link) - they are not mutually exclusive with each other, only each is
// exclusive with the guard's own branch.
function AfterGuard({ hasError }) {
  if (hasError) {
    return <a href="/retry">Retry</a>;
  }
  const first = <a href="/guard/1">Track</a>;
              //^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  logAnalytics('track-shown');
  return <a href="/guard/2">Track</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 272.}}
}

// ---------------------------------------------------------------------------------------------
// No enclosing JSX element: falls back to the nearest enclosing function.
// ---------------------------------------------------------------------------------------------

// Reports an issue: neither anchor has a JSX parent, so both fall back to the enclosing function.
function Footer() {
  <a href="/footer/1">Contact</a>;
//^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  return <a href="/footer/2">Contact</a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 284.}}
}

// Compliant: anchors returned by two different components are never compared.
function FirstWidget() {
  return <a href="/widget/first">Widget</a>;
}
function SecondWidget() {
  return <a href="/widget/second">Widget</a>;
}

// ---------------------------------------------------------------------------------------------
// Known limitations
// ---------------------------------------------------------------------------------------------

// Known limitation (false negative): a local variable's value isn't resolved for the accessible
// name, so the first anchor is excluded and never compared, despite both rendering "Sign Out".
function renderAnchorWithLocalConst(isLoggedIn) {
  const title = 'Sign Out';
  return (
    <>
      <a href="/logout">{title}</a>
      <a href="/help">Sign Out</a>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// aria-labelledby establishes the accessible name, at higher precedence than aria-label and text.
// ---------------------------------------------------------------------------------------------

// Compliant: same visible text, but distinct aria-labelledby references give each link a
// different accessible name (best effort: ids are compared directly, never resolved), mirroring
// the aria-label case above (distinctAriaLabelsSameParent) but for the higher-precedence attribute.
const distinctLabelledbySameParent = (
  <div>
    <span id="post-1-label">Read more about the first post</span>
    <a href="/posts/1" aria-labelledby="post-1-label">Read more</a>
    <span id="post-2-label">Read more about the second post</span>
    <a href="/posts/2" aria-labelledby="post-2-label">Read more</a>
  </div>
);

// Reports an issue: different visible text, but the same aria-labelledby reference gives both
// links the same accessible name - the exact conflict this rule exists to catch. Wrapped in an
// array so the trailing comment sits in expression position rather than raw JSX-children text.
const sameLabelledbyDifferentTarget = (
  <div>
    <span id="cta-label">Get started</span>
    {[
      <a href="/signup" aria-labelledby="cta-label">Sign up</a>,
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
      <a href="/login" aria-labelledby="cta-label">Log in</a>, // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 336.}}
    ]}
  </div>
);

// Compliant: an unresolvable aria-labelledby excludes the anchor even though the visible text
// matches, same conservative treatment as an unresolvable aria-label.
const unresolvableLabelledby = (
  <div>
    <a href="/dynamic-labelledby/1" aria-labelledby={dynamicId}>Same</a>
    <a href="/dynamic-labelledby/2">Same</a>
  </div>
);

// ---------------------------------------------------------------------------------------------
// A hidden ancestor excludes the anchor too, not just the anchor's own hidden attributes.
// ---------------------------------------------------------------------------------------------

// Compliant: without the ancestor check, these two anchors share the same immediate parent and
// the same text with different targets, which would be a conflict - but the whole section is
// aria-hidden, so both are invisible to every user and excluded before ever being compared.
const hiddenByAncestor = (
  <section aria-hidden="true">
    <div>
      <a href="/ancestor-hidden/1">Ancestor hidden</a>
      <a href="/ancestor-hidden/2">Ancestor hidden</a>
    </div>
  </section>
);

// ---------------------------------------------------------------------------------------------
// A nested element's own accessible name (not just <img alt>) overrides its content.
// ---------------------------------------------------------------------------------------------

// A nested <svg aria-label> contributes its own name instead of its (empty) content.
  <a href="/export/csv"><svg aria-label="Export data" /></a>;
//^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text or label.}}
  <a href="/export/json"><svg aria-label="Export data" /></a>; // Noncompliant {{Use a distinct text or label, or point to the same target for this link and the one on line 373.}}
