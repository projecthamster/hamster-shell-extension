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

const DBus = imports.dbus;
const GLib = imports.gi.GLib
const Lang = imports.lang;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const Gettext = imports.gettext;
const _ = Gettext.gettext;

/* We use keybindings provided by default in the metacity GConf tree, and which
 * are supported by default.
 * Most probably not the smartest choice, time will tell.
 */
const _hamsterKeyBinding = 'run_command_12';


// TODO - why are we not using dbus introspection here or something?
let ApiProxy = DBus.makeProxyClass({
    name: 'org.gnome.Hamster',
    methods: [
        { name: 'GetTodaysFacts', inSignature: '', outSignature: 'a(iiissisasii)'},
        { name: 'StopTracking', inSignature: 'i'},
        { name: 'Toggle', inSignature: ''},
        { name: 'AddFact', inSignature: 'siib', outSignature: 'i'},
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
        { name: 'edit', inSignature: 'i'},
        { name: 'overview', inSignature: ''},
        { name: 'about', inSignature: ''},
        { name: 'statistics', inSignature: ''},
        { name: 'preferences', inSignature: ''},
    ]
});



function formatDuration(minutes) {
    return "%02d:%02d".format((minutes - minutes % 60) / 60, minutes % 60)
}

function formatDurationHuman(minutes) {
    let hours = (minutes - minutes % 60) / 60;
    let mins = minutes % 60;
    let res = ""

    if (hours > 0 || mins > 0) {
        if (hours > 0)
            res += "%dh ".format(hours)

        if (mins > 0)
            res += "%dmin".format(mins)
    } else {
        res = "Just started"
    }

    return res;
}

function fromDbusFact(fact) {
    // converts a fact coming from dbus into a usable object
    function UTCToLocal(timestamp) {
        // TODO - is this really the way?!
        let res = new Date(timestamp)
        return new Date(res.setUTCMinutes(res.getUTCMinutes() + res.getTimezoneOffset()));
    }

    return {
        name: fact[4],
        startTime: UTCToLocal(fact[1]*1000),
        endTime: fact[2] != 0 ? UTCToLocal(fact[2]*1000) : null,
        description: fact[3],
        activityId: fact[5],
        category: fact[6],
        tags: fact[7],
        date: UTCToLocal(fact[8] * 1000),
        delta: Math.floor(fact[9] / 60), // minutes
        id: fact[0]
    }
};

