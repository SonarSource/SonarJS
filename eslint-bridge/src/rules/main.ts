/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import { Rule } from "eslint";
import { rule as codeEval } from "./code-eval";
import { rule as cookies } from "./cookies";
import { rule as osCommand } from "./os-command";
import { rule as pseudoRandom } from "./pseudo-random";

const ruleModules: { [key: string]: Rule.RuleModule } = {};

ruleModules["code-eval"] = codeEval;
ruleModules["cookies"] = cookies;
ruleModules["os-command"] = osCommand;
ruleModules["pseudo-random"] = pseudoRandom;

export { ruleModules as rules };
