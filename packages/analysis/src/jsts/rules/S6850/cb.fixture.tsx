// JS-2539: the ticket reproducer. Object rest removes only `className`; `children` stays in
// `props` and reaches the heading through the spread.
function Heading({ className, ...props }: { className?: string; children: string }) {
  return <h1 className={className} {...props} />;
}
const page = <Heading>Accessible title</Heading>;

// TypeScript-only spread arguments the resolver cannot see through: Unknown, so suppressed.
declare const typed: { children: string };
<h2 {...(typed as { children: string })} />;
<h3 {...typed!} />;

function GenericHeading<P extends { children?: unknown }>(props: P) {
  return <h4 {...props} />;
}

// Still reported: nothing supplies content.
<h6 />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h5 {...({ className: 'title' } as const)} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ className: 'title' as string }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
