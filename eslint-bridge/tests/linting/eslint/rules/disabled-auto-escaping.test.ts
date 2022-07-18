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
import { TypeScriptRuleTester } from '../../../testing';
import { rule } from 'linting/eslint/rules/disabled-auto-escaping';

const ruleTester = new TypeScriptRuleTester();

const handlebarsCases = {
  valid: [
    {
      code: `
      const Handlebars = require("handlebars");
      var options = {
        noEscape: false // Compliant
      };
      var source = "<p>attack {{name}}</p>";
      var template = Handlebars.compile(source, options); // Compliant
            `,
    },
    {
      code: `
      const Handlebars = require("handlebars");
      var options = {
        noEscape: true
      };
      if (x) {
        options = {
          noEscape: false
        }
      };
      var source = "<p>attack {{name}}</p>";
      var template = Handlebars.compile(source, options); // Compliant
            `,
    },
    {
      code: `
      const Handlebars = require("handlebars");
      var source = "<p>attack {{name}}</p>";
      var template = Handlebars.compile(source); // Compliant by default noEscape is set to false
            `,
    },
  ],
  invalid: [
    {
      code: `
      const Handlebars = require("handlebars");
      var options = {
        noEscape: true // Sensitive
      };
      var source = "<p>attack {{name}}</p>";
      var template = Handlebars.compile(source, options); // Sensitive
            `,
      errors: [
        {
          line: 7,
          column: 22,
          endLine: 7,
          endColumn: 40,
          message: JSON.stringify({
            message: 'Make sure disabling auto-escaping feature is safe here.',
            secondaryLocations: [{ column: 8, line: 4, endColumn: 22, endLine: 4 }],
          }),
        },
      ],
    },
  ],
};

const markdownCases = {
  valid: [
    {
      code: `
      var md = require('markdown-it')({
        html: false
      });  // Compliant
      var result = md.render('# <b>attack</b>');
      console.log(result); 
            `,
    },
    {
      code: `
      var md = require('markdown-it')(); // Compliant by default html is set to false
      var result = md.render('# <b>attack</b>');
      console.log(result);
            `,
    },
  ],
  invalid: [
    {
      code: `
      var md = require('markdown-it')({
        html: true // Sensitive
      });
      var result = md.render('# <b>attack</b>');
      console.log(result);
            `,
      errors: [
        {
          line: 2,
          column: 16,
          endLine: 2,
          endColumn: 38,
          message: JSON.stringify({
            message: 'Make sure disabling auto-escaping feature is safe here.',
            secondaryLocations: [{ column: 8, line: 3, endColumn: 18, endLine: 3 }],
          }),
        },
      ],
    },
  ],
};

const kramedCases = {
  valid: [
    {
      code: `
      var kramed = require('kramed');
      var options = {
        renderer: new kramed.Renderer({
          sanitize: true  // Compliant
        })
      };
      console.log(kramed('Attack [xss?](javascript:alert("xss")).', options)); // Compliant 
            `,
    },
    {
      code: `
      var options = {
        renderer: new Unknown({
          sanitize: true
        })
      };
            `,
    },
  ],
  invalid: [
    {
      code: `
      var kramed = require('kramed');
      var options = {
        renderer: new kramed.Renderer({
          sanitize: false // Sensitive
        })
      };
      console.log(kramed('Attack1 [xss?](javascript:alert("xss")).', options));
      console.log(kramed('Attack2 [xss?](javascript:alert("xss")).')); // Without option it's not sanitized, but likely if the user doesn't passed option, "it's a basic rendering"
            `,
      errors: 1,
    },
  ],
};

const markedCases = {
  valid: [
    {
      code: `
      const marked = require('marked');
      marked.setOptions({
        renderer: new marked.Renderer(),
        sanitize: true // Compliant
      });
      console.log(marked("# test <b>attack/b>"));  
            `,
    },
    {
      code: `
      const marked = require('marked');
      marked.setOptions({
        renderer: new marked.Renderer()
      }); // Compliant by default sanitize is set to true
      console.log(marked("# test <b>attack/b>"));  
            `,
    },
  ],
  invalid: [
    {
      code: `
      const marked = require('marked');
      marked.setOptions({
        renderer: new marked.Renderer(),
        sanitize: false // Sensitive
      });
      console.log(marked("# test <b>attack/b>"));  
            `,
      errors: [
        {
          line: 3,
          column: 7,
          endLine: 3,
          endColumn: 24,
          message: JSON.stringify({
            message: 'Make sure disabling auto-escaping feature is safe here.',
            secondaryLocations: [{ column: 8, line: 5, endColumn: 23, endLine: 5 }],
          }),
        },
      ],
    },
  ],
};

const mustatcheCases = {
  valid: [
    {
      code: `
      const Mustache = require("mustache");   
      function renderHello() {
        var inputName = "<b>Luke</b>";
        var template = document.getElementById('template').innerHTML;
        var rendered = Mustache.render(template, { name: inputName }); // Compliant
        document.getElementById('target').innerHTML = rendered;
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = unknown();
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = function(text) {
          if(text.includes("<script>")) {
              return "blocked";
           }
          return text;
        };
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = function(text, other) {return text;};
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = function(text) {return sanitize(text);};
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = function(...text) {return sanitize(text);};
      }
            `,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = text, other => text;
      }
            `,
    },
  ],
  invalid: [
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        var inputName = "<b>Luke</b>";
        var template = document.getElementById('template').innerHTML;
        Mustache.escape = function(text) {return text;}; // Sensitive
        var rendered = Mustache.render(template, { name: inputName });
        document.getElementById('target').innerHTML = rendered; 
      }
            `,
      errors: [
        {
          line: 6,
          column: 9,
          endLine: 6,
          endColumn: 24,
          message: 'Make sure disabling auto-escaping feature is safe here.',
        },
      ],
    },
    {
      code: `
      const Mustache = require("mustache");
      function invalidSanitizer(text) {
        return text;
      }
      function renderHello() {
        Mustache.escape = invalidSanitizer; // Sensitive
      }
            `,
      errors: [
        {
          line: 7,
          column: 9,
          endLine: 7,
          endColumn: 24,
          message: 'Make sure disabling auto-escaping feature is safe here.',
        },
      ],
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        Mustache.escape = text => text;
      }
            `,
      errors: 1,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        const invalidSanitizer = text => text;
        Mustache.escape = invalidSanitizer;
      }
            `,
      errors: 1,
    },
    {
      code: `
      const Mustache = require("mustache");
      function renderHello() {
        const invalidSanitizer = function(text) {return text;};
        Mustache.escape = invalidSanitizer;
      }
            `,
      errors: 1,
    },
  ],
};

ruleTester.run(
  '[Handlebars] Disabling auto-escaping in template engines is security-sensitive',
  rule,
  handlebarsCases,
);
ruleTester.run(
  '[markdown-it] Disabling auto-escaping in template engines is security-sensitive',
  rule,
  markdownCases,
);
ruleTester.run(
  '[kramed] Disabling auto-escaping in template engines is security-sensitive',
  rule,
  kramedCases,
);
ruleTester.run(
  '[marked] Disabling auto-escaping in template engines is security-sensitive',
  rule,
  markedCases,
);
ruleTester.run(
  '[mustache] Disabling auto-escaping in template engines is security-sensitive',
  rule,
  mustatcheCases,
);
