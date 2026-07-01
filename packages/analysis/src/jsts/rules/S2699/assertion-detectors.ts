/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

type AdditionalAssertionDetector = (context: Rule.RuleContext, node: estree.Node) => boolean;
type AdditionalTSAssertionDetector = (
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
) => boolean;

const additionalAssertionDetectors: AdditionalAssertionDetector[] = [];
const additionalTSAssertionDetectors: AdditionalTSAssertionDetector[] = [];

export function isAdditionalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return additionalAssertionDetectors.some(detector => detector(context, node));
}

export function isAdditionalTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  return additionalTSAssertionDetectors.some(detector => detector(services, node));
}

export function withAdditionalAssertionDetectorsForTesting<T>(
  detectors: {
    assertionDetectors?: AdditionalAssertionDetector[];
    tsAssertionDetectors?: AdditionalTSAssertionDetector[];
  },
  callback: () => T,
): T {
  const previousAssertionDetectors = [...additionalAssertionDetectors];
  const previousTSAssertionDetectors = [...additionalTSAssertionDetectors];

  additionalAssertionDetectors.splice(
    0,
    additionalAssertionDetectors.length,
    ...(detectors.assertionDetectors ?? []),
  );
  additionalTSAssertionDetectors.splice(
    0,
    additionalTSAssertionDetectors.length,
    ...(detectors.tsAssertionDetectors ?? []),
  );

  try {
    return callback();
  } finally {
    additionalAssertionDetectors.splice(
      0,
      additionalAssertionDetectors.length,
      ...previousAssertionDetectors,
    );
    additionalTSAssertionDetectors.splice(
      0,
      additionalTSAssertionDetectors.length,
      ...previousTSAssertionDetectors,
    );
  }
}
