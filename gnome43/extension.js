/* Places + Recent Indicator – Nautilus bookmarks and recent files
 * in the top panel.
 *
 * Variant for GNOME Shell 43–44 (legacy import system).
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { Clutter, Gio, GLib, GObject, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const _ = ExtensionUtils.gettext;

const MAX_RECENT_ITEMS = 10;

Gio._promisify(Gio.File.prototype, 'load_contents_async', 'load_contents_finish');

/* Reads a file asynchronously so the shell's main loop isn't blocked. */
async function _loadTextFile(path) {
    try {
        const file = Gio.File.new_for_path(path);
        const [contents] = await file.load_contents_async(null);
        return new TextDecoder().decode(contents);
    } catch (e) {
        return null;
    }
}

function _unescapeXml(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&amp;/g, '&');
}

/* Nautilus bookmarks from ~/.config/gtk-3.0/bookmarks – "URI [label]" lines. */
async function _getBookmarks() {
    const path = GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-3.0', 'bookmarks']);
    const text = await _loadTextFile(path);
    if (text === null)
        return [];

    const bookmarks = [];
    for (const line of text.split('\n')) {
        const entry = line.trim();
        if (entry === '')
            continue;

        const space = entry.indexOf(' ');
        const uri = space === -1 ? entry : entry.slice(0, space);
        const label = space === -1 ? null : entry.slice(space + 1).trim();

        const file = Gio.File.new_for_uri(uri);
        const isLocal = file.get_uri_scheme() === 'file';
        if (isLocal && !file.query_exists(null))
            continue;

        bookmarks.push({
            uri,
            name: label || file.get_basename() || uri,
            icon: isLocal ? 'folder-symbolic' : 'folder-remote-symbolic',
        });
    }
    return bookmarks;
}

/* Recent files from ~/.local/share/recently-used.xbel, sorted by the date
 * they were added; only existing local files are listed. */
async function _getRecentFiles() {
    const path = GLib.build_filenamev([GLib.get_user_data_dir(), 'recently-used.xbel']);
    const text = await _loadTextFile(path);
    if (text === null)
        return [];

    const entries = [];
    const bookmarkRe = /<bookmark\b([^>]*)>([\s\S]*?)<\/bookmark>/g;
    let match;
    while ((match = bookmarkRe.exec(text)) !== null) {
        const attrs = match[1];
        const body = match[2];

        const href = attrs.match(/href="([^"]*)"/);
        if (!href)
            continue;
        const uri = _unescapeXml(href[1]);
        if (!uri.startsWith('file://'))
            continue;

        const added = attrs.match(/added="([^"]*)"/);
        const mime = body.match(/<mime:mime-type\s+type="([^"]*)"/);

        entries.push({
            uri,
            added: added ? Date.parse(added[1]) || 0 : 0,
            mime: mime ? _unescapeXml(mime[1]) : null,
        });
    }

    entries.sort((a, b) => b.added - a.added);

    const result = [];
    const seen = new Set();
    for (const entry of entries) {
        if (result.length >= MAX_RECENT_ITEMS)
            break;
        if (seen.has(entry.uri))
            continue;
        seen.add(entry.uri);

        const file = Gio.File.new_for_uri(entry.uri);
        if (!file.query_exists(null))
            continue;

        result.push({
            uri: entry.uri,
            name: file.get_basename() || entry.uri,
            gicon: entry.mime
                ? Gio.content_type_get_symbolic_icon(entry.mime)
                : Gio.ThemedIcon.new('text-x-generic-symbolic'),
        });
    }
    return result;
}

function _launchUri(uri) {
    try {
        Gio.AppInfo.launch_default_for_uri(uri, global.create_app_launch_context(0, -1));
    } catch (e) {
        logError(e, `[recentplaces] failed to open ${uri}`);
    }
}

/* Opens the file's folder in the file manager; the FileManager1 D-Bus call
 * highlights the file directly, on failure at least the parent directory
 * is opened. */
function _showInFileManager(uri) {
    Gio.DBus.session.call(
        'org.freedesktop.FileManager1',
        '/org/freedesktop/FileManager1',
        'org.freedesktop.FileManager1',
        'ShowItems',
        new GLib.Variant('(ass)', [[uri], '']),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection, res) => {
            try {
                connection.call_finish(res);
            } catch (e) {
                const parent = Gio.File.new_for_uri(uri).get_parent();
                if (parent !== null)
                    _launchUri(parent.get_uri());
            }
        });
}

const PlacesRecentIndicator = GObject.registerClass(
class PlacesRecentIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Places + Recent Indicator');

        this.add_child(new St.Icon({
            icon_name: 'folder-symbolic',
            style_class: 'system-status-icon',
        }));

        this._rebuildGeneration = 0;
        this._openStateId = this.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._rebuildMenu().catch(logError);
        });

        /* An empty menu never opens (PopupMenu.open() bails out on
         * isEmpty()), so open-state-changed would never fire – the menu
         * must be populated right away. */
        this._rebuildMenu().catch(logError);
    }

    async _rebuildMenu() {
        /* Discard the result if a newer rebuild was started meanwhile
         * (e.g. the menu was closed and reopened before the file reads
         * finished). */
        const generation = ++this._rebuildGeneration;
        const [bookmarks, recentFiles] = await Promise.all([_getBookmarks(), _getRecentFiles()]);
        if (generation !== this._rebuildGeneration)
            return;

        this.menu.removeAll();

        for (const bookmark of bookmarks) {
            const item = new PopupMenu.PopupImageMenuItem(bookmark.name, bookmark.icon);
            item.connect('activate', () => _launchUri(bookmark.uri));
            this.menu.addMenuItem(item);
        }
        if (bookmarks.length === 0)
            this._addPlaceholder(_('No bookmarked folders'));

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_('Recent Files')));

        for (const recent of recentFiles) {
            const item = new PopupMenu.PopupImageMenuItem(recent.name, recent.gicon);
            item.connect('activate', (_actor, event) => {
                const rightClick =
                    event.type() === Clutter.EventType.BUTTON_RELEASE &&
                    event.get_button() === Clutter.BUTTON_SECONDARY;
                if (rightClick)
                    _showInFileManager(recent.uri);
                else
                    _launchUri(recent.uri);
            });
            this.menu.addMenuItem(item);
        }
        if (recentFiles.length === 0)
            this._addPlaceholder(_('No recent files'));
    }

    _addPlaceholder(text) {
        const item = new PopupMenu.PopupMenuItem(text);
        item.setSensitive(false);
        this.menu.addMenuItem(item);
    }

    destroy() {
        if (this._openStateId) {
            this.menu.disconnect(this._openStateId);
            this._openStateId = null;
        }
        super.destroy();
    }
});

let indicator = null;

function init() {
    ExtensionUtils.initTranslations();
}

function enable() {
    indicator = new PlacesRecentIndicator();
    Main.panel.addToStatusArea('places-recent-indicator', indicator);
}

function disable() {
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
    }
}
