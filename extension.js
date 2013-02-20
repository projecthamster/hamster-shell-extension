/*
 * Simple Hamster extension for gnome-shell
 * Copyright (c) 2011 Jerome Oufella <jerome@oufella.com>
 * Copyright (c) 2011-2012 Toms Baugis <toms.baugis@gmail.com>
 * Icons Artwork Copyright (c) 2012 Reda Lazri <the.red.shortcut@gmail.com>
 *
 * Portions originate from the gnome-shell source code, Copyright (c)
 * its respectives authors.
 * This project is released under the GNU GPL License.
 * See COPYING for details.
 *
 */

// TODO - investigate usage of third party libs (d3/underscore/whatever)
//        otherwise even most primitive operations are hardcore

const Clutter = imports.gi.Clutter;
const Config = imports.misc.config;
const DBus = imports.dbus;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const Gettext = imports.gettext.domain('hamster-shell-extension');
const _ = Gettext.gettext;
const N_ = function(x) { return x; }

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Stuff = Me.imports.stuff;


// TODO - why are we not using dbus introspection here or something?
let ApiProxy = DBus.makeProxyClass({
    name: 'org.gnome.Hamster',
    methods: [
        {name: 'GetTodaysFacts', inSignature: '', outSignature: 'a(iiissisasii)'},
        {name: 'StopTracking', inSignature: 'i'},
        {name: 'Toggle', inSignature: ''},
        {name: 'AddFact', inSignature: 'siib', outSignature: 'i'},
        {name: 'GetActivities', inSignature: '', outSignature: 'a(ss)'},
    ],
    signals: [
        {name: 'TagsChanged', inSignature: ''},
        {name: 'FactsChanged', inSignature: ''},
        {name: 'ActivitiesChanged', inSignature: ''},
        {name: 'ToggleCalled', inSignature: ''},
    ]
});


let WindowsProxy = DBus.makeProxyClass({
    name: 'org.gnome.Hamster.WindowServer',
    methods: [
        {name: 'edit', inSignature: 'i'},
        {name: 'overview', inSignature: ''},
        {name: 'about', inSignature: ''},
        {name: 'statistics', inSignature: ''},
        {name: 'preferences', inSignature: ''},
    ]
});



/* a little box or something */
function HamsterBox() {
    this._init.apply(this, arguments);
}

HamsterBox.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(itemParams) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {reactive: false});

        let box = new St.BoxLayout({style_class: 'hamster-box'});
        box.set_vertical(true);

        let label = new St.Label({style_class: 'hamster-box-label'});
        label.set_text(_("What are you doing?"))
        box.add(label);

        this._textEntry = new St.Entry({name: 'searchEntry',
                                        can_focus: true,
                                        track_hover: false,
                                        hint_text: _("Enter activity...")});
        this._textEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
        this._textEntry.clutter_text.connect('key-release-event', Lang.bind(this, this._onKeyReleaseEvent));


        box.add(this._textEntry);

        // autocomplete popup - couldn't spark it up just yet
        //this._popup = new PopupMenu.PopupComboMenu(this._textEntry)

        label = new St.Label({style_class: 'hamster-box-label'});
        label.set_text(_("Todays activities"))
        box.add(label);

        let scrollbox = new St.ScrollView({style_class: 'hamster-scrollbox'});
        box.add(scrollbox);

        // Since St.Table does not implement StScrollable, we create a
        // container object that does.
        let container = new St.BoxLayout({});
        container.set_vertical(true);
        scrollbox.add_actor(container);

        this.activities = new St.Table({style_class: 'hamster-activities'})
        container.add(this.activities)

        this.summaryLabel = new St.Label({style_class: 'summary-label'});
        box.add(this.summaryLabel);


        this.addActor(box);

        this.autocompleteActivities = [];
        this.runningActivitiesQuery = null;

        this._prevText = "";
    },

    focus: function() {
        global.stage.set_key_focus(this._textEntry);
    },

    blur: function() {
        global.stage.set_key_focus(null);
    },

    _onEntryActivated: function() {
        this.emit('activate');
        this._textEntry.set_text('');
    },


    _getActivities: function() {
        if (this.runningActivitiesQuery)
            return this.autocompleteActivities

        this.runningActivitiesQuery = true;
        this.proxy.GetActivitiesRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            this.runningActivitiesQuery = false;
            this.autocompleteActivities = response;
        }));

        return this.autocompleteActivities;
    },

    _onKeyReleaseEvent: function(textItem, evt) {
        let symbol = evt.get_key_symbol();
        let text = this._textEntry.get_text().toLowerCase();

        // if nothing has changed or we still have selection then that means
        // that special keys are at play and we don't attempt to autocomplete
        if (this._prevText == text ||
            this._textEntry.clutter_text.get_selection()) {
            return;
        }
        this._prevText = text;

        // ignore deletions
        let ignoreKeys = [Clutter.BackSpace, Clutter.Delete, Clutter.Escape]
        for each (var key in ignoreKeys) {
            if (symbol == key)
                return;
        }


        let allActivities = this._getActivities();
        for each (var rec in allActivities) {
            if (rec[0].toLowerCase().substring(0, text.length) == text) {
                this.prevText = text;

                this._textEntry.set_text(rec[0]);
                this._textEntry.clutter_text.set_selection(text.length, rec[0].length)

                this._prevText = rec[0].toLowerCase();

                return;
            }
        }
    }
};



