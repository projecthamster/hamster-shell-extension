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


const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;

const Gettext = imports.gettext.domain('hamster-shell-extension');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const PanelWidget = Me.imports.widgets.panelWidget.PanelWidget;

// dbus-send --session --type=method_call --print-reply --dest=org.gnome.Hamster /org/gnome/Hamster org.freedesktop.DBus.Introspectable.Introspect
const ApiProxyIface = ['',
  '<node>',
  '  <interface name="org.gnome.Hamster">',
  '    <method name="GetTodaysFacts">',
  '      <arg direction="out" type="a(iiissisasii)" />',
  '    </method>',
  '    <method name="StopTracking">',
  '      <arg direction="in"  type="v" name="end_time" />',
  '    </method>',
  '    <method name="AddFact">',
  '      <arg direction="in"  type="s" name="fact" />',
  '      <arg direction="in"  type="i" name="start_time" />',
  '      <arg direction="in"  type="i" name="end_time" />',
  '      <arg direction="in"  type="b" name="temporary" />',
  '      <arg direction="out" type="i" />',
  '    </method>',
  '    <method name="GetActivities">',
  '      <arg direction="in"  type="s" name="search" />',
  '      <arg direction="out" type="a(ss)" />',
  '    </method>',
  '    <signal name="FactsChanged"></signal>',
  '    <signal name="ActivitiesChanged"></signal>',
  '    <signal name="TagsChanged"></signal>',
  '  </interface>',
  '</node>',
].join('');

let ApiProxy = Gio.DBusProxy.makeProxyWrapper(ApiProxyIface);

// dbus-send --session --type=method_call --print-reply --dest=org.gnome.Hamster.WindowServer /org/gnome/Hamster/WindowServer org.freedesktop.DBus.Introspectable.Introspect
const WindowsProxyIface = ['',
  '<node>',
  '  <interface name="org.gnome.Hamster.WindowServer">',
  '    <method name="edit">',
  '      <arg direction="in"  type="v" name="id" />',
  '    </method>',
  '    <method name="overview"></method>',
  '    <method name="preferences"></method>',
  '  </interface>',
  '</node>',
].join('');


let WindowsProxy = Gio.DBusProxy.makeProxyWrapper(WindowsProxyIface);




/**
 * Create the controller instance that handles extension context.
 *
 * This class does not actually handle any widgets/representation itself. It is
 * instead in charge of setting up the general infrastructure and to make sure
 * that the extension cleans up after itself if it gets deactivated.
 *
 * @class
 */
