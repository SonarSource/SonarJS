/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
const { Renderer } = require('typedoc');

module.exports.load = function load(app) {
  app.renderer.on(Renderer.EVENT_PREPARE_INDEX, event => {
    for (const [index, result] of event.searchResults.entries()) {
      // To see what is available on a event.searchResults element, see the reflections.json in the generated files
      result.signatures?.forEach(signature => {
        signature.parameters?.forEach(param => {
          if (param.type?.name) {
            initPropIfNeeded(event.searchFields[index], 'parameters');
            event.searchFields[index].parameters += `${param.type?.name}, `;
          }
        });
        cleanupIfNeeded(event.searchFields[index], 'parameters');
      });
    }
    // In order for a field to be taken into account by the index, it needs to be present in event.searchFieldWeights
    // https://github.com/TypeStrong/typedoc/blob/56813c0cb201f0c248a0cc43ef6e7578d680191c/src/lib/output/plugins/JavascriptIndexPlugin.ts#L89
    event.searchFieldWeights.parameters = 5;
  });
};

/**
 * Initialises object[propName] to ''
 *
 * @param {*} object
 * @param {*} propName
 */
function initPropIfNeeded(object, propName) {
  if (!object[propName]) object[propName] = '';
}

/**
 * Removes the last 2 characters ", " from object[propName]
 *
 * @param {*} object
 * @param {*} propName
 */
function cleanupIfNeeded(object, propName) {
  if (object[propName]?.length > 0) {
    object[propName] = object[propName].slice(0, -2);
  }
}
