/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import org.sonar.api.scanner.ResourceFetcher;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;

/**
 * Scanner-side embedded Node.js runtime: fetched on demand through {@link ResourceFetcher} instead of being read
 * off the classpath, since it is no longer bundled in the plugin jar (JS-2714 / SC-49784).
 * <p>
 * This is a separate class from {@link SonarLintEmbeddedNode} - rather than two constructors on one
 * {@code @ScannerSide @SonarLintSide} class - because a constructor referencing {@link ResourceFetcher} makes the
 * whole class unloadable via reflection wherever that type isn't on the classpath, which is always the case for
 * SonarLint.
 */
@ScannerSide
public class ScannerEmbeddedNode extends EmbeddedNode {

  private static final String PLUGIN_KEY = "javascript";

  private final ResourceFetcher resourceFetcher;

  public ScannerEmbeddedNode(
    ProcessWrapper processWrapper,
    Environment env,
    ResourceFetcher resourceFetcher
  ) {
    super(processWrapper, env);
    this.resourceFetcher = resourceFetcher;
  }

  @Override
  protected InputStream openResource(String resourcePath) throws IOException {
    return Files.newInputStream(resourceFetcher.fetch(PLUGIN_KEY, resourcePath));
  }
}
