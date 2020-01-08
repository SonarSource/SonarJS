/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });

import { rule } from "../../src/rules/no-equals-in-for-termination";

ruleTester.run("Equality operators should not be used in for loop termination conditions", rule, {
  valid: [
    {
      code: `
      for (var i=0; i>10; i+=1){ } // Compliant, not an equality in condition
      for (var i=0; i!=10; i*=1){ } // Compliant, not an inc/dec update

      for (var i=0; i!=10; i++){ } // Compliant, trivial update operation increasing from 0 to 10
      for (var i=10; i!=0; i--){ } // Compliant, trivial update operation decreasing from 10 to 0
      for (var i=0; i!=10; i+=1){ } // Compliant, trivial update operation 
      for (var i=10; i!=0; i-=1){ } // Compliant, trivial update operation 

      var j = 20;
      for (j=0; j!=10; j++){ } // Compliant, trivial update operation 

      //Compliant tests: non trivial condition exception
      for (i = 0; checkSet[i] != null; i++){ }
      for (i = 0, k = 0; j != null; i++, k--){ } // Non trivial, j is not updated
      for (; checkSet[i] != null; i++ ){ }
      for (i = 0; foo(i) == 42; i++){ }
      for ( cur = event.target; cur != this; cur = cur.parentNode || this ){ }

      for (var i=0;; i+=1){ } // Compliant, no condition
      for (var i=0; i!=10;){ } // Compliant, no update
      for (var i=0; i>=10;){ } // Compliant, no update`,
    },
  ],
  invalid: [
    {
      code: `for (var i=0; i!=2; i+=2){ }
             for (i=0; i==2; i+=2){ }`,
      errors: [
        {
          message:
            "Replace '!=' operator with one of '<=', '>=', '<', or '>' comparison operators.",
          line: 1,
          endLine: 1,
          column: 15,
          endColumn: 19,
        },
        {
          message:
            "Replace '==' operator with one of '<=', '>=', '<', or '>' comparison operators.",
          line: 2,
          endLine: 2,
          column: 24,
          endColumn: 28,
        },
      ],
    },
    {
      code: `
        for (i=10; i==0; i--){ } // Noncompliant
        for(i=from, j=0; i!=to; i+=dir, j++){} // Noncompliant

        for (var i=0; i==10; i++){ } // Noncompliant, even if trivial update operation, we have equality in condition
        for (var i=0; i!=2; i+=2){ } // Noncompliant, not a trivial update
        for (var i=10; i!=0; i++){ } // Noncompliant, trivial update, but init is higher than stop and update is increasing
        for (var i=0; i!=10; i-=1){ } // Noncompliant, trivial update, but init is lower than stop and update is decreasing
        for (var i="a"; i!=0; i-=1){ } // Noncompliant, trivial update operation with wrong init

        var j = 20;
        for (j=0; j!=10; j--){ } // Noncompliant, trivial update, but init is lower than stop

        for (i = 0, k = 0; k != null; i++, k--){ } // Noncompliant, not a non trivial condition exception, updated counter is not in the condition
      `,
      errors: 9,
    },
    {
      code: `
      for (var i=0; i!=10; i+=1){
        i++ // changes to counter -> no exception
      }
      
      for (var i=0; iii!=10; iii+=1){
        iii++ // changes to counter -> no exception
      }
      `,
      errors: 1,
    },
  ],
});
