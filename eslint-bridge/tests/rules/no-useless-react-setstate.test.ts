/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTesterTs } from '../RuleTesterTs';

const ruleTesterTs = new RuleTesterTs();

import { rule } from 'rules/no-useless-react-setstate';

ruleTesterTs.run('', rule, {
  valid: [
    {
      code: `
        import * as react from "react";

        function ShowLanguage() {
            const [language, setLanguage] = react.useState("fr-FR");
            return (
              <section>
                <h1>Your language is {language}!</h1>
                <button onClick={() => setLanguage(navigator.language)}>Detect language</button>
                <button onClick={() => setLanguage("fr-FR")}>Je préfère le Français</button>
              </section>
            );
        }
      `,
    },
    {
      code: `
        import { useState } from "react";

        function ShowLanguage() {
            const [language1, setLanguage1] = useState("fr-FR");
            const [language2, setLanguage2] = useState("France");
            return (
              <div>
                <section>
                  <h1>Your main language is {language1}!</h1>
                  <button onClick={() => setLanguage1(navigator.language)}>Detect language</button>
                  <button onClick={() => setLanguage1(language2)}>Same as secondary</button>
                  <button onClick={() => setLanguage2("fr-FR")}>Je préfère le Français</button>
                </section>
                <section>
                  <h1>Your secondary language is {language2}!</h1>
                  <button onClick={() => setLanguage1(navigator.language)}>Detect language</button>
                  <button onClick={() => setLanguage2(language1)}>Same as main</button>
                </section>
              </div>
            );
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import * as react from "react";

        function ShowLanguage() {
            const [language, setLanguage] = react.useState("fr-FR");
            return (
              <section>
                <h1>Your language is {language}!</h1>
                <button onClick={() => setLanguage(navigator.language)}>Detect language</button> {/* this button does nothing */}
                <button onClick={() => setLanguage(language)}>Je préfère le Français</button>
              </section>
            );
        }
      `,
      errors: [
        {
          message: 'Change the parameter of this setter to not use its matching state variable',
          line: 10,
          column: 40,
          endLine: 10,
          endColumn: 61,
        },
      ],
    },
  ],
});
