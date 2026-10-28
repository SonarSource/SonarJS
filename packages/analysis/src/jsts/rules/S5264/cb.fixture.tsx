function Foo() {
  return (
    <>
      <object></object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }

      <object></object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }

      <object>
        Hello, world!
      </object>

      <object>
        <img src="foo.png" alt="bar" />
      </object>

      <object>
        <object></object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
      </object>

      <object>
        <object></object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
      </object>

      <object>
        <object>
          Hello, World!
        </object>
      </object>


      <object>
        { id }
      </object>

      <object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
        { undefined }
      </object>

      <object>
        <>
          <img src="foo.png" alt="bar" />
        </>
      </object>

      <object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
        <>

        </>
      </object>

      <object>
        <object>
          <img src="foo.png" alt="bar" />
        </object>
      </object>
    </>
  );
}

function HiddenFallbackContent() {
  return (
    <>
      <object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
        <span aria-hidden="true">Fallback</span>
      </object>

      <object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
        <span hidden>Fallback</span>
      </object>

      <object> { /* Noncompliant {{Add an accessible content to this "<object>" tag.}} */ }
        <span style={{ display: 'none' }}>Fallback</span>
      </object>

      <object>
        <span aria-hidden="false">Fallback</span>
      </object>

      <object> { /* Compliant: an unresolvable value may leave the fallback visible */ }
        <span aria-hidden={isHidden}>Fallback</span>
      </object>

      <div aria-hidden="true">
        <object> { /* Compliant: a hidden ancestor says nothing about the fallback's own visibility */ }
          <span>Fallback</span>
        </object>
      </div>
    </>
  );
}
