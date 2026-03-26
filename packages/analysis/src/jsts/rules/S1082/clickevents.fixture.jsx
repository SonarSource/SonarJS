<div onClick={() => {}} onKeyDown={this.handleKeyDown} />;
<div onClick={() => {}} onKeyUp={this.handleKeyUp} />;
<div onClick={() => {}} onKeyPress={this.handleKeyPress} />;
<button onClick={() => {}} />;
<div onClick={() => {}} aria-hidden="true" />;

<div onClick={() => {}} />;  // Noncompliant {{Visible, non-interactive elements with click handlers must have at least one keyboard listener.}}

