import React, { useState } from 'react';

// NotAReactComponent..............

function notAReactComponent() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  return forceUpdate;
}

// Function Declarations..............

function ShowLanguageInvalid() {
  const [language, setLanguage] = useState("fr-FR");

  setLanguage(navigator.language); // Noncompliant {{Remove this state setter call, perhaps move it to an event handler or JSX attribute}}
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
}

function ShowLanguagePrefixedInvalid() {
    const [language, setLanguage] = React.useState(navigator.language);

    setLanguage(navigator.language); // Noncompliant
//  ^^^^^^^^^^^

    return (
        <section>
            <h1>Your language is {language}!</h1>
            <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
        </section>
    );
}

// Arrow Functions..............

const ShowLanguageInvalidArrow = () => {
  const [language, setLanguage] = useState("fr-FR");

  setLanguage(navigator.language); // Noncompliant
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

// Function Expressions..............

const ShowLanguageInvalidExpression = function() {
  const [language, setLanguage] = useState("fr-FR");

  setLanguage(navigator.language); // Noncompliant
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

// Member..............

exports.MemberInvalid = () => {
    const [language, setLanguage] = useState("fr-FR");

    setLanguage(navigator.language); // Noncompliant
//  ^^^^^^^^^^^

    return (
        <section>
            <h1>Your language is {language}!</h1>
            <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
        </section>
    );
};

// Multiple Hooks..............

function MultipleHookInvalid() {
  const [a, setA] = useState("a");
  const [b, setB] = useState("b");

  function setC(c) {
    MultipleHookInvalid.c = c;
  }

  setA("A"); // Noncompliant
//^^^^
  setB("B"); // Noncompliant
//^^^^
  setC("C");

  return (
    <section>
      <h1>Multiple Hooks</h1>
      <var>{a}</var><button onClick={() => setA("A")}>A</button>
      <var>{b}</var><button onClick={() => setB("B")}>B</button>
    </section>
  );
}

// NestedInvalid..............

function NestedInvalid() {
  const [language, setLanguage] = useState(navigator.language);

  if (language === 'fr') {
    setLanguage('en'); // no longer raised, because used conditionally
  }

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
}

function NestedValid() {
  const [language, setLanguage] = useState(navigator.language);

  function process(setLanguage) {
    setLanguage('en');
  }

  process(l => navigator.language = l);

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
}

// Global hook calls are not checked
const [count, setCount] = useState(0);
setCount(1);


function ConditionalComponent() {
  const [language, setLanguage] = useState("fr-FR");

  if (enjoySharpKnives) {
    setLanguage(navigator.language);
  }
}
