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
<h1 {...{ children: null }} {...{ children: 'Title' }} />;
<MyHeading {...{ children: 'Title' }} />;

// ---- already fine before this change (preservation) ---------------------------------------
<h1>Text</h1>;
<h1 children="Title" />;
<h1 children={null} />;
<h1 aria-hidden="true" />;
<h1 {...someProps}>{/* comment */}</h1>;
<div {...someProps} />;

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
<h1 {...{ children: 'x' }} {...{ children: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
<h1 {...someProps} {...{ children: null, dangerouslySetInnerHTML: null }} />; // Noncompliant {{Headings must have content and the content must be accessible by a screen reader.}}
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
