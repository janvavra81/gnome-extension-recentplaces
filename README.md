# Places + Recent Indicator

GNOME Shell extension — a folder icon in the top panel that opens a menu with two sections:

1. **Bookmarked folders** — Nautilus bookmarks (`~/.config/gtk-3.0/bookmarks`); clicking one opens it in Nautilus.
2. **Recent files** — the most recently added entries from `~/.local/share/recently-used.xbel` (max. 10, existing local files only):
   - **left click** — opens the file in its default application,
   - **right click** — opens the file's folder in Nautilus (the file is highlighted there).

Every item has an icon (folders get a folder icon, files get a symbolic icon based on their MIME type). The menu contents are reloaded every time it's opened, so they're always up to date. The extension has no settings.

UUID: `recentplaces@janvavra81`, license GPL-2.0-or-later.

## Project layout

GNOME 45 switched to ES modules, which aren't backwards compatible, so there are two variants
with identical functionality (both need to be updated when making changes):

```
gnome43/   variant for GNOME Shell 43–44 (legacy imports)
gnome45/   variant for GNOME Shell 45–49 (ESM)
po/        translations (gettext, domain "recentplaces")
build.sh   builds both zips for upload into dist/
```

## Building the packages

```bash
./build.sh
```

Produces two zips in `dist/` (`…gnome-43-44.zip` and `…gnome-45-49.zip`), including compiled translations.

## Uploading to extensions.gnome.org

1. Log in at https://extensions.gnome.org/
2. Open https://extensions.gnome.org/upload/
3. Upload **both** zips from `dist/` (one at a time) — they share the same UUID,
   so e.g.o. serves the right one based on the visitor's GNOME Shell version.
4. Wait for reviewer approval (can take days to weeks); any review comments
   arrive by e-mail and show up on the extension page once logged in.

## Local installation (GNOME 43)

```bash
ln -sfn "$(pwd)/gnome43" ~/.local/share/gnome-shell/extensions/recentplaces@janvavra81
msgfmt po/cs.po -o gnome43/locale/cs/LC_MESSAGES/recentplaces.mo
gnome-extensions enable recentplaces@janvavra81
```

After the first install (or any code change) you need to log out and back in — on Wayland the shell can't be restarted while running.

## Testing without logging out

```bash
dbus-run-session -- gnome-shell --nested --wayland
```
