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

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * SonarLint-side embedded Node.js runtime. SonarLint doesn't implement the Plugin API's {@code ResourceFetcher}
 * yet (JS-2714 / SC-49784), so as an interim measure this looks the runtime up directly on disk instead, next to
 * the plugin jar, mirroring the on-demand resources ZIP's own layout: {@code <extracted-root>/plugin/<this-jar>.jar}
 * and {@code <extracted-root>/resources/<platform>/...} are siblings. Replace this filesystem lookup with
 * {@code ResourceFetcher} once SonarLint supports it.
 */
@SonarLintSide(lifespan = INSTANCE)
public class SonarLintEmbeddedNode extends EmbeddedNode {

  private static final Logger LOG = LoggerFactory.getLogger(SonarLintEmbeddedNode.class);
  private static final String RESOURCES_DIRECTORY = "resources";

  private final Path resourcesRoot;

  public SonarLintEmbeddedNode(ProcessWrapper processWrapper, Environment env) {
    this(processWrapper, env, resourcesRootNextToPluginJar());
  }

  SonarLintEmbeddedNode(
    ProcessWrapper processWrapper,
    Environment env,
    @Nullable Path resourcesRoot
  ) {
    super(processWrapper, env);
    this.resourcesRoot = resourcesRoot;
  }

  @Override
  protected InputStream openResource(String resourcePath) throws IOException {
    if (resourcesRoot == null) {
      return null;
    }
    var path = resourcesRoot.resolve(resourcePath);
    return Files.exists(path) ? Files.newInputStream(path) : null;
  }

  private static Path resourcesRootNextToPluginJar() {
    try {
      var codeSource = SonarLintEmbeddedNode.class.getProtectionDomain().getCodeSource();
      if (codeSource == null) {
        return null;
      }
      var pluginJar = Path.of(codeSource.getLocation().toURI());
      var pluginDirectory = pluginJar.getParent();
      var extractedRoot = pluginDirectory == null ? null : pluginDirectory.getParent();
      return extractedRoot == null ? null : extractedRoot.resolve(RESOURCES_DIRECTORY);
    } catch (URISyntaxException | RuntimeException e) {
      LOG.debug(
        "Could not determine the plugin jar's on-disk location to look up the embedded Node.js runtime.",
        e
      );
      return null;
    }
  }
}
