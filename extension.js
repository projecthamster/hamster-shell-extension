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
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const Gettext = imports.gettext.domain('hamster-shell-extension');
const _ = Gettext.gettext;
const N_ = function(x) { return x; };

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Stuff = Me.imports.stuff;

// dbus-send --session --type=method_call --print-reply --dest=org.gnome.Hamster /org/gnome/Hamster org.freedesktop.DBus.Introspectable.Introspect
const ApiProxyIface = '<node> \
<interface name="org.gnome.Hamster"> \
<method name="GetTodaysFacts"> \
  <arg direction="out" type="a(iiissisasii)" /> \
</method> \
<method name="StopTracking"> \
  <arg direction="in"  type="v" name="end_time" /> \
</method> \
<method name="AddFact"> \
  <arg direction="in"  type="s" name="fact" /> \
  <arg direction="in"  type="i" name="start_time" /> \
  <arg direction="in"  type="i" name="end_time" /> \
  <arg direction="in"  type="b" name="temporary" /> \
  <arg direction="out" type="i" /> \
</method> \
<method name="GetActivities"> \
  <arg direction="in"  type="s" name="search" /> \
  <arg direction="out" type="a(ss)" /> \
</method> \
<signal name="FactsChanged"></signal> \
<signal name="ActivitiesChanged"></signal> \
<signal name="TagsChanged"></signal> \
</interface> \
</node>';

let ApiProxy = Gio.DBusProxy.makeProxyWrapper(ApiProxyIface);

// dbus-send --session --type=method_call --print-reply --dest=org.gnome.Hamster.WindowServer /org/gnome/Hamster/WindowServer org.freedesktop.DBus.Introspectable.Introspect
const WindowsProxyIface = '<node> \
<interface name="org.gnome.Hamster.WindowServer"> \
<method name="edit"> \
  <arg direction="in"  type="v" name="id" /> \
</method> \
<method name="overview"></method> \
<method name="preferences"></method> \
</interface> \
</node>';