function Controller(extensionMeta) {
    let dateMenu = Main.panel.statusArea.dateMenu;

    return {
        extensionMeta: extensionMeta,
        panelWidget: null,
        settings: null,
        placement: 0,
        apiProxy: null,
        windowsProxy: null,
        // ``shouldEnable`` indicates if the 'magic' enable function has been called or not.
        // for details please see: https://github.com/projecthamster/hamster-shell-extension/pull/239
        shouldEnable: false,

        /**
         * 'Magic' method, called upon extension launch.
         *
         * The gnome-shell-extension API grantees that there is always a ``disable`` call in
         * between to ``enable`` calls.
         *
         * Note:
         *  We only set up our dbus proxies here. In order to be able to do so asynchronously all
         *  the actual startup code is refered to ``deferred_enable``.
         */
        enable: function() {
            this.shouldEnable = true;
            new ApiProxy(Gio.DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster',
                Lang.bind(this, function(proxy) {
                    this.apiProxy = proxy;
                    this.deferred_enable();
                }));
            new WindowsProxy(Gio.DBus.session, "org.gnome.Hamster.WindowServer",
                "/org/gnome/Hamster/WindowServer",
                Lang.bind(this, function(proxy) {
                    this.windowsProxy = proxy;
                    this.deferred_enable();
                }));
        },

        deferred_enable: function() {
            // Make sure ``enable`` is 'finished' and ``disable`` has not been
            // called in between.
            if (!this.shouldEnable || !this.apiProxy || !this.windowsProxy)
                return;

            this.settings = Convenience.getSettings();
            this.panelWidget = new PanelWidget(this);
            this.placement = this.settings.get_int("panel-placement");

            this._placeWidget(this.placement, this.panelWidget);

            // Callbacks that handle appearing/vanishing dbus services.
            function apiProxy_appeared_callback() {
            }

            function apiProxy_vanished_callback() {
                global.log(_("hamster-shell-extension: 'hamster-service' not running. Shutting down."));
                Main.notify(_("hamster-shell-extension: 'hamster-service' not running. Shutting down."));
                this.disable();
            }

            function windowsProxy_appeared_callback() {
            }

            function windowsProxy_vanished_callback() {
                global.log(_("hamster-shell-extension: 'hamster-windows-service' not running. Shutting down."));
                Main.notify(_("hamster-shell-extension: 'hamster-windows-service' not running. Shutting down."));
                this.disable();
            }

            // Set-up watchers that watch for required dbus services.
            let dbus_watcher = Gio.bus_watch_name(Gio.BusType.SESSION, 'org.gnome.Hamster',
                Gio.BusNameWatcherFlags.NONE, apiProxy_appeared_callback.bind(this),
                apiProxy_vanished_callback.bind(this));

            let dbus_watcher_window = Gio.bus_watch_name(Gio.BusType.SESSION, 'org.gnome.Hamster.WindowServer',
                Gio.BusNameWatcherFlags.NONE, windowsProxy_appeared_callback.bind(this),
                windowsProxy_vanished_callback.bind(this));

            this.apiProxy.connectSignal('ActivitiesChanged', Lang.bind(this, this.refreshActivities));
            this.activities = this.refreshActivities();

            Main.panel.menuManager.addMenu(this.panelWidget.menu);
            Main.wm.addKeybinding("show-hamster-dropdown",
                this.panelWidget._settings,
                Meta.KeyBindingFlags.NONE,
                // Since Gnome 3.16, Shell.KeyBindingMode is replaced by Shell.ActionMode
                Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : Shell.ActionMode.ALL,
                Lang.bind(this.panelWidget, this.panelWidget.toggle)
            );
        },

        disable: function() {
            this.shouldEnable = false;
            Main.wm.removeKeybinding("show-hamster-dropdown");

            global.log('Shutting down hamster-shell-extension.');
            this._removeWidget(this.placement);
            this.panelWidget.destroy();
            this.panelWidget = null;
            this.apiProxy = null;
            this.windowsProxy = null;
        },

        /**
         * Build a new cache of all activities present in the backend.
         */
        refreshActivities: function() {
            /**
             * Return an Array of [Activity.name, Activity.category.name] Arrays.
             *
             */
            function getActivities(controller) {
                if (controller.runningActivitiesQuery) {
                    return(controller.activities);
                }

                this.runningActivitiesQuery = true;
                controller.apiProxy.GetActivitiesRemote("", Lang.bind(this, function([response], err) {
                  controller.runningActivitiesQuery = false;
                  controller.activities = response;
                }));

                global.log('ACTIVITIES HAMSTER: ', controller.activities);
                return controller.activities;
            }

            let result = getActivities(this);
            this.activities = result;
            return result;
        },

        /**
         * Place the actual extension wi
         * get in the right place according to settings.
         */
        _placeWidget: function(placement, panelWidget) {
            if (placement == 1) {
                // 'Replace calendar'
                Main.panel.addToStatusArea("hamster", this.panelWidget, 0, "center");

                Main.panel._centerBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox('dateMenu', dateMenu, -1, Main.panel._rightBox);
            } else if (placement == 2) {
                // 'Replace activities'
                let activitiesMenu = Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0];
                // If our widget replaces the 'Activities' menu in the panel,
                // this property stores the original text so we can restore it
                // on ``this.disable``.
                this._activitiesText = activitiesMenu.get_text();
                activitiesMenu.set_text('');
                Main.panel.addToStatusArea("hamster", this.panelWidget, 1, "left");
            } else {
                // 'Default'
                Main.panel.addToStatusArea("hamster", this.panelWidget, 0, "right");
            }
        },

        _removeWidget: function(placement) {
            if (placement == 1) {
                // We replaced the calendar
                Main.panel._rightBox.remove_actor(dateMenu.container);
                Main.panel._addToPanelBox(
                    'dateMenu',
                    dateMenu,
                    Main.sessionMode.panel.center.indexOf('dateMenu'),
                    Main.panel._centerBox
                );
                Main.panel._centerBox.remove_actor(this.panelWidget.container);
            } else if (placement == 2) {
                // We replaced the 'Activities' menu
                let activitiesMenu = Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0];
                activitiesMenu.set_text(this._activitiesText);
                Main.panel._leftBox.remove_actor(this.panelWidget.container);
            } else {
                Main.panel._rightBox.remove_actor(this.panelWidget.container);
            }
        },
    };
}


function init(extensionMeta) {
    Convenience.initTranslations();
    return new Controller(extensionMeta);
}
