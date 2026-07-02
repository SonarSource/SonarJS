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

export type AdditionalAssertionDetector = (context: Rule.RuleContext, node: estree.Node) => boolean;
export type AdditionalTSAssertionDetector = (
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
) => boolean;

const defaultAdditionalAssertionDetectors: AdditionalAssertionDetector[] = [];
const defaultAdditionalTSAssertionDetectors: AdditionalTSAssertionDetector[] = [];

export function isAdditionalAssertion(
  context: Rule.RuleContext,
  node: estree.Node,
  detectors: AdditionalAssertionDetector[] = defaultAdditionalAssertionDetectors,
): boolean {
  return detectors.some(detector => detector(context, node));
}

export function isAdditionalTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  detectors: AdditionalTSAssertionDetector[] = defaultAdditionalTSAssertionDetectors,
): boolean {
  return detectors.some(detector => detector(services, node));
}
