/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { rule as cors } from "./cors";
import { rule as encryption } from "./encryption";
import { rule as hashing } from "./hashing";
import { rule as noTab } from "./no-tab";
import { rule as osCommand } from "./os-command";
import { rule as processArgv } from "./process-argv";
import { rule as pseudoRandom } from "./pseudo-random";
import { rule as regularExpr } from "./regular-expr";
import { rule as sockets } from "./sockets";
import { rule as sqlQueries } from "./sql-queries";
import { rule as standardInput } from "./standard-input";
import { rule as xpath } from "./xpath";

const ruleModules: { [key: string]: Rule.RuleModule } = {};

ruleModules["code-eval"] = codeEval;
ruleModules["cookies"] = cookies;
ruleModules["cors"] = cors;
ruleModules["encryption"] = encryption;
ruleModules["hashing"] = hashing;
ruleModules["no-tab"] = noTab;
ruleModules["os-command"] = osCommand;
ruleModules["process-argv"] = processArgv;
ruleModules["pseudo-random"] = pseudoRandom;
ruleModules["regular-expr"] = regularExpr;
ruleModules["sockets"] = sockets;
ruleModules["sql-queries"] = sqlQueries;
ruleModules["standard-input"] = standardInput;
ruleModules["xpath"] = xpath;

export { ruleModules as rules };
