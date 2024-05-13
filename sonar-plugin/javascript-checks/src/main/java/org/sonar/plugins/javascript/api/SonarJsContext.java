package org.sonar.plugins.javascript.api;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.sonar.api.scanner.ScannerSide;

@ScannerSide
public class SonarJsContext {

  public Collection<JsFile> getJsFiles() {
    return List.of(new JsFile(null, new JsFile.Node("Program", Map.of(), new JsFile.Location(1, 1, 1, 1))));
  }

}
