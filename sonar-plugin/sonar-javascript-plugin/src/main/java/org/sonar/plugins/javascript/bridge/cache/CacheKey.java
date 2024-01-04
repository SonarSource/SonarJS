/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge.cache;

import static java.util.Collections.emptyList;
import static java.util.stream.Collectors.toList;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.PluginInfo;

class CacheKey {

  private final String file;
  private final List<String> prefixes;
  private final String pluginVersion;

  private CacheKey(List<String> prefixes, @Nullable String pluginVersion, String file) {
    this.prefixes = prefixes.stream().filter(Objects::nonNull).collect(toList());
    this.pluginVersion = pluginVersion;
    this.file = file;
  }

  static CacheKey forFile(InputFile inputFile, @Nullable String pluginVersion) {
    return new CacheKey(emptyList(), pluginVersion, inputFile.key());
  }

  CacheKey forCpd() {
    return withPrefix("js", "cpd");
  }

  CacheKey forUcfg() {
    return withPrefix(
      "jssecurity",
      "ucfgs",
      // UCFG version will be missing in the first period after this change as sonar-security does not have the change yet.
      // We might consider throwing when "ucfgVersion" is not defined some time later (e.g. when SQ 10.x series development starts).
      // Note that we should consider SonarJS running in the context without sonar-security (SQ with Community Edition)
      PluginInfo.getUcfgPluginVersion().orElse(null)
    );
  }

  CacheKey forFileMetadata() {
    return withPrefix("js", "filemetadata");
  }

  CacheKey withPrefix(String... prefixes) {
    return new CacheKey(
      Stream.concat(this.prefixes.stream(), Arrays.stream(prefixes)).collect(toList()),
      pluginVersion,
      file
    );
  }

  @Override
  public String toString() {
    var elements = new ArrayList<>(prefixes);
    if (pluginVersion != null) {
      elements.add(pluginVersion);
    }
    elements.add(file);
    return String.join(":", elements);
  }
}
