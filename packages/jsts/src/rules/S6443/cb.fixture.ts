import react, { useState } from "react";

function ShowLanguage1() {
  const [language, setLanguage] = react.useState("fr-FR");
  setLanguage(navigator.language);
  setLanguage(language); // Noncompliant {{Change the argument of this setter to not use its matching state variable}}
//^^^^^^^^^^^^^^^^^^^^^
}

function ShowLanguage2() {
  const [language, setLanguage] = useState("fr-FR");
  setLanguage(navigator.language);
  setLanguage(language); // Noncompliant {{Change the argument of this setter to not use its matching state variable}}
//^^^^^^^^^^^^^^^^^^^^^
}

function ShowLanguage3() {
  const [language1, setLanguage1] = useState("fr-FR");
  const [language2, setLanguage2] = useState("France");
  setLanguage1(navigator.language)
  setLanguage1(language2)
  setLanguage2("fr-FR")
  setLanguage2(language1)
}
