/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.symbols.type;

import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;

public class ObjectType implements Type {

  protected Callability callability;

  protected ClassType classType = null;

  protected ObjectType(Callability callability) {
    this.callability = callability;
  }

  public void classType(ClassType classType) {
    this.classType = classType;
  }

  @Override
  public Kind kind() {
    return Kind.OBJECT;
  }

  @Override
  public Callability callability() {
    return callability;
  }

  @Nullable
  public ClassType classType() {
    return classType;
  }

  public static ObjectType create() {
    return create(Callability.UNKNOWN);
  }

  public static ObjectType create(Callability callability) {
    return new ObjectType(callability);
  }

  @Nullable
  public Symbol property(String name) {
    if (classType != null) {
      return classType.property(name);
    }
    return null;
  }

  @Override
  public String toString() {
    return this.kind().name();
  }

  public enum FrameworkType implements Type {
    JQUERY_SELECTOR_OBJECT {
      @Override
      public Kind kind() {
        return Kind.JQUERY_SELECTOR_OBJECT;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    },
    JQUERY_OBJECT {
      @Override
      public Kind kind() {
        return Kind.JQUERY_OBJECT;
      }

      @Override
      public Callability callability() {
        return Callability.CALLABLE;
      }
    },
    BACKBONE_MODEL {
      @Override
      public Kind kind() {
        return Kind.BACKBONE_MODEL;
      }

      @Override
      public Callability callability() {
        return Callability.CALLABLE;
      }
    },
    BACKBONE_MODEL_OBJECT {
      @Override
      public Kind kind() {
        return Kind.BACKBONE_MODEL_OBJECT;
      }

      @Override
      public Callability callability() {
        return Callability.UNKNOWN;
      }
    },
    ANGULAR_MODULE {
      @Override
      public Kind kind() {
        return Kind.ANGULAR_MODULE;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    }
  }

  public enum BuiltInObjectType implements Type {
    DATE {
      @Override
      public Kind kind() {
        return Kind.DATE;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    },
  }

  public enum WebApiType implements Type {
    WINDOW {
      @Override
      public Kind kind() {
        return Kind.WINDOW;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    },
    DOCUMENT {
      @Override
      public Kind kind() {
        return Kind.DOCUMENT;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    },
    DOM_ELEMENT {
      @Override
      public Kind kind() {
        return Kind.DOM_ELEMENT;
      }

      @Override
      public Callability callability() {
        return Callability.NON_CALLABLE;
      }
    },

  }
}
