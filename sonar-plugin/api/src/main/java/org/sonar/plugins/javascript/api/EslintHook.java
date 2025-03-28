package org.sonar.plugins.javascript.api;

import java.util.Collections;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;

/**
 * Descriptor for a hook into the ES Linter.
 */
public interface EslintHook {
  /**
   * Key for the hook to be executed on JS side.
   */
  String eslintKey();

  default List<Object> configurations() {
    return Collections.emptyList();
  }

  default List<InputFile.Type> targets() {
    return List.of(InputFile.Type.MAIN);
  }

  default List<AnalysisMode> analysisModes() {
    return List.of(AnalysisMode.DEFAULT);
  }

  default List<String> blacklistedExtensions() {
    return Collections.emptyList();
  }

  /**
   * Whether the hook should be executed on JS side.
   */
  default boolean isEnabled() {
    return true;
  }
}
