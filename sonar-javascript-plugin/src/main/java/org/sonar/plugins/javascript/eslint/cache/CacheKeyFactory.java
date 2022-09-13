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
package org.sonar.plugins.javascript.eslint.cache;

import java.util.Objects;
import java.util.stream.Stream;
import javax.annotation.Nullable;

import static java.util.function.Predicate.not;
import static java.util.stream.Collectors.joining;

class CacheKeyFactory {

  private final String version;
  private final String file;
  @Nullable
  private final Serialization serialization;

  CacheKeyFactory(String versionKey, String fileKey) {
    this(versionKey, fileKey, null);
  }

  CacheKeyFactory(String version, String file, @Nullable Serialization serialization) {
    this.version = version;
    this.file = file;
    this.serialization = serialization;
  }

  CacheKeyFactory withKeyType(Serialization keyType) {
    return new CacheKeyFactory(version, file, keyType);
  }

  @Override
  public String toString() {
    var category = CacheStrategy.class.getPackage().getImplementationVersion();
    var subCategory = serialization;
    return Stream.of("jssecurity", "ucfgs", category, subCategory, file)
      .filter(not(Objects::isNull))
      .map(Object::toString)
      .collect(joining(":"));
  }

  enum Serialization {
    JSON, SEQ
  }

}
