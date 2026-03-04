
<a ref="cancelPending" title={window.t('background_tasks.cancel_all_tasks')} data-toggle="tooltip" href="#"></a>;
<a />; // Noncompliant {{Anchors must have content and the content must be accessible by a screen reader.}}

// Spread cannot be resolved - accessible content may be provided at runtime, suppress FP
<a {...this.props} />;
<a {...props} target="_blank" rel="noopener noreferrer" />;

// Spread resolves to an object literal with an accessible prop - suppress FP
<a {...{ 'aria-label': 'click here' }} />;
<a {...{ title: 'link title' }} />;

const withAriaLabel = { 'aria-label': 'click here' };
<a {...withAriaLabel} />;

const withTitle = { title: 'link title' };
<a {...withTitle} />;

// Spread resolves to an object literal with NO accessible prop - should still flag
<a {...{ id: '1' }} />; // Noncompliant {{Anchors must have content and the content must be accessible by a screen reader.}}
<a {...{ style: { color: 'red' } }} />; // Noncompliant {{Anchors must have content and the content must be accessible by a screen reader.}}

const onlyId = { id: '1' };
<a {...onlyId} />; // Noncompliant {{Anchors must have content and the content must be accessible by a screen reader.}}