let WindowsProxy = Gio.DBusProxy.makeProxyWrapper(WindowsProxyIface);



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
        label.set_text(_("What are you doing?"));
        box.add(label);

        this._textEntry = new St.Entry({name: 'searchEntry',
                                        can_focus: true,
                                        track_hover: true,
                                        hint_text: _("Enter activity...")});
        this._textEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
        this._textEntry.clutter_text.connect('key-release-event', Lang.bind(this, this._onKeyReleaseEvent));


        box.add(this._textEntry);

        // autocomplete popup - couldn't spark it up just yet
        //this._popup = new PopupMenu.PopupComboMenu(this._textEntry);

        label = new St.Label({style_class: 'hamster-box-label'});
        label.set_text(_("Today's activities"));
        box.add(label);

        let scrollbox = new St.ScrollView({style_class: 'hamster-scrollbox'});
        this._scrollAdjustment = scrollbox.vscroll.adjustment;
        box.add(scrollbox);

        // Since St.Table does not implement StScrollable, we create a
        // container object that does.
        let container = new St.BoxLayout({});
        container.set_vertical(true);
        scrollbox.add_actor(container);

        this.activities = new St.Widget({style_class: 'hamster-activities',
                                         layout_manager: new Clutter.TableLayout(),
                                         reactive: true });
        container.add(this.activities);

        this.summaryLabel = new St.Label({style_class: 'summary-label'});
        box.add(this.summaryLabel);


        this.actor.add_child(box);

        this.autocompleteActivities = [];
        this.runningActivitiesQuery = null;

        this._prevText = "";
    },

    focus: function() {
        Mainloop.timeout_add(20, Lang.bind(this, function() {
            // scroll the activities to the bottom
            this._scrollAdjustment.value = this._scrollAdjustment.upper;

            // focus the text entry
            global.stage.set_key_focus(this._textEntry);
        }));
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
            return this.autocompleteActivities;

        this.runningActivitiesQuery = true;
        this.proxy.GetActivitiesRemote("", Lang.bind(this, function([response], err) {
            this.runningActivitiesQuery = false;
            this.autocompleteActivities = response;
        }));

        return this.autocompleteActivities;
    },

    _onKeyReleaseEvent: function(textItem, evt) {
        let symbol = evt.get_key_symbol();
        let text = this._textEntry.get_text().toLowerCase();
        let starttime = "";
        let activitytext = text;

        // Don't include leading times in the activity autocomplete
        let match = [];
        if ((match = text.match(/^\d\d:\d\d /)) ||
            (match = text.match(/^-\d+ /))) {
            starttime = text.substring(0, match[0].length);
            activitytext = text.substring(match[0].length);
        }

        // if nothing has changed or we still have selection then that means
        // that special keys are at play and we don't attempt to autocomplete
        if (activitytext == "" ||
            this._prevText == text ||
            this._textEntry.clutter_text.get_selection()) {
            return;
        }
        this._prevText = text;

        // ignore deletions
        let ignoreKeys = [Clutter.BackSpace, Clutter.Delete, Clutter.Escape];
        for (var key of ignoreKeys) {
            if (symbol == key)
                return;
        }


        let allActivities = this._getActivities();
        for (var rec of allActivities) {
            let completion = rec[0];
            if (rec[1].length > 0)
                completion += "@" + rec[1];
            if (completion.toLowerCase().substring(0, activitytext.length) == activitytext) {
                this.prevText = text;
                completion = starttime + completion;

                this._textEntry.set_text(completion);
                this._textEntry.clutter_text.set_selection(text.length, completion.length);

                this._prevText = completion.toLowerCase();

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
        this._proxy = new ApiProxy(Gio.DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster');
        this._proxy.connectSignal('FactsChanged',      Lang.bind(this, this.refresh));
        this._proxy.connectSignal('ActivitiesChanged', Lang.bind(this, this.refreshActivities));
        this._proxy.connectSignal('TagsChanged',       Lang.bind(this, this.refresh));


        this._windowsProxy = new WindowsProxy(Gio.DBus.session,
                                              "org.gnome.Hamster.WindowServer",
                                              "/org/gnome/Hamster/WindowServer");

        this._settings = Convenience.getSettings();


        this.panelContainer = new St.BoxLayout({style_class: "panel-box"});
        this.actor.add_actor(this.panelContainer);
        this.actor.add_style_class_name('panel-status-button');


        this.panelLabel = new St.Label({text: _("Loading..."),
                                        y_align: Clutter.ActorAlign.CENTER});
        this.currentActivity = null;

        // panel icon
        this._trackingIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/images/hamster-tracking-symbolic.svg");
        this._idleIcon = Gio.icon_new_for_string(this.extensionMeta.path + "/images/hamster-idle-symbolic.svg");

        this.icon = new St.Icon({gicon: this._trackingIcon,
                                 icon_size: 16,
                                 style_class: "panel-icon"});

        this.panelContainer.add(this.icon);
        this.panelContainer.add(this.panelLabel);

        let item = new HamsterBox();
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
        this.timeout = GLib.timeout_add_seconds(0, 60, Lang.bind(this, this.refresh));
        this.refresh();
    },

    show: function() {
        this.menu.open();
    },

    toggle: function() {
        this.menu.toggle();
    },

    refreshActivities: function(proxy, sender) {
        this.activityEntry.autocompleteActivities = [];
        this.refresh();
    },

    refresh: function(proxy, sender) {
        this._proxy.GetTodaysFactsRemote(Lang.bind(this, this._refresh));
        return true;
    },

    _refresh: function([response], err) {
        let facts = [];

        if (err) {
            log(err);
        } else if (response.length > 0) {
            facts = Stuff.fromDbusFacts(response);
        }

        this.currentActivity = null;
        let fact = null;
        if (facts.length) {
            fact = facts[facts.length - 1];
            if (!fact.endTime)
                this.currentActivity = fact;
        }
        this.updatePanelDisplay(fact);

        let activities = this.activityEntry.activities;
        activities.destroy_all_children(); // remove previous entries

        var i = 0;
        let layout = activities.layout_manager;
        for (var fact of facts) {
            let label;

            label = new St.Label({style_class: 'cell-label'});
            let text = "%02d:%02d - ".format(fact.startTime.getHours(), fact.startTime.getMinutes());
            if (fact.endTime) {
                text += "%02d:%02d".format(fact.endTime.getHours(), fact.endTime.getMinutes());
            }
            label.set_text(text);
            layout.pack(label, 0, i);

            label = new St.Label({style_class: 'cell-label'});
            label.set_text(fact.name + (0 < fact.tags.length ? (" #" + fact.tags.join(", #")) : ""));
            layout.pack(label, 1, i);

            label = new St.Label({style_class: 'cell-label'});
            label.set_text(Stuff.formatDurationHuman(fact.delta));
            layout.pack(label, 2, i);


            let icon;
            let button;

            button = new St.Button({style_class: 'clickable cell-button'});

            icon = new St.Icon({icon_name: "document-open-symbolic",
                                icon_size: 16});

            button.set_child(icon);
            button.fact = fact;
            button.connect('clicked', Lang.bind(this, function(button, event) {
                this._windowsProxy.editSync(GLib.Variant.new('i', [button.fact.id]));
                this.menu.close();
            }));
            layout.pack(button, 3, i);


            if (!this.currentActivity ||
                this.currentActivity.name != fact.name ||
                this.currentActivity.category != fact.category ||
                this.currentActivity.tags.join(",") != fact.tags.join(",")) {
                button = new St.Button({style_class: 'clickable cell-button'});

                icon = new St.Icon({icon_name: "media-playback-start-symbolic",
                                    icon_size: 16});

                button.set_child(icon);
                button.fact = fact;

                button.connect('clicked', Lang.bind(this, function(button, event) {
                    let factStr = button.fact.name
                                  + "@" + button.fact.category
                                  + ", " + (button.fact.description);
                    if (button.fact.tags.length) {
                        factStr += " #" + button.fact.tags.join(", #");
                    }

                    this._proxy.AddFactRemote(factStr, 0, 0, false, Lang.bind(this, function(response, err) {
                        // not interested in the new id - this shuts up the warning
                    }));
                    this.menu.close();
                }));
                layout.pack(button, 4, i);
            }

            i += 1;
        }

        let byCategory = {};
        let categories = [];
        for (var fact of facts) {
            byCategory[fact.category] = (byCategory[fact.category] || 0) + fact.delta;
            if (categories.indexOf(fact.category) == -1)
                categories.push(fact.category);
        }

        let label = "";
        for (var category of categories) {
            label += category + ": " + Stuff.formatDurationHours(byCategory[category]) +  ", ";
        }
        label = label.slice(0, label.length - 2); // strip trailing comma
        this.activityEntry.summaryLabel.set_text(label);
    },


    updatePanelDisplay: function(fact) {
        // 0 = show label, 1 = show icon + duration, 2 = just icon
        let appearance = this._settings.get_int("panel-appearance");


        if (appearance === 0) {
            this.panelLabel.show();
            this.icon.hide();

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
        this._proxy.StopTrackingRemote(GLib.Variant.new('i', [epochSeconds]));
    },

    _onShowHamsterActivate: function() {
        this._windowsProxy.overviewSync();
    },

    _onNewFact: function() {
        this._windowsProxy.editSync(GLib.Variant.new('i', [0]));
    },

    _onShowSettingsActivate: function() {
        this._windowsProxy.preferencesSync();
    },


    _onActivityEntry: function() {
        let text = this.activityEntry._textEntry.get_text();
        this._proxy.AddFactRemote(text, 0, 0, false, Lang.bind(this, function(response, err) {
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
        placement: 0,
        activitiesText: null,

        enable: function() {
            this.settings = Convenience.getSettings();
            this.extension = new HamsterExtension(this.extensionMeta);

            this.placement = this.settings.get_int("panel-placement");
            if (this.placement == 1) {
                Main.panel.addToStatusArea("hamster", this.extension, 0, "center");

                Main.panel._centerBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox('dateMenu', dateMenu, -1, Main.panel._rightBox);

            } else if (this.placement == 2) {
                this._activitiesText = Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0].get_text();
                Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0].set_text('');
                Main.panel.addToStatusArea("hamster", this.extension, 1, "left");

            } else {
                Main.panel.addToStatusArea("hamster", this.extension, 0, "right");
            }

            Main.panel.menuManager.addMenu(this.extension.menu);


            Main.wm.addKeybinding("show-hamster-dropdown",
                this.extension._settings,
                Meta.KeyBindingFlags.NONE,
                //since Gnome 3.16, Shell.KeyBindingMode is replaced by Shell.ActionMode
                Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : Shell.ActionMode.ALL,
                Lang.bind(this.extension, this.extension.toggle)
            );
        },

        disable: function() {
            Main.wm.removeKeybinding("show-hamster-dropdown");

            if (this.placement == 1) {
                Main.panel._rightBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox('dateMenu', dateMenu, Main.sessionMode.panel.center.indexOf('dateMenu'), Main.panel._centerBox);

            } else if (this.placement == 2) {
                Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0].set_text(this._activitiesText);
            }

            Main.panel.menuManager.removeMenu(this.extension.menu);

            GLib.source_remove(this.extension.timeout);
            this.extension.actor.destroy();
            this.extension.destroy();
            this.extension = null;
        }
    };
}


function init(extensionMeta) {
    Convenience.initTranslations("hamster-shell-extension");
    return new ExtensionController(extensionMeta);
}
