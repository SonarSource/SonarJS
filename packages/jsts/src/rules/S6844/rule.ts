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
// https://sonarsource.github.io/rspec/#/rspec/S6844/javascript

import { rules } from '../external/a11y.js';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';
import type { Rule } from 'eslint';

const anchorIsValid = rules['anchor-is-valid'];

export const rule = interceptReport(
  {
    ...anchorIsValid,
    meta: generateMeta(meta as Rule.RuleMetaData, anchorIsValid.meta),
  },
  (context, reportDescriptor) => {
    const descriptor = reportDescriptor as any;
    const { message } = descriptor;
    descriptor.message = message.substring(0, message.indexOf(' Learn'));
    context.report(descriptor);
  },
);