function fromDbusFacts(facts) {
    let res = [];
    for each(var fact in facts) {
        res.push(fromDbusFact(fact));
    }

    return res;
};



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

        let label = new St.Label({ style_class: 'hamster-box-label'});
        label.set_text("What are you doing?")
        box.add(label);

        this._textEntry = new St.Entry({name: 'searchEntry',
                                        can_focus: true,
                                        track_hover: false,
                                        hint_text: _("Enter activity...")});
        this._textEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
        box.add(this._textEntry);


        let scrollbox = new St.ScrollView({ x_fill: true, y_fill: true });
        scrollbox.get_hscroll_bar().hide();
        //box.add(scrollbox, {expand: true})


        label = new St.Label({ style_class: 'hamster-box-label'});
        label.set_text("Todays activities")
        box.add(label);


        this.activities = new St.Table({ style_class: 'hamster-activities'})
        box.add(this.activities)

        this.addActor(box);
    },


    _onEntryActivated: function() {
        this.emit('activate');
        this._textEntry.set_text('');
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
        this._proxy.connect('ActivitiesChanged', Lang.bind(this, this.refresh));
        this._proxy.connect('TagsChanged',       Lang.bind(this, this.refresh));


        this._windowsProxy = new WindowsProxy(DBus.session,
                                              "org.gnome.Hamster.WindowServer",
                                              "/org/gnome/Hamster/WindowServer")

        this._settings = new Gio.Settings({ schema: 'org.gnome.hamster' });


        this.panel_container = new St.BoxLayout();
        this.actor.add_actor(this.panel_container);


        this.panel_label = new St.Label({ style_class: 'hamster-label', text: _("Loading...") });
        this.current_activity = false;


        // panel icon
        this._trackingIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/data/hamster-tracking-symbolic.svg");
        this._idleIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/data/hamster-idle-symbolic.svg");
        this._icon = new St.Icon({gicon: this._trackingIcon,
                                  icon_type: St.IconType.SYMBOLIC,
                                  icon_size: 16,
                                  style_class: "panel-icon"})

        this.panel_container.add(this._icon);
        this.panel_container.add(this.panel_label);

        let item = new HamsterBox()
        item.connect('activate', Lang.bind(this, this._onActivityEntry));
        this._activityEntry = item;
        this.menu.addMenuItem(item);

        /* This one make the hamster applet appear */
        item = new PopupMenu.PopupMenuItem(_("Show Overview"));
        item.connect('activate', Lang.bind(this, this._onShowHamsterActivate));
        this.menu.addMenuItem(item);

        /* To stop tracking the current activity */
        item = new PopupMenu.PopupMenuItem(_("Stop tracking"));
        item.connect('activate', Lang.bind(this, this._onStopTracking));
        this.menu.addMenuItem(item);

        /* This one make the hamster applet appear */
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        item = new PopupMenu.PopupMenuItem(_("Tracking Settings"));
        item.connect('activate', Lang.bind(this, this._onShowSettingsActivate));
        this.menu.addMenuItem(item);


        /* Install global keybinding to log something */
        let shellwm = global.window_manager;
        shellwm.takeover_keybinding(_hamsterKeyBinding);
        shellwm.connect('keybinding::' + _hamsterKeyBinding,
        Lang.bind(this, this._onGlobalKeyBinding));

        // load data
        this.facts = null;
        // refresh the label every 60 secs
        GLib.timeout_add_seconds(0, 60, Lang.bind(this, function () {this.refresh(); return true}))
        this.refresh();
    },


    updatePanelDisplay: function(fact) {
        // 0 = show label, 1 = show icon + duration, 2 = just icon
        let appearance = this._settings.get_int("panel-appearance");


        if (appearance == 0) {
            this.panel_label.show();
            this._icon.hide()

            if (fact && !fact.endTime) {
                this.panel_label.text = "%s %s".format(fact.name, formatDuration(fact.delta));
            } else {
                this.panel_label.text = "No activity";
            }
        } else {
            this._icon.show();
            if (appearance == 1)
                this.panel_label.show();
            else
                this.panel_label.hide();


            // updates panel label. if fact is none, will set panel status to "no activity"
            if (fact && !fact.endTime) {
                this.panel_label.text = formatDuration(fact.delta);
                this._icon.gicon = this._trackingIcon;
            } else {
                this.panel_label.text = "";
                this._icon.gicon = this._idleIcon;
            }
        }
    },


    refresh: function() {
        this._proxy.GetTodaysFactsRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            let facts = fromDbusFacts(response);

            let fact = null;
            if (facts.length) {
                fact = facts[facts.length - 1];
            }
            this.updatePanelDisplay(fact);

            let activities = this._activityEntry.activities
            activities.destroy_children() // remove previous entries

            var i = 0;
            for each (var fact in facts) {
                let label;

                label = new St.Label({ style_class: 'cell-label'});
                let text = "%02d:%02d - ".format(fact.startTime.getHours(), fact.startTime.getMinutes());
                if (fact.endTime) {
                    text += "%02d:%02d".format(fact.endTime.getHours(), fact.endTime.getMinutes());
                }
                label.set_text(text)
                activities.add(label, { row: i, col: 0, x_expand: false});

                label = new St.Label({style_class: 'cell-label'});
                label.set_text(fact.name)
                activities.add(label, { row: i, col: 1});

                label = new St.Label({style_class: 'cell-label'});
                label.set_text(formatDurationHuman(fact.delta))
                activities.add(label, { row: i, col: 2, x_expand: false});


                let icon;
                let button;

                button = new St.Button({ style_class: 'clickable'});
                icon = new St.Icon({ icon_name: "document-open",
                             icon_type: St.IconType.SYMBOLIC,
                             icon_size: 16 })
                button.set_child(icon);
                button.fact = fact;
                button.connect('clicked', Lang.bind(this, function(button, event) {
                    this._windowsProxy.editRemote(button.fact.id, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
                        // TODO - handle exceptions perhaps
                    }));
                }));
                activities.add(button, { row: i, col: 3});


                if (this.current_activity.name != fact.name) {
                    button = new St.Button({ style_class: 'clickable'});

                    icon = new St.Icon({ icon_name: "media-playback-start",
                                 icon_type: St.IconType.SYMBOLIC,
                                 icon_size: 16 })
                    button.set_child(icon);
                    button.fact = fact;

                    button.connect('clicked', Lang.bind(this, function(button, event) {
                        this._proxy.AddFactRemote(button.fact.name, 0, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
                            // not interested in the new id - this shuts up the warning
                        }));
                    }));

                    activities.add(button, { row: i, col: 4});
                }



                i += 1;
            }

        }));
    },

    _onStopTracking: function() {
        let date = new Date()
        date = new Date(date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset())); // getting back to UTC

        let epochSeconds = Math.floor(date.getTime() / 1000);
        this._proxy.StopTrackingRemote(epochSeconds, DBus.CALL_FLAG_START);
    },

    _onShowHamsterActivate: function() {
        this._windowsProxy.overviewRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // TODO - handle exceptions perhaps
        }));
    },

    _onShowSettingsActivate: function() {
        this._windowsProxy.preferencesRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // TODO - handle exceptions perhaps
        }));
    },


    _onActivityEntry: function() {
        let text = this._activityEntry._textEntry.get_text();
        this._proxy.AddFactRemote(text, 0, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // not interested in the new id - this shuts up the warning
        }));
    },

    _onGlobalKeyBinding: function() {
        this.menu.toggle();
        this._activityEntry._textEntry.grab_key_focus();
    }
};

