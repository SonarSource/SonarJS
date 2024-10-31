package org.sonar.plugins.javascript.sonarlint;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.analysis.TsConfigOrigin;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

public interface TsConfigCache {
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
  void initializeWith(List<String> tsConfigs, TsConfigOrigin origin);
  List<String> listCachedTsConfigs(TsConfigOrigin origin);
  void setOrigin(TsConfigOrigin origin);

  void setProjectSize(int projectSize);
  int getProjectSize();
}
