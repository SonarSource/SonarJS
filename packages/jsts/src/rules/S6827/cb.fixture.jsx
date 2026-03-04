
<a ref="cancelPending" title={window.t('background_tasks.cancel_all_tasks')} data-toggle="tooltip" href="#"></a>;
<a />; // Noncompliant {{Anchors must have content and the content must be accessible by a screen reader.}}

// Compliant: spread attributes may provide accessible content (children, aria-label, title) at runtime
<a {...this.props} />;
<a {...props} target="_blank" rel="noopener noreferrer" />;
