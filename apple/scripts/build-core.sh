#!/bin/sh
# Builds the Rust core for the Apple targets the app runs on, and writes
# what the Swift package needs: the XCFramework and the generated bindings.
# Run it before opening or building the app, and again after the core changes.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)
modules="$root/apple/Packages/Modules"
work="$root/target/apple"
targets="aarch64-apple-darwin aarch64-apple-ios aarch64-apple-ios-sim"

# Matches the app's deployment targets in apple/project.yml.
export MACOSX_DEPLOYMENT_TARGET=26.0
export IPHONEOS_DEPLOYMENT_TARGET=26.0

cd "$root"
for target in $targets; do
  cargo build --release --locked -p hush-ffi --target "$target"
done

rm -rf "$work"
mkdir -p "$work/headers"
cargo run --quiet --locked -p hush-ffi --features cli --bin uniffi-bindgen -- \
  generate --library "target/aarch64-apple-darwin/release/libhush_ffi.a" \
  --language swift --out-dir "$work/generated"
cp "$work/generated/hush_ffiFFI.h" "$work/headers/"
cp "$work/generated/hush_ffiFFI.modulemap" "$work/headers/module.modulemap"
cp "$work/generated/hush_ffi.swift" "$modules/Sources/CoreBindings/hush_ffi.swift"

rm -rf "$modules/Frameworks/HushFFI.xcframework"
set --
for target in $targets; do
  set -- "$@" -library "target/$target/release/libhush_ffi.a" -headers "$work/headers"
done
xcodebuild -create-xcframework "$@" -output "$modules/Frameworks/HushFFI.xcframework"
