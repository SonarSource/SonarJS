#!/bin/sh
mvn org.codehaus.mojo:license-maven-plugin:aggregate-add-third-party -Dlicense.includedScopes=compile

cat target/generated-sources/license/THIRD-PARTY.txt
