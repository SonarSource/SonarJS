// ---- newly compliant: a spread provably carries renderable `children` ---------------------
<h1 {...{ children: 'Title' }} />;
<h1 {...{ 'children': 'Title' }} />;
const aliased = { children: 'Title' };
<h1 {...aliased} />;
const contentBase = { children: 'Hi' };
<h1 {...{ ...contentBase }} />;
const children = 'x';
<h1 {...{ children }} />;
// React renders `0` as "0", so it is content.
<h1 {...{ children: 0 }} />;
// An explicit `children` placed after every spread cannot be overridden.
<h1 {...{ ...props, children: 'Title' }} />;
// Later attributes that provably carry no named prop, or no content prop, override nothing.
<h1 {...{ children: 'Title' }} {...{ className: 'x' }} />;
<h1 {...{ children: 'Title' }} {...'text'} />;
<h1 {...{ children: null }} {...{ children: 'Title' }} />;
const overriding = { children: 'Title' };
<h1 {...{ children: null, ...overriding }} />;
<MyHeading {...{ children: 'Title' }} />;
// A computed key is trusted only when it is itself the literal `'children'`.
<h1 {...{ ['children']: 'Title' }} />;
// A computed key that is a literal other than `'children'` is known not to be it, so it cannot
// block the explicit `children` that precedes it.
<h1 {...{ children: 'Title', ['title']: 'x' }} />;

// ---- upstream preconditions this decorator relies on (preservation) -----------------------
// An explicit content attribute makes upstream bail out before the decorator runs, which is why
// `children={null}` stays unreported while the spread-borne `{...{ children: null }}` below does
// not - an upstream false negative left untouched here.
<h1 children="Title" />;
<h1 children={null} />;
<h1 aria-hidden="true" />;
<h1 {...someProps}>{/* comment */}</h1>;

// ---- retained reports: the spread provably supplies no content ------------------------------
<h1 />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h2></h2>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{}} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ className: 'title', id: 'x' }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const emptyBase = {};
const aliasOfEmpty = emptyBase;
<h1 {...aliasOfEmpty} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...'text'} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...[]} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h2 {...{ children: '' }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h3 {...{ children: undefined }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h4 {...{ children: false }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// Only a non-empty string or numeric literal proves content; a boolean, even a truthy one, does not.
<h1 {...{ children: true }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// `props.children` is a member access, not a literal: it is not provably non-empty.
<h1 {...{ children: props.children }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A getter, setter, or method named `children` is not a data property this decorator evaluates:
// the value it would produce is never read, so it cannot prove content.
<h1 {...{ get children() { return 'Title'; } }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ set children(value) {} }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children() { return 'Title'; } }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const knownEmpty = { children: '' };
<h1 {...knownEmpty} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const emptyText = '';
<h1 {...{ children: emptyText }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: 'x' }} {...{ children: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// The mirror image of the compliant case above: every spread precedes the explicit `children`, so
// nothing can override it and the emptiness is provable.
<h1 {...{ ...props, children: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A later spread that does resolve, and carries no `children`, overrides nothing - and leaves
// nothing that proves content either.
const noContent = { id: 1 };
<h1 {...{ children: null, ...noContent }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const nestedOnly = { id: 1 };
<h1 {...{ ...nestedOnly }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// `dangerouslySetInnerHTML` is out of scope: only `children` can lift a report.
<h1 {...{ dangerouslySetInnerHTML: { __html: '<b>t</b>' } }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// JSX children override `props.children`, so a heading that already has a child stays empty no
// matter what the spread carries.
<h1 {...{ children: 'Title' }}><span aria-hidden="true">x</span></h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: 'Title' }}>{undefined}</h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: 'Title' }}><></></h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<MyHeading />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}

// ---- retained reports: nothing proves the spread supplies content ---------------------------
// The forwarding idiom of JS-2539. A rest binding resolves to the whole initializer, which says
// nothing about `props.children`, so the heading keeps reporting rather than hiding a genuinely
// empty one.
function Heading({ className, ...props }) {
  return <h1 className={className} {...props} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
}
const page = <Heading>Accessible title</Heading>;
<h1 {...this.props} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...getProps()} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...(flag ? someProps : otherProps)} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...notDeclaredAnywhere} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A parameter default is not a single write that proves what every caller passes - a caller can
// still pass an empty `title` - so it must not be resolved the way a plain variable write is.
function WithDefault(title = 'Title') {
  return <h1 {...{ children: title }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
}
// Two writes, so no single write proves the shape.
let reassigned = { children: 'x' };
reassigned = { children: 'y' };
<h1 {...reassigned} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const cyclic = { ...cyclic };
<h1 {...cyclic} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const mutualA = { ...mutualB };
const mutualB = { ...mutualA };
<h1 {...mutualA} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// Refusing destructured bindings is what keeps a pattern that strips `children` from being
// mistaken for one that forwards it.
function Stripped(props) {
  const { children: _unused, ...rest } = props;
  return <h1 {...rest} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
}
const { children: _known, ...restOfKnown } = { children: 'Title' };
<h1 {...restOfKnown} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A spread sitting after an explicit `children` can still override it.
<h1 {...{ children: 'Title', ...props }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const overridable = { children: 'Title', ...props };
<h1 {...overridable} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ ...{ children: 'Title', ...props } }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps} {...{ children: 'Title', ...props }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const computedKey = 'children';
<h1 {...{ children: 'Title', [computedKey]: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// An identifier named `children` used as a computed key names whatever its *value* is - here `'x'`,
// from the `children` alias declared above - not the property `children` itself, so it must not be
// mistaken for the literal property.
<h1 {...{ [children]: 'Title' }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
