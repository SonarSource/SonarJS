import React, { useState } from "react";

// NotAReactComponent..............

function notAReactComponent() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  return forceUpdate;
}

// Function Declarations..............

function ShowLanguageInvalid() {
  const [language, setLanguage] = useState("fr-FR");

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant {{Move the setState hook to the render function or body of a component}}
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

    // Makes an infinite loop
    setLanguage(navigator.language); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//  ^^^^^^^^^^^

    return (
        <section>
            <h1>Your language is {language}!</h1>
            <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
        </section>
    );
}

function ShowLanguageValid() {
  const [language, setLanguage] = useState(navigator.language);

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

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

const ShowLanguageValidArrow = () => {
  const [language, setLanguage] = useState("fr-FR");

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

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

const ShowLanguageValidExpression = function() {
  const [language, setLanguage] = useState("fr-FR");

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

// MemberInvalid..............

exports.MemberInvalid = () => {
    const [language, setLanguage] = useState("fr-FR");

    // Makes an infinite loop
    setLanguage(navigator.language); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//  ^^^^^^^^^^^

    return (
        <section>
            <h1>Your language is {language}!</h1>
            <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
        </section>
    );
};

// MemberInvalid..............

exports.MemberValid = () => {
    const [language, setLanguage] = useState("fr-FR");

    return (
        <section>
            <h1>Your language is {language}!</h1>
            <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
        </section>
    );
};

// MultipleHookInvalid..............

function MultipleHookInvalid() {
  const [a, setA] = useState("a");
  const [b, setB] = useState("b");

  function setC(c) {
    MultipleHookInvalid.c = c;
  }

  // Makes an infinite loop
  setA("A"); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//^^^^
  setB("B"); // Noncompliant {{Move the setState hook to the render function or body of a component}}
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

// MultipleHookValid..............

function MultipleHooValid() {
  const [a, setA] = useState("a");
  const [b, setB] = useState("b");

  function setC(c) {
    MultipleHookInvalid.c = c;
  }

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
    setLanguage('en'); // Noncompliant {{Move the setState hook to the render function or body of a component}}
//  ^^^^^^^^^^^
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

