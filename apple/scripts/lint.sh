#!/bin/sh
# Lints the Swift of the app's own code, leaving out the generated bindings.
set -eu
cd "$(dirname "$0")/.."
swift format lint --strict --recursive \
  Hush Packages/Modules/Package.swift \
  Packages/Modules/Sources/CoreEntrance Packages/Modules/Sources/Features
