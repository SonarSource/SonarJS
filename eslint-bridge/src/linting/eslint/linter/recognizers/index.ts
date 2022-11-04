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

// Inspired from sonar-java and sonar-analyzer-commons
// - https://github.com/SonarSource/sonar-java/blob/e3b4ce381eb994235ab811d253953e400d12aab2/java-checks/src/main/java/org/sonar/java/checks/JavaFootprint.java#L31
// - https://github.com/SonarSource/sonar-analyzer-commons/blob/e2881512ce632259981c65b587652151e876d736/recognizers/src/main/java/org/sonarsource/analyzer/commons/recognizers/CodeRecognizer.java#L25

export * from './JavaScriptFootPrint';
export * from './CodeRecognizer';
