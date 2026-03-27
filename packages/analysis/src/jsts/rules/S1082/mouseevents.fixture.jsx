
<div onMouseOver={ () => void 0 } onFocus={ () => void 0 } />;
<div onMouseOut={ () => void 0 } onBlur={ () => void 0 } />;
<div onMouseOver={ () => void 0 } onFocus={ () => void 0 }  />;
<div onMouseOut={ () => void 0 } onBlur={ () => void 0 }  />;

<div onMouseOver={ () => void 0 } />;   // Noncompliant {{onMouseOver must be accompanied by onFocus for accessibility.}}
<div onMouseOut={ () => void 0 } />;   // Noncompliant {{onMouseOut must be accompanied by onBlur for accessibility.}}
<div onMouseOver={ () => void 0 }  />; // Noncompliant {{onMouseOver must be accompanied by onFocus for accessibility.}}
<div onMouseOut={ () => void 0 }  />;  // Noncompliant {{onMouseOut must be accompanied by onBlur for accessibility.}}

