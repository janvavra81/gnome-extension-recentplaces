#!/usr/bin/env bash
# Builds the two upload-ready zips for extensions.gnome.org into dist/:
#   - gnome43 variant (GNOME Shell 43-44, legacy imports)
#   - gnome45 variant (GNOME Shell 45+, ESM)
# Both share the same UUID; e.g.o. serves the right one per shell version.
set -euo pipefail
cd "$(dirname "$0")"

UUID="recentplaces@janvavra81"
DIST="$PWD/dist"
mkdir -p "$DIST"

build_variant() {
    local srcdir="$1" suffix="$2"
    local staging
    staging="$(mktemp -d)"
    cp "$srcdir/extension.js" "$srcdir/metadata.json" "$staging/"
    cp -r po "$staging/po"
    gnome-extensions pack --force --podir=po --out-dir "$DIST" "$staging"
    mv "$DIST/$UUID.shell-extension.zip" "$DIST/$UUID.$suffix.zip"
    rm -rf "$staging"
}

build_variant gnome43 "gnome-43-44"
build_variant gnome45 "gnome-45-49"

echo
echo "Hotovo – balíčky pro upload na extensions.gnome.org:"
ls -l "$DIST"/*.zip
