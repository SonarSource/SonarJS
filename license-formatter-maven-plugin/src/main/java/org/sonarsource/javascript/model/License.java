package org.sonarsource.javascript.model;

import jakarta.xml.bind.annotation.*;

@XmlAccessorType(XmlAccessType.FIELD)
public class License {

  private String file;

  public String getFile() {
    return file;
  }
}
