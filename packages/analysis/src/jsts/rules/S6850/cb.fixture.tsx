// TypeScript wrappers are removed before the object literal is walked, so these are provable.
<h1 {...({ children: 'Title' } as const)} />;
<h2 {...({ children: 'Title' } satisfies { children: string })} />;
const typedAlias: { children: string } = { children: 'Title' };
<h3 {...typedAlias} />;

// JS-2539's reproducer. Object rest removes only `className`, but a rest binding resolves to the
// whole initializer, which proves nothing about `props.children` - a type annotation promising one
// is not something the decorator reads. Reporting here is preferred over hiding empty headings.
function Heading({ className, ...props }: { className?: string; children: string }) {
  return <h1 className={className} {...props} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
}
const page = <Heading>Accessible title</Heading>;

// Spread arguments that never reach an object literal.
declare const typed: { children: string };
<h4 {...(typed as { children: string })} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h5 {...typed!} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}

function GenericHeading<P extends { children?: unknown }>(props: P) {
  return <h6 {...props} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
}

// Still reported: nothing supplies content.
<h6 />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h5 {...({ className: 'title' } as const)} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: '' as string }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
