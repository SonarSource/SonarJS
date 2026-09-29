// ---- newly compliant: content may reach the heading through a spread ----------------------
function Heading({ className, ...props }) {
  return <h1 className={className} {...props} />;
}
const page = <Heading>Accessible title</Heading>;

<h1 {...{ children: 'Title' }} />;
const aliased = { children: 'Title' };
<h1 {...aliased} />;
const contentBase = { children: 'Hi' };
<h1 {...{ ...contentBase }} />;
const children = 'x';
<h1 {...{ children }} />;
<h1 {...{ children: 0 }} />;
let reassigned = { children: 'x' };
reassigned = { children: 'y' };
<h1 {...reassigned} />;
<h1 {...this.props} />;
<h1 {...getProps()} />;
<h1 {...(flag ? someProps : otherProps)} />;
<h1 {...notDeclaredAnywhere} />;
const cyclic = { ...cyclic };
<h1 {...cyclic} />;
const mutualA = { ...mutualB };
const mutualB = { ...mutualA };
<h1 {...mutualA} />;
<h1 {...{ dangerouslySetInnerHTML: { __html: '<b>t</b>' } }} />;
<h1 {...{ children: 'Title' }} {...{ className: 'x' }} />;
// A spread sitting after an explicit content prop can still override it, so the object settles
// nothing and the heading keeps the benefit of the doubt - even when every content channel is
// explicitly empty, which would otherwise look provably contentless.
<h1 {...{ children: null, ...props }} />;
<h1 {...{ children: null, dangerouslySetInnerHTML: null, ...props }} />;
const overridable = { children: null, dangerouslySetInnerHTML: null, ...props };
<h1 {...overridable} />;
<h1 {...{ ...{ children: null, dangerouslySetInnerHTML: null, ...props } }} />;
<h1 {...{ 'children': null, 'dangerouslySetInnerHTML': null, ...props }} />;
const overriding = { children: 'Title' };
<h1 {...{ children: null, ...overriding }} />;
<h1 {...{ children: null }} {...{ children: 'Title' }} />;
<MyHeading {...{ children: 'Title' }} />;
// Known limitation: a rest binding resolves to its whole initializer, so the decorator cannot see
// that `children` was destructured away and has to assume the spread may still carry it.
function Stripped(props) {
  const { children: _unused, ...rest } = props;
  return <h1 {...rest} />;
}

// ---- upstream preconditions this decorator relies on (preservation) -----------------------
// An explicit content attribute makes upstream bail out before the decorator runs, which is why
// `children={null}` stays unreported while the spread-borne `{...{ children: null }}` below does
// not - an upstream false negative left untouched here.
<h1 children="Title" />;
<h1 children={null} />;
<h1 aria-hidden="true" />;
<h1 {...someProps}>{/* comment */}</h1>;

// ---- retained reports ----------------------------------------------------------------------
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
const knownEmpty = { children: '' };
<h1 {...knownEmpty} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const emptyText = '';
<h1 {...{ children: emptyText }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ children: 'x' }} {...{ children: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps} {...{ children: null, dangerouslySetInnerHTML: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// The mirror image: every spread precedes the explicit content props, so nothing can override
// them and the emptiness is provable.
<h1 {...{ ...props, children: null, dangerouslySetInnerHTML: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A later spread that does resolve, and carries no content prop, overrides nothing either.
const noContent = { id: 1 };
<h1 {...{ children: null, dangerouslySetInnerHTML: null, ...noContent }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps}><span aria-hidden="true">x</span></h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps}>{undefined}</h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps}><></></h1>; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
// A rest binding resolves to the whole initializer, not to the remainder, so this reports because
// the source object carries no content prop - not because `className` was destructured away. A
// source that does carry one, as in `const { children: c, ...rest } = { children: 'T' }`, is
// therefore still suppressed.
const { className: _cls, ...restOfKnown } = { className: 'c', id: 'i' };
<h1 {...restOfKnown} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
const nestedOnly = { id: 1 };
<h1 {...{ ...nestedOnly }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...{ dangerouslySetInnerHTML: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<MyHeading />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
