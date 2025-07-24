#!/bin/bash

default_actual_dir="packages/ruling/actual/jsts"

expected_dir="its/ruling/src/test/expected/jsts"
actual_dir="${1:-$default_actual_dir}"

# Differing files
diff -rq "$expected_dir" "$actual_dir" | grep "differ" | while read -r line; do
    file1=$(echo "$line" | awk '{print $2}')
    file2=$(echo "$line" | awk '{print $4}')
    echo "Differences in: $file1"
    diff -u "$file1" "$file2"
    echo "----------------------------------------"
done

# Files only in one directory
diff -rq "$expected_dir" "$actual_dir" | grep "Only in" | while read -r line; do
    dir=$(echo "$line" | awk '{print $3}' | sed 's/://')
    file=$(echo "$line" | awk '{print $4}')
    full_path="$dir/$file"
    if [ -f "$full_path" ]; then
      echo "File only in $dir: $file"
      cat "$full_path"
      echo "----------------------------------------"
    fi
done
