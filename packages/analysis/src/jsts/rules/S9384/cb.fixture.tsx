// Same accessible name, different destination: Noncompliant, with secondary location.
  <a href="/docs/react">Documentation</a>;
//^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/docs/vue">Documentation</a>; // Noncompliant {{This link has the same text as the one on line 2, but points to a different destination.}}

// Accessible name is normalized (trim, collapse whitespace, case-fold) before comparison.
  <a href="/pricing/enterprise"> Enterprise   Plan </a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/pricing/starter">enterprise plan</a>; // Noncompliant {{This link has the same text as the one on line 7, but points to a different destination.}}

// http and https are treated as an equivalent scheme: compliant.
  <a href="http://example.com/about">About us</a>;
  <a href="https://example.com/about">About us</a>;

// Different query string is a different destination: Noncompliant.
  <a href="/search?q=cats">Search</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/search?q=dogs">Search</a>; // Noncompliant {{This link has the same text as the one on line 16, but points to a different destination.}}

// A bare in-page fragment is discarded before comparing: compliant.
  <a href="/article#intro">Read more</a>;
  <a href="/article#conclusion">Read more</a>;

// A routing-style fragment (leading #/ or #!) is kept as significant: Noncompliant.
  <a href="/app#/profile">Account</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/app#/settings">Account</a>; // Noncompliant {{This link has the same text as the one on line 25, but points to a different destination.}}

// A dynamic href cannot be resolved statically: the anchor is excluded, never flagged.
  <a href={url}>Dashboard</a>;
  <a href="/dashboard">Dashboard</a>;

// aria-label establishes the accessible name, even when the visible text differs.
  <a href="/help/en" aria-label="Get help">FAQ</a>;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/help/fr" aria-label="Get help">Support</a>; // Noncompliant {{This link has the same text as the one on line 34, but points to a different destination.}}

// No accessible name at all: excluded from this rule (see S6827).
  <a href="/settings"><Icon /></a>;
  <a href="/profile"><Icon /></a>;

// The alt text of a nested image contributes to the accessible name.
  <a href="/team/alice"><img src="alice.png" alt="Team member" /></a>;
//^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/team/bob"><img src="bob.png" alt="Team member" /></a>; // Noncompliant {{This link has the same text as the one on line 43, but points to a different destination.}}

// Content hidden from screen readers is skipped when computing the accessible name.
  <a href="/cart"><span aria-hidden="true">→</span> View cart</a>;
//^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/checkout"><span aria-hidden="true">→</span> View cart</a>; // Noncompliant {{This link has the same text as the one on line 48, but points to a different destination.}}

// title is used as a last resort accessible name, when there is no text content.
  <a href="/download/en" title="Download the file" />;
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/download/fr" title="Download the file" />; // Noncompliant {{This link has the same text as the one on line 53, but points to a different destination.}}

// Only native/JSX "a" elements are considered; role="link" is out of scope for v1.
  <span role="link" onClick={goHome}>Home</span>;
  <span role="link" onClick={goWork}>Home</span>;

// An unresolved spread attribute could set href, aria-label or title: excluded conservatively.
  <a {...linkProps} href="/one">Learn more</a>;
  <a href="/two">Learn more</a>;

// The first anchor in the group is the reference; every later mismatch is flagged against it.
  <a href="/plans/basic">View plans</a>;
//^^^^^^^^^^^^^^^^^^^^^^^> {{Link with the same text.}}
  <a href="/plans/pro">View plans</a>; // Noncompliant {{This link has the same text as the one on line 66, but points to a different destination.}}
  <a href="/plans/basic">View plans</a>;
  <a href="/plans/enterprise">View plans</a>; // Noncompliant {{This link has the same text as the one on line 66, but points to a different destination.}}
//^^^^^^^^^^^^^^^^^^^^^^^@-4< {{Link with the same text.}}
