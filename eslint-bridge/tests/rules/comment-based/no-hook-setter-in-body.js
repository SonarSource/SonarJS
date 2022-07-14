import { useState } from "react";

function ShowLanguageInvalid() {
  const [language, setLanguage] = useState("fr-FR");

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant
//^^^^^^^^^^^

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

function ShowLanguageValid() {
  const [language, setLanguage] = useState(navigator.language);

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
    </section>
  );
};

const ShowLanguageInvalidArrow = () => {
  const [language, setLanguage] = useState("fr-FR");

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant
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

const ShowLanguageInvalidExpression = function() {
  const [language, setLanguage] = useState("fr-FR");

  // Makes an infinite loop
  setLanguage(navigator.language); // Noncompliant
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
