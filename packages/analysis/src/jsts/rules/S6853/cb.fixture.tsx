import { useId } from 'react';

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

function validUseIdSibling() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Name</label>
      <input id={id} />
    </>
  );
}

function validUseIdNesting() {
  const id = useId();
  return (
    <label htmlFor={id}>
      Name
      <input id={id} />
    </label>
  );
}

function validSplitLabel() {
  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor="email">Email</label>
      </div>
      <div className="field-control">
        <input id="email" />
      </div>
    </div>
  );
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

