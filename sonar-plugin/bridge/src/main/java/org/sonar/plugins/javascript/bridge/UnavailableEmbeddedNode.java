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

import java.io.InputStream;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * SonarLint-side embedded Node.js runtime: there is none. SonarLint relies on the host Node.js, provided through
 * the {@code sonar.nodejs.executable} option.
 */
@SonarLintSide(lifespan = INSTANCE)
public class UnavailableEmbeddedNode extends EmbeddedNode {

  public UnavailableEmbeddedNode(ProcessWrapper processWrapper, Environment env) {
    super(processWrapper, env);
  }

  @Override
  protected InputStream openResource(String resourcePath) {
    return null;
  }
}
