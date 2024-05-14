package org.sonar.plugins.javascript.api;

import org.sonar.api.batch.fs.InputFile;

public record JsFile(InputFile inputFile, String ast) {




}
