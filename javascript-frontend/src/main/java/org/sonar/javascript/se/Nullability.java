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

import java.util.Objects;

import static org.sonar.javascript.se.Nullability.State.NO;
import static org.sonar.javascript.se.Nullability.State.YES;

public class  Nullability {

  public static final Nullability NULL = new Nullability(YES, NO, YES);

  public static final Nullability UNDEFINED = new Nullability(NO, YES, YES);

  // null or undefined, we are not sure
  public static final Nullability NULLY = new Nullability(State.UNKNOWN, State.UNKNOWN, YES);

  public static final Nullability UNKNOWN = new Nullability(State.UNKNOWN, State.UNKNOWN, State.UNKNOWN);

  // nor null or undefined
  public static final Nullability NOT_NULLY = new Nullability(NO, NO, NO);

  public enum State {
    YES,
    NO,
    UNKNOWN
  }

  private State nullState;
  private State undefinedState;
  private State nullOrUndefined;

  private Nullability(State nullState, State undefinedState, State nullOrUndefined) {
    this.nullState = nullState;
    this.undefinedState = undefinedState;
    this.nullOrUndefined = nullOrUndefined;
  }

  public State isNullOrUndefined() {
    if (nullState == YES || undefinedState == YES || nullOrUndefined == YES) {
      return YES;

    } else if (nullState == NO && undefinedState == NO && nullOrUndefined == NO) {
      return NO;

    } else {
      return State.UNKNOWN;
    }
  }

  @Override
  public String toString() {
    if (this.equals(UNKNOWN)) {
      return "UNKNOWN";

    } else if (this.equals(UNDEFINED)) {
      return "UNDEFINED";

    } else if (this.equals(NULLY)) {
      return "NULLY";

    } else if (this.equals(NULL)) {
      return "NULL";

    } else {
      return "NOT_NULLY";
    }
  }

  @Override
  public int hashCode() {
    return Objects.hash(nullState, undefinedState, nullOrUndefined);
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    Nullability other = (Nullability) obj;
    return Objects.equals(this.nullState, other.nullState)
      && Objects.equals(this.undefinedState, other.undefinedState)
      && Objects.equals(this.nullOrUndefined, other.nullOrUndefined);
  }

}
