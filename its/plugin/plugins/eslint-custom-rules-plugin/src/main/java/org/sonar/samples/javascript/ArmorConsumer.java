package org.sonar.samples.javascript;


import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.JsFileConsumer;

@ScannerSide
public class ArmorConsumer implements JsFileConsumer {

  @Override
  public void consume(JsFile jsFile) {
    // do something with jsFile
    System.out.println("Consumer: " + jsFile.getInputFile());
  }

  @Override
  public void done() {
    // do something when all files are consumed
  }
}
