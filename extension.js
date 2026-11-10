import GObject from 'gi://GObject';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const ClipIndicator = GObject.registerClass(
class ClipIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Clip History');
        this.add_child(new St.Icon({
            icon_name: 'edit-paste-symbolic',
            style_class: 'system-status-icon',
        }));

        this._history = [];
        this._clipboard = St.Clipboard.get_default();
        this._rebuild();

        this._selection = global.display.get_selection();
        this._ownerId = this._selection.connect('owner-changed', (_sel, type) => {
            if (type !== Meta.SelectionType.SELECTION_CLIPBOARD)
                return;
            this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (_c, text) => {
                if (text && text.trim())
                    this._add(text);
            });
        });
    }

    _add(text) {
        this._history = this._history.filter(t => t !== text);
        this._history.unshift(text);
        this._history.length = Math.min(this._history.length, 10);
        this._rebuild();
    }

    _rebuild() {
        this.menu.removeAll();

        if (this._history.length === 0) {
            const empty = new PopupMenu.PopupMenuItem('Clipboard history is empty');
            empty.setSensitive(false);
            this.menu.addMenuItem(empty);
            return;
        }

        for (const text of this._history) {
            let label = text.replace(/\s+/g, ' ').trim();
            if (label.length > 50)
                label = label.slice(0, 50) + '…';

            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => {
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
            });
            this.menu.addMenuItem(item);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const clear = new PopupMenu.PopupMenuItem('Clear history');
        clear.connect('activate', () => {
            this._history = [];
            this._rebuild();
        });
        this.menu.addMenuItem(clear);
    }

    destroy() {
        this._selection.disconnect(this._ownerId);
        super.destroy();
    }
});

export default class ClipHistoryExtension extends Extension {
    enable() {
        this._indicator = new ClipIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._settings = this.getSettings();
        Main.wm.addKeybinding(
            'toggle-menu',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._indicator.menu.toggle()
        );
    }

    disable() {
        Main.wm.removeKeybinding('toggle-menu');
        this._settings = null;
        this._indicator?.destroy();
        this._indicator = null;
    }
}