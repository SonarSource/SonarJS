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
