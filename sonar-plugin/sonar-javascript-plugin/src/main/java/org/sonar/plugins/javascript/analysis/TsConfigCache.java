package org.sonar.plugins.javascript.analysis;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

public interface TsConfigCache extends TsConfigProvider.Provider {
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
}
