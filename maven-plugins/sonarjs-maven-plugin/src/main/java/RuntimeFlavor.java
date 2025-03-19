/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
public class RuntimeFlavor {

  private String name;
  private String url;
  private String checksum;
  private String binaryName;
  private String proxyUrl;

  public void setName(String name) {
    this.name = name;
  }

  public String getName() {
    return name;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public String getUrl() {
    return url;
  }

  public void setChecksum(String checksum) {
    this.checksum = checksum;
  }

  public String getChecksum() {
    return checksum;
  }

  public void setBinaryName(String binaryName) {
    this.binaryName = binaryName;
  }

  public String getBinaryName() {
    return binaryName;
  }

  public void setProxyUrl(String proxyUrl) {
    this.proxyUrl = proxyUrl;
  }

  public String getProxyUrl() {
    return proxyUrl;
  }
}
