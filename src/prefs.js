const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const HamsterSettingsWidget = new GObject.Class({
    Name: 'ProjectHamster.Prefs.HamsterSettingsWidget',
    GTypeName: 'HamsterSettingsWidget',
    Extends: Gtk.Grid,

    _init : function(params) {
        this.parent(params);
        this.column_spacing = 10;
        this.margin = 10;

        this._settings = Convenience.getSettings();

        let top = 1;
        let radio = null;
    },

    _updateSensitivity: function(widget, active) {
        for (let i = 0; i < widget._extra.length; i++)
            widget._extra[i].sensitive = active;
    },
});

function init() {

}

function buildPrefsWidget() {
    let widget = new HamsterSettingsWidget();
    widget.show_all();

    return widget;
}
