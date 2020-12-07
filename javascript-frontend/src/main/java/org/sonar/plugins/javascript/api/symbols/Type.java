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
package org.sonar.plugins.javascript.api.symbols;

import com.google.common.annotations.Beta;

/**
 * Interface to represent the different type of Symbols.
 */
@Beta
public interface Type {

  Kind kind();

  Callability callability();

  enum Callability {
    CALLABLE,
    NON_CALLABLE,
    UNKNOWN
  }

  enum Kind {
    UNKNOWN,

    // PRIMITIVE
    STRING,
    NUMBER,
    BOOLEAN,

    // OBJECT
    OBJECT,
    FUNCTION,
    ARRAY,
    DATE,
    CLASS,

    // JQUERY
    JQUERY_OBJECT,
    JQUERY_SELECTOR_OBJECT,

    // BACKBONE
    BACKBONE_MODEL,
    BACKBONE_MODEL_OBJECT,

    // WEB API
    WINDOW,
    DOCUMENT,
    DOM_ELEMENT,

    // ANGULAR JS
    ANGULAR_MODULE
  }


}
