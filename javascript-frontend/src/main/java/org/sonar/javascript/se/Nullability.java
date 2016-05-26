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

import javax.annotation.Nullable;

public enum Nullability {

  NULL(State.YES, State.NO, State.YES),

  NOT_NULL(State.NO, State.UNKNOWN, State.UNKNOWN),

  UNDEFINED(State.NO, State.YES, State.YES),

  NOT_UNDEFINED(State.UNKNOWN, State.NO, State.UNKNOWN),

  // null or undefined, we are not sure
  NULLY(State.UNKNOWN, State.UNKNOWN, State.YES),

  UNKNOWN(State.UNKNOWN, State.UNKNOWN, State.UNKNOWN),

  // nor null or undefined
  NOT_NULLY(State.NO, State.NO, State.NO);

  private State nullState;
  private State undefinedState;
  private State nullOrUndefined;

  Nullability(State nullState, State undefinedState, State nullOrUndefined) {
    this.nullState = nullState;
    this.undefinedState = undefinedState;
    this.nullOrUndefined = nullOrUndefined;
  }

  private enum State {
    YES,
    NO,
    UNKNOWN;

    boolean opposite(State other) {
      return (this == YES && other == NO) || (this == NO && other == YES);
    }
    @Nullable
    State merge(State other) {
      if (this.opposite(other)) {
        return null;
      } else {
        return this == UNKNOWN ? other : this;
      }
    }

  }

  public boolean isNullOrUndefined() {
    return nullState == State.YES || undefinedState == State.YES || nullOrUndefined == State.YES;
  }

  public boolean isNeitherNullNorUndefined() {
    return nullState == State.NO && undefinedState == State.NO && nullOrUndefined == State.NO;
  }

  public boolean canNotBeEqual(Nullability other) {
    return nullState.opposite(other.nullState) || undefinedState.opposite(other.undefinedState) || nullOrUndefined.opposite(other.nullOrUndefined);
  }
}