/* Panel button */
function HamsterExtension(extensionMeta) {
    this._init(extensionMeta);
}

HamsterExtension.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function(extensionMeta) {
        PanelMenu.Button.prototype._init.call(this, 0.0);

        this.extensionMeta = extensionMeta;
        this._proxy = new ApiProxy(DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster');
        this._proxy.connect('FactsChanged',      Lang.bind(this, this.refresh));
        this._proxy.connect('ActivitiesChanged', Lang.bind(this, this.refreshActivities));
        this._proxy.connect('TagsChanged',       Lang.bind(this, this.refresh));


        this._windowsProxy = new WindowsProxy(DBus.session,
                                              "org.gnome.Hamster.WindowServer",
                                              "/org/gnome/Hamster/WindowServer")

        this._settings = Convenience.getSettings();


        this.panelContainer = new St.BoxLayout();
        this.actor.add_actor(this.panelContainer);


        this.panelLabel = new St.Label({style_class: 'hamster-label', text: _("Loading...")});
        this.currentActivity = null;

        // panel icon
        this._trackingIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/images/hamster-tracking-symbolic.svg");
        this._idleIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/images/hamster-idle-symbolic.svg");

        this.icon = new St.Icon({gicon: this._trackingIcon,
                                  icon_size: 16,
                                  style_class: "panel-icon"});

        this.panelContainer.add(this.icon);
        this.panelContainer.add(this.panelLabel);

        let item = new HamsterBox()
        item.connect('activate', Lang.bind(this, this._onActivityEntry));
        this.activityEntry = item;
        this.activityEntry.proxy = this._proxy; // lazy proxying


        this.menu.addMenuItem(item);

        // overview
        item = new PopupMenu.PopupMenuItem(_("Show Overview"));
        item.connect('activate', Lang.bind(this, this._onShowHamsterActivate));
        this.menu.addMenuItem(item);

        // stop tracking
        item = new PopupMenu.PopupMenuItem(_("Stop Tracking"));
        item.connect('activate', Lang.bind(this, this._onStopTracking));
        this.menu.addMenuItem(item);

        // add new task
        item = new PopupMenu.PopupMenuItem(_("Add Earlier Activity"));
        item.connect('activate', Lang.bind(this, this._onNewFact));
        this.menu.addMenuItem(item);

        // settings
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        item = new PopupMenu.PopupMenuItem(_("Tracking Settings"));
        item.connect('activate', Lang.bind(this, this._onShowSettingsActivate));
        this.menu.addMenuItem(item);


        // focus menu upon display
        this.menu.connect('open-state-changed', Lang.bind(this,
            function(menu, open) {
                if (open) {
                    this.activityEntry.focus();
                } else {
                    this.activityEntry.blur();
                }
            }
        ));


        // load data
        this.facts = null;
        // refresh the label every 60 secs
        this.timeout = GLib.timeout_add_seconds(0, 60, Lang.bind(this, this.refresh))
        this.refresh();
    },

    show: function() {
        this.menu.open();
    },

    toggle: function() {
        this.menu.toggle();
    },

    refreshActivities: function() {
        this.activityEntry.autocompleteActivities = [];
        this.refresh();
    },

    refresh: function() {
        this._proxy.GetTodaysFactsRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            let facts = Stuff.fromDbusFacts(response);

            this.currentActivity = null;
            let fact = null;
            if (facts.length) {
                fact = facts[facts.length - 1];
                if (!fact.endTime)
                    this.currentActivity = fact;
            }
            this.updatePanelDisplay(fact);

            let activities = this.activityEntry.activities
            activities.destroy_all_children() // remove previous entries

            var i = 0;
            for each (var fact in facts) {
                let label;

                label = new St.Label({style_class: 'cell-label'});
                let text = "%02d:%02d - ".format(fact.startTime.getHours(), fact.startTime.getMinutes());
                if (fact.endTime) {
                    text += "%02d:%02d".format(fact.endTime.getHours(), fact.endTime.getMinutes());
                }
                label.set_text(text)
                activities.add(label, {row: i, col: 0, x_expand: false});

                label = new St.Label({style_class: 'cell-label'});
                label.set_text(fact.name + (0 < fact.tags.length ? (" #" + fact.tags.join(", #")) : ""));
                activities.add(label, {row: i, col: 1});

                label = new St.Label({style_class: 'cell-label'});
                label.set_text(Stuff.formatDurationHuman(fact.delta))
                activities.add(label, {row: i, col: 2, x_expand: false});


                let icon;
                let button;

                button = new St.Button({style_class: 'clickable cell-button'});

                icon = new St.Icon({icon_name: "document-open-symbolic",
                                    icon_size: 16});

                button.set_child(icon);
                button.fact = fact;
                button.connect('clicked', Lang.bind(this, function(button, event) {
                    this._windowsProxy.editRemote(button.fact.id, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
                        // TODO - handle exceptions perhaps
                    }));
                    this.menu.close();
                }));
                activities.add(button, {row: i, col: 3});


                if (!this.currentActivity ||
                    this.currentActivity.name != fact.name ||
                    this.currentActivity.category != fact.category ) {
                    button = new St.Button({style_class: 'clickable cell-button'});

                    icon = new St.Icon({icon_name: "media-playback-start-symbolic",
                                        icon_size: 16});

                    button.set_child(icon);
                    button.fact = fact;

                    button.connect('clicked', Lang.bind(this, function(button, event) {
                        let factStr = button.fact.name
                                      + "@" + button.fact.category
                                      + ", " + (button.fact.description);
                        if (button.fact.tags) {
                            factStr += " #" + button.fact.tags.join(", #");
                        }

                        this._proxy.AddFactRemote(factStr,
                                                  0, 0, false, DBus.CALL_FLAG_START,
                                                  Lang.bind(this, function(response, err) {
                            // not interested in the new id - this shuts up the warning
                        }));
                        this.menu.close();
                    }));

                    activities.add(button, {row: i, col: 4});
                }

                i += 1;
            }

            let byCategory = {};
            let categories = [];
            for each (var fact in facts) {
                byCategory[fact.category] = (byCategory[fact.category] || 0) + fact.delta;
                if (categories.indexOf(fact.category) == -1)
                    categories.push(fact.category)
            };

            let label = "";
            for each (var category in categories) {
                label += category + ": " + Stuff.formatDurationHours(byCategory[category]) +  ", ";
            }
            label = label.slice(0, label.length - 2); // strip trailing comma
            this.activityEntry.summaryLabel.set_text(label);

        }));

        return true;
    },


    updatePanelDisplay: function(fact) {
        // 0 = show label, 1 = show icon + duration, 2 = just icon
        let appearance = this._settings.get_int("panel-appearance");


        if (appearance == 0) {
            this.panelLabel.show();
            this.icon.hide()

            if (fact && !fact.endTime) {
                this.panelLabel.text = "%s %s".format(fact.name, Stuff.formatDuration(fact.delta));
            } else {
                this.panelLabel.text = _("No activity");
            }
        } else {
            this.icon.show();
            if (appearance == 1)
                this.panelLabel.hide();
            else
                this.panelLabel.show();


            // updates panel label. if fact is none, will set panel status to "no activity"
            if (fact && !fact.endTime) {
                this.panelLabel.text = Stuff.formatDuration(fact.delta);
                this.icon.gicon = this._trackingIcon;
            } else {
                this.panelLabel.text = "";
                this.icon.gicon = this._idleIcon;
            }
        }
    },


    _onStopTracking: function() {
        let now = new Date();
        let epochSeconds = Date.UTC(now.getFullYear(),
                                    now.getMonth(),
                                    now.getDate(),
                                    now.getHours(),
                                    now.getMinutes(),
                                    now.getSeconds());
        epochSeconds = Math.floor(epochSeconds / 1000);
        this._proxy.StopTrackingRemote(epochSeconds, DBus.CALL_FLAG_START);
    },

    _onShowHamsterActivate: function() {
        this._windowsProxy.overviewRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // TODO - handle exceptions perhaps
        }));
    },

    _onNewFact: function() {
        this._windowsProxy.editRemote(0, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // TODO - handle exceptions perhaps
        }));
    },

    _onShowSettingsActivate: function() {
        this._windowsProxy.preferencesRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // TODO - handle exceptions perhaps
        }));
    },


    _onActivityEntry: function() {
        let text = this.activityEntry._textEntry.get_text();
        this._proxy.AddFactRemote(text, 0, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // not interested in the new id - this shuts up the warning
        }));
    }
};


