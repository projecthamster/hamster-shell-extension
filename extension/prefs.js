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


import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


class HotkeyRow extends Adw.EntryRow {
  static {
    GObject.registerClass(this);
  }

  constructor({ title, settings, bind }) {
    super({
      title: title,
    });

    this.connect("apply", () => {
      const hotkeys = this.get_text();

      const mappings = hotkeys.split(",").map((x) => {
        const [, key, mods] = Gtk.accelerator_parse(x);
        return Gtk.accelerator_valid(key, mods) && Gtk.accelerator_name(key, mods);
      });

      if (mappings.every((x) => !!x)) {
	console.log("HotkeyRow: good hotkey value ", hotkeys);
	this.current = mappings;
	settings.set_strv(bind, this.current);
      } else {
	console.log("invalid hotkey value ", hotkeys);
	this.set_text(this.current.join(","));
      }
    });

    this.show_apply_button = true,
    this.current = settings.get_strv(bind);
    console.log("HotkeyRow current: ", bind, this.current);
    this.set_text(this.current.join(","));
  }
}

class HamsterPrefsWidget extends Adw.PreferencesPage {

  static {
    GObject.registerClass(this);
  }

  constructor(settings) {
    super();
    this._settings = settings;

    this._actionGroup = new Gio.SimpleActionGroup();
    this.insert_action_group('hamster', this._actionGroup);
    this._actionGroup.add_action(
      this._settings.create_action('panel-placement'));
    this._actionGroup.add_action(
      this._settings.create_action('panel-appearance'));

    const placementGroup = new Adw.PreferencesGroup({
      title: _('Panel Placement'),
    });
    this.add(placementGroup);

    const placements = [
      { p: 0, title: _("Default") },
      { p: 1, title: _("Replace calendar") },
      { p: 2, title: _("Replace activities") },
      { p: 3, title: _("Center, next to calendar") },
    ];

    for (const {p, title} of placements) {
      const btn = new Gtk.CheckButton({
	action_name:   'hamster.panel-placement',
	action_target: new GLib.Variant('i', p),
      });
      const row = new Adw.ActionRow({
	activatable_widget: btn,
	title,
      });
      row.add_prefix(btn);
      placementGroup.add(row);
    }

    const appearanceGroup = new Adw.PreferencesGroup({
      title: _('Panel Appearance'),
    });
    this.add(appearanceGroup);

    const appearances = [
      { a: 0, title: _("Label") },
      { a: 1, title: _("Icon") },
      { a: 2, title: _("Label and icon") },
    ];

    for (const {a, title} of appearances) {
      const btn = new Gtk.CheckButton({
	action_name:   'hamster.panel-appearance',
	action_target: new GLib.Variant('i', a),
      });
      const row = new Adw.ActionRow({
	activatable_widget: btn,
	title,
      });
      row.add_prefix(btn);
      appearanceGroup.add(row);
    }

    const miscGroup = new Adw.PreferencesGroup();
    this.add(miscGroup);

    let row = new HotkeyRow({
      title: _("Global hotkey"),
      settings: this._settings,
      bind: "show-hamster-dropdown",
    });

    miscGroup.add(row);
  }
}

export default class HamsterPrefs extends ExtensionPreferences {
    getPreferencesWidget() {
      return new HamsterPrefsWidget(this.getSettings());
    }
}
