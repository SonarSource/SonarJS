#!/usr/bin/env bash

set -e

# set folder to eslint-bridge/
SCRIPT_FOLDER=$(cd $(dirname "$0"); pwd)
cd $SCRIPT_FOLDER/..

PACKAGE_FILENAME="target/classes/eslint-bridge-1.0.0.tgz"

# This value was decided with SonarLint
MAX_FILEPATH=120

LONGEST_FILEPATH=$(tar tfz $PACKAGE_FILENAME | awk '{print length($0), $0}' | sort -nr | head -n 1)
LONGEST_LENGTH=$(echo $LONGEST_FILEPATH | grep -o -E "^[0-9]+")

if [[ $LONGEST_LENGTH -gt $MAX_FILEPATH ]]
then
  echo "File length in generated $PACKAGE_FILENAME is longer than the accepted $MAX_FILEPATH characters"
	echo "File length is too long at ${LONGEST_LENGTH} characters in $LONGEST_FILEPATH"
	exit 1
else
	exit 0
fi
