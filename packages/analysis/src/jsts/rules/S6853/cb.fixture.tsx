function valid() {
  return (
    <label>
      Surname
      <input type="text" />
    </label>
  );
}

function validCustomComponent() {
  return <label>Surname <CustomComponent /> </label>;
}

function invalid() {
  return (
    <>
      <input type="text" />
      <label>Surname </label> {/* Noncompliant {{A form label must be associated with a control.}} */}
{/*    ^^^^^*/}
    </>
  );
}

function invalidEmptyLabel() {
  return <label></label>; // Noncompliant {{A form label must have accessible text.}}
  //      ^^^^^
}