function ExtensionController(extensionMeta) {
    let dateMenu = Main.panel.statusArea.dateMenu;

    return {
        extensionMeta: extensionMeta,
        extension: null,
        settings: null,

        enable: function() {
            this.settings = Convenience.getSettings();
            this.extension = new HamsterExtension(this.extensionMeta);

            if (this.settings.get_boolean("swap-with-calendar")) {
                Main.panel.addToStatusArea("hamster", this.extension, 0, "center");

                Main.panel._centerBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox('dateMenu', dateMenu, -1, Main.panel._rightBox);
            } else {
                Main.panel.addToStatusArea("hamster", this.extension, 0, "right");
            }

            Main.panel.menuManager.addMenu(this.extension.menu);


            global.display.add_keybinding("show-hamster-dropdown",
                this.extension._settings,
                Meta.KeyBindingFlags.NONE,
                Lang.bind(this.extension, this.extension.toggle)
            );
        },

        disable: function() {
            global.display.remove_keybinding("show-hamster-dropdown");


            if (this.settings.get_boolean("swap-with-calendar")) {
                Main.panel._rightBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox('dateMenu', dateMenu, Main.sessionMode.panel.center.indexOf('dateMenu'), Main.panel._centerBox);
            }

            Main.panel.menuManager.removeMenu(this.extension.menu);

            GLib.source_remove(this.extension.timeout);
            this.extension.actor.destroy();
            this.extension.destroy();
            this.extension = null;
        }
    }
}


function init(extensionMeta) {
    Convenience.initTranslations("hamster-shell-extension");
    return new ExtensionController(extensionMeta);
}
