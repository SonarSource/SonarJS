import { useState } from "react";

function ShowLanguage() {
  const [language, setLanguage] = useState("fr-FR");

  setLanguage(navigator.language);

  return (
    <section>
      <h1>Your language is {language}!</h1>
      <button onClick={() => setLanguage("fr-FR")}>
        Je préfère le Français
      </button>
    </section>
  );
}
