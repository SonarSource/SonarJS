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
import { Location } from '../issues/location.js';

/**
 * A SonarLint quick fix
 *
 * @param message a message describing an action to trigger
 * @param edits a list of changes to apply to the user code
 *
 * _For the record, ESLint defines two types of code fix:_
 *
 * - _A fix is a single change applied to a code snippet_
 * - _Suggestions provide multiple changes at once_
 *
 * _ESLint fixes don't include a message contrary to ESLint suggestions._
 */
export interface QuickFix {
  message: string;
  edits: QuickFixEdit[];
}

/**
 * A SonarLint quick fix edit
 *
 * It represents a change to apply to the user code at a location in the source file.
 *
 * @param loc a location in the code to change
 * @param text a change to apply in the code
 */
export interface QuickFixEdit {
  loc: Location;
  text: string;
}
