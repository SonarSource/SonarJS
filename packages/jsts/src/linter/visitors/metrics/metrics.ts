/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
/**
 * Metrics of the source code
 *
 * @param ncloc the line numbers of physical code
 * @param commentLines the line numbers of comments
 * @param nosonarLines the line numbers of NOSONAR comments
 * @param executableLines the line numbers of executable code
 * @param functions the number of functions
 * @param statements the number of statements
 * @param classes the number of classes
 * @param complexity the cyclomatic complexity
 * @param cognitiveComplexity the cognitive complexity
 */
export interface Metrics {
  ncloc?: number[];
  commentLines?: number[];
  nosonarLines: number[];
  executableLines?: number[];
  functions?: number;
  statements?: number;
  classes?: number;
  complexity?: number;
  cognitiveComplexity?: number;
}
