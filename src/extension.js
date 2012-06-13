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


// TODO - why are we not using dbus introspection here or something?
let ApiProxy = DBus.makeProxyClass({
    name: 'org.gnome.Hamster',
    methods: [
        {name: 'GetTodaysFacts', inSignature: '', outSignature: 'a(iiissisasii)'},
        {name: 'StopTracking', inSignature: 'i'},
        {name: 'Toggle', inSignature: ''},
        {name: 'AddFact', inSignature: 'siib', outSignature: 'i'},
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

function formatDurationHours(minutes) {
    if (minutes / 60.1 < 0.1) {
        return new Number(minutes / 60) + "h";
    } else {
        return new Number(minutes / 60.0).toFixed(1) + "h";
    }
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

        let label = new St.Label({style_class: 'hamster-box-label'});
        label.set_text("What are you doing?")
        box.add(label);

        this._textEntry = new St.Entry({name: 'searchEntry',
                                        can_focus: true,
                                        track_hover: false,
                                        hint_text: _("Enter activity...")});
        this._textEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
        box.add(this._textEntry);


        let scrollbox = new St.ScrollView({x_fill: true, y_fill: true});
        scrollbox.get_hscroll_bar().hide();
        //box.add(scrollbox, {expand: true})


        label = new St.Label({style_class: 'hamster-box-label'});
        label.set_text("Todays activities")
        box.add(label);


        this.activities = new St.Table({style_class: 'hamster-activities'})
        box.add(this.activities)

        this.summaryLabel = new St.Label({style_class: 'summary-label'});
        box.add(this.summaryLabel);


        this.addActor(box);
    },

    focus: function() {
        global.stage.set_key_focus(this._textEntry);
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

        this._settings = new Gio.Settings({schema: 'org.gnome.hamster'});


        this.panelContainer = new St.BoxLayout();
        this.actor.add_actor(this.panelContainer);


        this.panelLabel = new St.Label({style_class: 'hamster-label', text: _("Loading...")});
        this.currentActivity = null;


        // panel icon
        this._trackingIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/data/hamster-tracking-symbolic.svg");
        this._idleIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/data/hamster-idle-symbolic.svg");
        this.icon = new St.Icon({gicon: this._trackingIcon,
                                  icon_type: St.IconType.SYMBOLIC,
                                  icon_size: 16,
                                  style_class: "panel-icon"})

        this.panelContainer.add(this.icon);
        this.panelContainer.add(this.panelLabel);

        let item = new HamsterBox()
        item.connect('activate', Lang.bind(this, this._onActivityEntry));
        this.activityEntry = item;
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


        // ConsoleKit doesn't send notifications when shutdown/reboot
        // are disabled, so we update the menu item each time the menu opens
        this.menu.connect('open-state-changed', Lang.bind(this,
            function(menu, open) {
                if (open) {
                    this.activityEntry.focus();
                }
            }
        ));


        // load data
        this.facts = null;
        // refresh the label every 60 secs
        GLib.timeout_add_seconds(0, 60, Lang.bind(this, function () {this.refresh(); return true}))
        this.refresh();
    },

    show: function() {
        this.menu.open();
    },

    refresh: function() {
        this._proxy.GetTodaysFactsRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            let facts = fromDbusFacts(response);

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
                label.set_text(fact.name)
                activities.add(label, {row: i, col: 1});

                label = new St.Label({style_class: 'cell-label'});
                label.set_text(formatDurationHuman(fact.delta))
                activities.add(label, {row: i, col: 2, x_expand: false});


                let icon;
                let button;

                button = new St.Button({style_class: 'clickable cell-button'});
                icon = new St.Icon({icon_name: "document-open",
                                    icon_type: St.IconType.SYMBOLIC,
                                    icon_size: 16})
                button.set_child(icon);
                button.fact = fact;
                button.connect('clicked', Lang.bind(this, function(button, event) {
                    this._windowsProxy.editRemote(button.fact.id, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
                        // TODO - handle exceptions perhaps
                    }));
                    this.menu.close();
                }));
                activities.add(button, {row: i, col: 3});


                if (!this.currentActivity || this.currentActivity.name != fact.name) {
                    button = new St.Button({style_class: 'clickable cell-button'});

                    icon = new St.Icon({icon_name: "media-playback-start",
                                 icon_type: St.IconType.SYMBOLIC,
                                 icon_size: 16})
                    button.set_child(icon);
                    button.fact = fact;

                    button.connect('clicked', Lang.bind(this, function(button, event) {
                        let d = new Date();
                        let stamp = Math.round((d.getTime() / 1000) - (d.getTimezoneOffset()*60));
                        this._proxy.AddFactRemote(button.fact.name, stamp, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
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
            global.log(byCategory)

            let label = "";
            for each (var category in categories) {
                label += category + ": " + formatDurationHours(byCategory[category]) +  ", ";
            }
            label = label.slice(0, label.length - 2); // strip trailing comma
            this.activityEntry.summaryLabel.set_text(label);

        }));
    },


    updatePanelDisplay: function(fact) {
        // 0 = show label, 1 = show icon + duration, 2 = just icon
        let appearance = this._settings.get_int("panel-appearance");


        if (appearance == 0) {
            this.panelLabel.show();
            this.icon.hide()

            if (fact && !fact.endTime) {
                this.panelLabel.text = "%s %s".format(fact.name, formatDuration(fact.delta));
            } else {
                this.panelLabel.text = "No activity";
            }
        } else {
            this.icon.show();
            if (appearance == 1)
                this.panelLabel.show();
            else
                this.panelLabel.hide();


            // updates panel label. if fact is none, will set panel status to "no activity"
            if (fact && !fact.endTime) {
                this.panelLabel.text = formatDuration(fact.delta);
                this.icon.gicon = this._trackingIcon;
            } else {
                this.panelLabel.text = "";
                this.icon.gicon = this._idleIcon;
            }
        }
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
        let text = this.activityEntry._textEntry.get_text();
        let d = new Date();
        let stamp = Math.round((d.getTime() / 1000) - (d.getTimezoneOffset()*60));
        this._proxy.AddFactRemote(text, stamp, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
            // not interested in the new id - this shuts up the warning
        }));
    }
};


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

            Main.panel._rightBox.insert_child_at_index(this.extension.actor, 0);
            Main.panel._menus.addMenu(this.extension.menu);
            this._checkCalendar(Main.panel._centerBox);


            /* FIXME - none of these works right now
            Main.wm.setKeybindingHandler('activate_hamster_window', this.extension.show);
            Meta.keybindings_set_custom_handler('activate_hamster_window',
                                         this.extension.show);
            */

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
