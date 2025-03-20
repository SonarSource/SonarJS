/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3499/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, IssueLocation, report, toSecondaryLocation } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    function raiseIssue(
      node: estree.ObjectExpression,
      begin: number,
      end: number,
      positionMessage: string,
    ) {
      const properties = node.properties;
      const secondaryLocations: IssueLocation[] = [];

      for (let i = begin; i < end; i++) {
        const prop = properties[i] as estree.Property;
        if (prop.shorthand) {
          secondaryLocations.push(toSecondaryLocation(prop, `Move to ${positionMessage}`));
        }
      }

      report(
        context,
        {
          message: `Group all shorthand properties at ${positionMessage} of this object declaration.`,
          loc: context.sourceCode.getFirstToken(node)!.loc,
        },
        secondaryLocations,
      );
    }
    return {
      ObjectExpression(node: estree.Node) {
        const objectExpression = node as estree.ObjectExpression;
        const objectExpressionProperties = objectExpression.properties;
        if (objectExpressionProperties.some(p => p.type !== 'Property')) {
          return;
        }
        const isShorthandPropertyList = objectExpressionProperties.map(
          p => (p as estree.Property).shorthand,
        );
        const shorthandPropertiesNumber = isShorthandPropertyList.filter(b => b).length;

        const numberOfShorthandAtBeginning = getNumberOfTrueAtBeginning(isShorthandPropertyList);
        const numberOfShorthandAtEnd = getNumberOfTrueAtBeginning(
          [...isShorthandPropertyList].reverse(),
        );

        const allAtBeginning = numberOfShorthandAtBeginning === shorthandPropertiesNumber;
        const allAtEnd = numberOfShorthandAtEnd === shorthandPropertiesNumber;

        const propertiesNumber = isShorthandPropertyList.length;

        if (!allAtBeginning && numberOfShorthandAtBeginning > numberOfShorthandAtEnd) {
          raiseIssue(
            objectExpression,
            numberOfShorthandAtBeginning,
            propertiesNumber,
            'the beginning',
          );
        } else if (!allAtEnd && numberOfShorthandAtEnd > numberOfShorthandAtBeginning) {
          raiseIssue(objectExpression, 0, propertiesNumber - numberOfShorthandAtEnd, 'the end');
        } else if (!allAtBeginning && !allAtEnd) {
          raiseIssue(objectExpression, 0, propertiesNumber, 'either the beginning or end');
        }
      },
    };
  },
};

function getNumberOfTrueAtBeginning(list: Array<boolean>) {
  let numberOfTrueAtBeginning = 0;
  for (const b of list) {
    if (b) {
      numberOfTrueAtBeginning++;
    } else {
      break;
    }
  }
  return numberOfTrueAtBeginning;
}
