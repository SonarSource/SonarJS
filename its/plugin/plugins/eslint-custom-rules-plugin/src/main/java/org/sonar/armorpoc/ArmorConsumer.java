package org.sonar.armorpoc;


import java.util.ArrayList;
import java.util.List;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.JsFileConsumer;

@ScannerSide
public class ArmorConsumer implements JsFileConsumer {

  List<JsFile> files = new ArrayList<>();
  boolean done;

  public boolean isDone() {
    return done;
  }

  public List<JsFile> getFiles() {
    return files;
  }

  @Override
  public void consume(JsFile jsFile) {
    // do something with jsFile
    System.out.println("ArmorConsumer: " + jsFile.inputFile());
    files.add(jsFile);
  }

  @Override
  public void done() {
    // do something when all files are consumed
    System.out.println("ArmorConsumer: analysis is done. Analyzed " + files.size() + " files");
    done = true;
  }
}
