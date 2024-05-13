package org.sonar.plugins.javascript.api;

import org.sonar.api.scanner.ScannerSide;

@ScannerSide
public interface JsFileConsumer {

  void consume(JsFile jsFile);

  void done();
}
