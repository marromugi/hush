#!/bin/sh
# Builds the web pages and puts them where the app bundles them from. The app
# shows the diary's editor from them. Run it before building the app, and
# again after the editor changes.
set -eu

root=$(cd "$(dirname "$0")/../.." && pwd)

cd "$root"
pnpm build
rm -rf apple/Web
cp -R dist apple/Web
