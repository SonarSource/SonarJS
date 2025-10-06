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
// https://sonarsource.github.io/rspec/#/rspec/S7923/css
import stylelint, { type PostcssResult } from 'stylelint';
import type PostCSS from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import unitConverter, { type CSSUnits } from 'css-unit-converter';

const ruleName = 'sonar/no-restrict-orientation';
const angleRegex = /(?<angle>-?\d+(?:\.\d+)?)\s*(?<unit>deg|rad|grad|turn)?/i;

// exported for testing purpose
export const messages = {
  locked: 'Do not lock content to a specific display orientation.',
};

const RIGHT_ANGLE = 90;
const TOLERANCE = 30;

const ruleImpl: stylelint.RuleBase = () => {
  return (root: PostCSS.Root, result: PostcssResult) => {
    root.walkAtRules((atRule: PostCSS.AtRule) => {
      if (atRule.name === 'media' && atRule.params.includes('orientation')) {
        atRule.walkDecls((decl: PostCSS.Declaration) => {
          postcssValueParser(decl.value).walk((node: postcssValueParser.Node) => {
            if (isAngleInvalid(getAngle(node))) {
              stylelint.utils.report({
                ruleName,
                result,
                message: messages.locked,
                node: decl,
              });
            }
          });
        });
      }
    });
  };
};

function isAngleInvalid(angle: number | undefined) {
  if (angle === undefined) {
    return false;
  }
  // Check if the angle is within range of 90° (60° to 120°) or within range of 270° (240° to 300°)
  return Math.abs((angle % 180) - RIGHT_ANGLE) <= TOLERANCE;
}

export function getAngle(node: postcssValueParser.Node) {
  if (node.type !== 'function') {
    return;
  }
  const functionName = node.value.toLowerCase();
  switch (functionName) {
    case 'rotate': //rotate is an alias to rotateZ
    case 'rotatez': {
      if (
        node.nodes?.length === 1 &&
        node.nodes[0].type === 'word' &&
        angleRegex.test(node.nodes[0].value)
      ) {
        return getAngleFromString(node.nodes[0].value);
      }
      break;
    }
    case 'rotate3d': {
      const nodes = getWordNodes(node.nodes);
      if (
        nodes?.length === 4 &&
        // nodes[2] refers to rotation in z-axis and nodes[3] refers to the actual angle
        Number.parseInt(nodes[0].value) === 0 &&
        Number.parseInt(nodes[1].value) === 0 &&
        Number.parseInt(nodes[2].value) !== 0 &&
        angleRegex.test(nodes[3].value)
      ) {
        return getAngleFromString(nodes[3].value);
      }
      break;
    }
    case 'matrix':
    // 90°: matrix(0, 1, -1, 0, tx, ty) where first param = cos(90°) = 0, second param = sin(90°) = 1
    // 270°: matrix(0, -1, 1, 0, tx, ty)
    case 'matrix3d':
      // 90°: matrix3d(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
      // 270°: matrix3d(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
      return getAngleFromMatrix(node);
  }
}

function getAngleFromString(node: string) {
  const { angle, unit = 'deg' } = angleRegex.exec(node)?.groups ?? {};
  if (angle && unit) {
    return normalize360Angle(unitConverter(Number.parseFloat(angle), unit as CSSUnits, 'deg'));
  }
}

function getAngleFromMatrix(node: postcssValueParser.FunctionNode) {
  const nodes = getWordNodes(node.nodes);
  if (
    (node.value.toLowerCase() === 'matrix3d' && nodes.length === 16) ||
    (node.value.toLowerCase() === 'matrix' && nodes.length === 6)
  ) {
    const angleRad = Math.atan2(
      Number.parseFloat(nodes[1].value),
      Number.parseFloat(nodes[0].value),
    );
    return normalize360Angle(angleRad * (180 / Math.PI));
  }
}

function normalize360Angle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function getWordNodes(nodes: postcssValueParser.Node[]) {
  return nodes.filter(node => node.type === 'word');
}

export const rule = stylelint.createPlugin(
  ruleName,
  Object.assign(ruleImpl, {
    messages,
    ruleName,
  }),
) as { ruleName: string; rule: stylelint.Rule };
