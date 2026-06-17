plugins {
  base
}

val skipDiffsit = project.findProperty("skipDiffsit")?.toString()?.toBoolean() ?: false

tasks.register<Exec>("compileDiffsit") {
  group = "build"
  description = "Compiles diffsit."
  inputs.files("src/", "Cargo.toml", "Cargo.lock")
  outputs.files("target/release/diffsit")
  commandLine("cargo", "build", "--release")
}

tasks.named("assemble") {
  dependsOn("compileDiffsit")
}

tasks.register<Exec>("testDiffsit") {
  group = "check"
  description = "Runs the diffsit tests."
  inputs.files("src/", "Cargo.toml", "Cargo.lock")
  outputs.upToDateWhen { true }
  commandLine("cargo", "test")

  onlyIf {
    !project.gradle.startParameter.excludedTaskNames.contains("test")
  }
}

tasks.named("check") {
  dependsOn("testDiffsit")
}

tasks.register<Exec>("checkDiffsitFormat") {
  group = "Verification"
  description = "Checks the diffsit code formatting."
  inputs.files("src/", "Cargo.toml", "Cargo.lock")
  outputs.upToDateWhen { true }
  commandLine("cargo", "fmt", "--", "--check")
}

tasks.register("checkDiffsitLicense") {
  description = "Checks the diffsit code license headers."
  group = "Verification"

  val rustFiles = fileTree(".") {
    include("src/**/*.rs")
  }.toList()

  val licenseHeaderFile = rootDir.resolve("license-header.txt")
  doLast {
    if (!licenseHeaderFile.exists()) {
      throw GradleException("License header file not found: ${licenseHeaderFile.path}")
    }

    val expectedHeader = licenseHeaderFile.readText().trim()

    val headerMismatches = rustFiles.filter { !it.readText().trimStart().startsWith(expectedHeader) }
    if (headerMismatches.isNotEmpty()) {
      headerMismatches.forEach { println("Missing or incorrect license header in: ${it.path}") }
      throw GradleException("Some Rust files are missing the correct license header.")
    }
  }
}

tasks.register<Exec>("coverageDiffsit") {
  group = "Verification"
  description = "Generates the diffsit code coverage report."
  inputs.files("src/", "Cargo.toml", "Cargo.lock")
  outputs.files("target/llvm-cov-target/coverage.lcov")
  commandLine("cargo", "llvm-cov", "--lcov", "--output-path", "target/llvm-cov-target/coverage.lcov")
}

tasks.register<Exec>("clippyDiffsit") {
  group = "Verification"
  description = "Runs Clippy lints on the diffsit code."
  inputs.files("src/", "Cargo.toml", "Cargo.lock")
  val outputFile = layout.buildDirectory.file("reports/clippy_report.json").get().asFile
  outputs.file(outputFile)
  commandLine("cargo", "clippy", "--release", "--message-format", "json")

  doFirst {
    outputFile.parentFile.mkdirs()
    standardOutput = outputFile.outputStream()
  }
}

tasks.register<Exec>("cleanDiffsit") {
  description = "Cleans the diffsit build artifacts."
  group = "build"
  commandLine("cargo", "clean")
}

tasks.named("clean") {
  dependsOn("cleanDiffsit")
}

if (skipDiffsit) {
  logger.lifecycle("Skipping :diffsit project (skipDiffsit=true)")
  tasks.configureEach {
    enabled = false
  }
}
