package org.sonarsource.javascript.model;

import jakarta.xml.bind.annotation.*;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
public class Dependency {

  private String artifactId;

  @XmlElementWrapper(name = "licenses")
  @XmlElement(name = "license")
  private List<License> licenses;

  public String getArtifactId() {
    return artifactId;
  }

  public List<License> getLicenses() {
    return licenses;
  }
}