let _extension; // a global variable, niiiice
let extensionMeta;


function ExtensionController(extensionMeta) {
    return {
        extensionMeta: extensionMeta,
        extension: null,
        settings: null,

        _checkCalendar: function(container) {
            if (this.settings.get_boolean("swap-with-calendar") == false)
                return;

            let calendar = Main.panel._dateMenu.actor;
            let extension = this.extension.actor;
            let calendarFound = false;
            for each(var elem in container.get_children()) {
                if (elem == calendar) {
                    calendarFound = true;
                }
            }

            if (!calendarFound)
                return;

            let source, target;

            if (container == Main.panel._centerBox) {
                target = Main.panel._rightBox;
            } else {
                target = Main.panel._centerBox;
            }


            container.remove_actor(calendar);
            target.add_actor(calendar);

            target.remove_actor(extension);
            container.add_actor(extension);
        },

        enable: function() {
            this.settings = new Gio.Settings({schema: 'org.gnome.hamster'});
            this.extension = new HamsterExtension(this.extensionMeta);

            Main.panel._rightBox.insert_actor(this.extension.actor, 0);
            Main.panel._menus.addMenu(this.extension.menu);
            this._checkCalendar(Main.panel._centerBox);
        },

        disable: function() {
            this._checkCalendar(Main.panel._rightBox);
            Main.panel._rightBox.remove_actor(this.extension.actor);
            Main.panel._menus.removeMenu(this.extension.menu);
            this.extension.actor.destroy();
        }
    }
}


function init(extensionMeta) {
    // Localization
    let userExtensionLocalePath = extensionMeta.path + '/locale';
    Gettext.bindtextdomain("hamster-applet", userExtensionLocalePath);
    Gettext.textdomain("hamster-applet");

    return new ExtensionController(extensionMeta);
}
