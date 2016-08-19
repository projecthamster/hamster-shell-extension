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
    Extends: Gtk.VBox,

    _init : function(params) {
        this.parent(params);
        this.margin = 10;

        this._settings = Convenience.getSettings();

        let vbox, label;


        label = new Gtk.Label();
        label.set_markup("<b>Positioning</b>");
        label.set_alignment(0, 0.5);
        this.add(label);

        vbox = new Gtk.VBox({margin: 10});
        this.add(vbox);

        let placementOptions = new Gtk.ListStore();
        placementOptions.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

        placementOptions.set(placementOptions.append(), [0, 1], ["Default", 0]);
        placementOptions.set(placementOptions.append(), [0, 1], ["Replace calendar", 1]);
        placementOptions.set(placementOptions.append(), [0, 1], ["Replace activities", 2]);

        let placementCombo = new Gtk.ComboBox({model: placementOptions});

        let renderer = new Gtk.CellRendererText();
        placementCombo.pack_start(renderer, true);
        placementCombo.add_attribute(renderer, 'text', 0);
        placementCombo.connect('changed', Lang.bind(this, this._onPlacementChange));
        placementCombo.set_active(this._settings.get_int("panel-placement"));

        vbox.add(placementCombo);


        label = new Gtk.Label({margin_top: 20});
        label.set_markup("<b>Appearance in panel</b>");
        label.set_alignment(0, 0.5);
        this.add(label);

        vbox = new Gtk.VBox({margin: 10});
        this.add(vbox);

        let appearanceOptions = new Gtk.ListStore();
        appearanceOptions.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Label", 0]);
        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Icon", 1]);
        appearanceOptions.set(appearanceOptions.append(), [0, 1], ["Label and icon", 2]);

        let appearanceCombo = new Gtk.ComboBox({model: appearanceOptions});

        let renderer = new Gtk.CellRendererText();
        appearanceCombo.pack_start(renderer, true);
        appearanceCombo.add_attribute(renderer, 'text', 0);
        appearanceCombo.connect('changed', Lang.bind(this, this._onAppearanceChange));
        appearanceCombo.set_active(this._settings.get_int("panel-appearance"));

        vbox.add(appearanceCombo);


        label = new Gtk.Label({margin_top: 20});
        label.set_markup("<b>Global hotkey</b>");
        label.set_alignment(0, 0.5);
        this.add(label);

        vbox = new Gtk.VBox({margin: 10});
        this.add(vbox);
        let entry = new Gtk.Entry({margin_bottom: 10,
                                   margin_top: 5,
                                   text: this._settings.get_strv("show-hamster-dropdown")[0]});
        vbox.add(entry);
        entry.connect('changed', Lang.bind(this, this._onHotkeyChange));

        vbox.add(new Gtk.Label({label: "Reload gnome shell after updating prefs (alt+f2 > r)",
                                margin_top: 70}));
    },

    _onPlacementChange: function(widget) {
        let [success, iter] = widget.get_active_iter();
        if (!success)
            return;

        let newPlacement = widget.get_model().get_value(iter, 1);

        if (this._settings.get_int("panel-placement") == newPlacement)
            return;

        this._settings.set_int("panel-placement", newPlacement);
    },

    _onAppearanceChange: function(widget) {
        let [success, iter] = widget.get_active_iter();
        if (!success)
            return;

        let newAppearance = widget.get_model().get_value(iter, 1);

        if (this._settings.get_int("panel-appearance") == newAppearance)
            return;

        this._settings.set_int("panel-appearance", newAppearance);
    },

    _onHotkeyChange: function(widget, bananas) {
        //global.log(widget, bananas);
        let hotkey = widget.get_text();
        let [key, mods] = Gtk.accelerator_parse(hotkey);

        if (key != 0) {
            let parsedName = Gtk.accelerator_name(key, mods);
            this._settings.set_strv("show-hamster-dropdown", [parsedName]);
        }

    }
});

function init() {

}

function buildPrefsWidget() {
    let widget = new HamsterSettingsWidget();
    widget.show_all();

    return widget;
}
