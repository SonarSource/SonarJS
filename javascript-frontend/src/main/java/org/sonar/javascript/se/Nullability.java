/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.se;

import static org.sonar.javascript.se.Nullability.State.NO;
import static org.sonar.javascript.se.Nullability.State.YES;

public enum Nullability {

  NULL(YES, NO, YES),

  NOT_NULL(NO, State.UNKNOWN, State.UNKNOWN),

  UNDEFINED(NO, YES, YES),

  NOT_UNDEFINED(State.UNKNOWN, NO, State.UNKNOWN),

  // null or undefined, we are not sure
  NULLY(State.UNKNOWN, State.UNKNOWN, YES),

  UNKNOWN(State.UNKNOWN, State.UNKNOWN, State.UNKNOWN),

  // nor null or undefined
  NOT_NULLY(NO, NO, NO);

  enum State {
    YES,
    NO,
    UNKNOWN
  }

  private State nullState;
  private State undefinedState;
  private State nullOrUndefined;

  Nullability(State nullState, State undefinedState, State nullOrUndefined) {
    this.nullState = nullState;
    this.undefinedState = undefinedState;
    this.nullOrUndefined = nullOrUndefined;
  }

  public boolean isNullOrUndefined() {
    return nullState == YES || undefinedState == YES || nullOrUndefined == YES;
  }

  public boolean isNeitherNullNorUndefined() {
    return nullState == NO && undefinedState == NO && nullOrUndefined == NO;
  }

}
