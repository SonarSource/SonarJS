function Foo() {
  return (
    <>
      <object></object> { /* Noncompliant */ }

      <object></object> { /* Noncompliant */ }

      <object>
        Hello, world!
      </object>

      <object>
        <img src="foo.png" alt="bar" />
      </object>

      <object>
        <object></object> { /* Noncompliant */ }
      </object>

      <object>
        <object></object> { /* Noncompliant */ }
      </object>

      <object>
        <object>
          Hello, World!
        </object>
      </object>


      <object>
        { id }
      </object>

      <object> { /* Noncompliant */ }
        { undefined }
      </object>

      <object>
        <>
          <img src="foo.png" alt="bar" />
        </>
      </object>

      <object> { /* Noncompliant */ }
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