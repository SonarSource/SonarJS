/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S6437/javascript

import { Rule } from 'eslint';
import {
  isRequiredParserServices,
  generateMeta,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import estree from 'estree';
// If a rule has a schema, use this to extract it.
// import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const messages = {
  //TODO: add needed messages
  messageId: 'message body',
};

const DEFAULT_PARAM = 10;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    // remove this condition if the rule does not depend on TS type-checker
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    // get typed rule options with FromSchema helper
    // const param = (context.options as FromSchema<typeof meta.schema>)[0]?.param ?? DEFAULT_PARAM;

    return {
      //example
      Identifier(node: estree.Identifier) {
        const secondaries: estree.Node[] = [];
        const message = 'message body';
        const messageId = 'messageId'; // must exist in messages object of rule metadata
        if (DEFAULT_PARAM) {
          // Use context.report if rule does not use secondary locations
          report(
            context,
            {
              node,
              message,
              messageId,
            },
            secondaries.map(n => toSecondaryLocation(n, 'Optional secondary location message')),
          );
        }
      },
    };
  },
};
