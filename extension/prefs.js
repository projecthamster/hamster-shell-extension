/*
This file is part of 'hamster-shell-extension'.

'hamster-shell-extension' is free software: you can redistribute it and/or
modify it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

'hamster-shell-extension' is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with 'hamster-shell-extension'.  If not, see <http://www.gnu.org/licenses/>.

Copyright (c) 2011 Jerome Oufella <jerome@oufella.com>
Copyright (c) 2011-2012 Toms Baugis <toms.baugis@gmail.com>
Icons Artwork Copyright (c) 2012 Reda Lazri <the.red.shortcut@gmail.com>
Copyright (c) 2016 - 2018 Eric Goller / projecthamster <elbenfreund@projecthamster.org>
*/


const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const ExtensionUtils = imports.misc.extensionUtils;

const HamsterSettingsWidget = GObject.registerClass(
class HamsterSettingsWidget extends Gtk.Grid {
    _init(params) {
        super._init(params);

        this.name = 'ProjectHamster.Prefs.HamsterSettingsWidget';

        this.set_margin_bottom(18);
        this.set_margin_end(18);
        this.set_margin_start(18);
        this.set_margin_top(18);
        this.set_column_spacing(12);
        this.set_row_spacing(12);
        this.visible = true;

        this._settings = ExtensionUtils.getSettings();

        let label = new Gtk.Label({
            label: "Positioning:",
            halign: Gtk.Align.START,
            visible: true
        });
        this.attach(label, 0, 0, 1, 1);

        let placementOptions = new Gtk.ListStore();
        placementOptions.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

        placementOptions.set(placementOptions.append(), [0, 1], ["Default", 0]);
        placementOptions.set(placementOptions.append(), [0, 1], ["Replace calendar", 1]);
        placementOptions.set(placementOptions.append(), [0, 1], ["Replace activities", 2]);
        placementOptions.set(placementOptions.append(), [0, 1], ["Center, next to calendar", 3]);

        let placementCombo = new Gtk.ComboBox({
            model: placementOptions,
            visible: true
        });

        let placementComboRenderer = new Gtk.CellRendererText();
        placementCombo.pack_start(placementComboRenderer, true);
        placementCombo.add_attribute(placementComboRenderer, 'text', 0);
        placementCombo.connect('changed', this._onPlacementChange.bind(this));
        placementCombo.set_active(this._settings.get_int("panel-placement"));
        this.attach(placementCombo, 1, 0, 1, 1);

        label = new Gtk.Label({
            label: "Appearance in panel:",
            halign: Gtk.Align.START,
            visible: true
        });
        this.attach(label, 0, 1, 1, 1);

        let appearanceOptions = new Gtk.ListStore();
        appearanceOptions.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Label", 0]);
        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Icon", 1]);
        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Label and icon", 2]);

        let appearanceCombo = new Gtk.ComboBox({
            model: appearanceOptions,
            visible: true
        });

        let appearanceComboRenderer = new Gtk.CellRendererText();
        appearanceCombo.pack_start(appearanceComboRenderer, true);
        appearanceCombo.add_attribute(appearanceComboRenderer, 'text', 0);
        appearanceCombo.connect('changed', this._onAppearanceChange.bind(this));
        appearanceCombo.set_active(this._settings.get_int("panel-appearance"));
        this.attach(appearanceCombo, 1, 1, 1, 1);

        label = new Gtk.Label({
            label: "Global hotkey:",
            halign: Gtk.Align.START,
            visible: true
        });
        this.attach(label, 0, 2, 1, 1);

        let entry = new Gtk.Entry({
            margin_bottom: 10,
            margin_top: 5,
            text: this._settings.get_strv("show-hamster-dropdown")[0],
            visible: true
        });
        entry.connect('changed', this._onHotkeyChange.bind(this));
        this.attach(entry, 1, 2, 1, 1);

        label = new Gtk.Label({
            label: "Reload gnome shell after updating prefs (alt+f2 > r)",
            halign: Gtk.Align.CENTER,
            visible: true,
            margin_top: 70
        });
        this.attach(label, 0, 3, 2, 1);

    }

    _onPlacementChange(widget) {
        let [success, iter] = widget.get_active_iter();
        if (!success)
            return;

        let newPlacement = widget.get_model().get_value(iter, 1);

        if (this._settings.get_int("panel-placement") == newPlacement)
            return;

        this._settings.set_int("panel-placement", newPlacement);
    }

    _onAppearanceChange(widget) {
        let [success, iter] = widget.get_active_iter();
        if (!success)
            return;

        let newAppearance = widget.get_model().get_value(iter, 1);

        if (this._settings.get_int("panel-appearance") == newAppearance)
            return;

        this._settings.set_int("panel-appearance", newAppearance);
    }

    _onHotkeyChange(widget, bananas) {
        let hotkey = widget.get_text();
        let [key, mods] = [null, null];

        if (Gtk.MAJOR_VERSION >= 4) {
            let _r = null;
            [_r, key, mods] = Gtk.accelerator_parse(hotkey);
        } else {
            [key, mods] = Gtk.accelerator_parse(hotkey);
        }

        if (key != 0) {
            let parsedName = Gtk.accelerator_name(key, mods);
            this._settings.set_strv("show-hamster-dropdown", [parsedName]);
        }

    }
});

function init() {
}

function buildPrefsWidget() {
    return new HamsterSettingsWidget();
}
