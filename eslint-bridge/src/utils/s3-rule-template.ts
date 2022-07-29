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

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getModuleAndCalledMethod, getModuleNameOfIdentifier, isIdentifier } from '.';

export function S3BucketTemplate(
  callback: (node: estree.NewExpression, context: Rule.RuleContext) => void,
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(context: Rule.RuleContext) {
      return {
        NewExpression: (node: estree.NewExpression) => {
          if (isS3BucketConstructor(node, context) || is3BucketConstructorFromIntermediateProp(node, context)) {
            callback(node, context);
          }
        },
      };
    },
  };

  /**
   * Finds something like this:
   *
   * const s3 = require('aws-cdk-lib/aws-s3');
   * new s3.Bucket();
   */
  function isS3BucketConstructor(node: estree.NewExpression, context: Rule.RuleContext) {
    const { module, method } = getModuleAndCalledMethod(node.callee, context);
    return module?.value === 'aws-cdk-lib/aws-s3' && isIdentifier(method, 'Bucket');
  }

  /**
   * Finds something like this:
   *
   * const s3 = require('aws-cdk-lib');
   * new s3.aws_s3.Bucket();
   */
  function is3BucketConstructorFromIntermediateProp(node: estree.NewExpression, context: Rule.RuleContext) {
    if (node.callee.type !== 'MemberExpression') {
      return false;
    }
    const callee: estree.MemberExpression = node.callee;
    if (callee.object.type !== 'MemberExpression') {
      return false;
    }
    const property = callee.object.property;
    const grandParent = get2LevelsUpCaller(callee);
    if (grandParent != null && checkMidProp(property, 'aws_s3')) {
      const module = getModuleNameOfIdentifier(context, grandParent);
      return module?.value === 'aws-cdk-lib';
    }
    return false;

    function get2LevelsUpCaller(callee: estree.MemberExpression) {
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'MemberExpression' &&
        callee.object.object.type === 'Identifier'
      ) {
        return callee.object.object;
      } else {
        return null;
      }
    }
    function checkMidProp(property: any, name: string): boolean {
      return property.type === 'Identifier' && property.name === name;
    }
  }
}
