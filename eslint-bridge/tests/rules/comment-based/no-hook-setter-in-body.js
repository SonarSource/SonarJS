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
