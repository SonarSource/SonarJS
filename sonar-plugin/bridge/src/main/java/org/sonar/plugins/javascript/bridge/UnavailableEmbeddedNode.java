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

import java.io.InputStream;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;

/**
 * Scanner-side embedded Node.js runtime for hosts whose Plugin API doesn't provide
 * {@code org.sonar.api.scanner.ResourceFetcher} (older SonarQube/scanner versions): the on-demand resources ZIP
 * (JS-2714 / SC-49784) can't be reached there, so no embedded runtime is available and the analysis falls back to
 * the host Node.js, exactly as for an unsupported platform.
 * <p>
 * Kept separate from {@link ScannerEmbeddedNode}, whose constructor references {@code ResourceFetcher} and thus can't
 * even be introspected by the dependency injection container when that type is missing.
 */
@ScannerSide
public class UnavailableEmbeddedNode extends EmbeddedNode {

  public UnavailableEmbeddedNode(ProcessWrapper processWrapper, Environment env) {
    super(processWrapper, env);
  }

  @Override
  protected InputStream openResource(String resourcePath) {
    return null;
  }
}
