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


import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import PanelWidget from './widgets/panelWidget.js';

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
export default class Controller extends Extension {
    constructor(extensionMeta) {
	let dateMenu = Main.panel.statusArea.dateMenu;

        super(extensionMeta);
        this.panelWidget = null;
        this.settings = null;
        this.placement = 0;
        this.apiProxy = null;
        this.windowsProxy = null;
        // ``shouldEnable`` indicates if the 'magic' enable function has been called or not.
        // for details please see: https://github.com/projecthamster/hamster-shell-extension/pull/239
        this.shouldEnable = false;
    }

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
    enable() {
        this.shouldEnable = true;
        new ApiProxy(Gio.DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster',
                     function(proxy, err) {
                         this.reportIfError(_("Connection to DBUS service failed"), err);
			 this.apiProxy = proxy;
			 this.deferred_enable();
                     }.bind(this));
        new WindowsProxy(Gio.DBus.session, "org.gnome.Hamster.WindowServer",
			 "/org/gnome/Hamster/WindowServer",
			 function(proxy, err) {
                             this.reportIfError(_("Connection to DBUS window service failed"), err);
			     this.windowsProxy = proxy;
			     this.deferred_enable();
			 }.bind(this));
    }

    deferred_enable() {
        // Make sure ``enable`` is 'finished' and ``disable`` has not been
        // called in between.
        if (!this.shouldEnable || !this.apiProxy || !this.windowsProxy)
            return;

        this.settings = this.getSettings();
        this.panelWidget = new PanelWidget(this);
        this.placement = this.settings.get_int("panel-placement");

        this._placeWidget(this.placement, this.panelWidget);

        // Callbacks that handle appearing/vanishing dbus services.
        function apiProxy_appeared_callback() {
            if (this.shouldEnable)
                this.panelWidget.show();
        }

        function apiProxy_vanished_callback() {
	    /* jshint validthis: true */
            this.reportIfError(_("DBUS proxy disappeared"), _("Disabling extension until it comes back"));
            if (this.shouldEnable)
                this.panelWidget.hide();
        }

        function windowsProxy_appeared_callback() {
        }

        function windowsProxy_vanished_callback() {
        }

        // Set-up watchers that watch for required dbus services.
        let dbus_watcher = Gio.bus_watch_name(Gio.BusType.SESSION, 'org.gnome.Hamster',
					      Gio.BusNameWatcherFlags.NONE, apiProxy_appeared_callback.bind(this),
					      apiProxy_vanished_callback.bind(this));

        let dbus_watcher_window = Gio.bus_watch_name(Gio.BusType.SESSION, 'org.gnome.Hamster.WindowServer',
						     Gio.BusNameWatcherFlags.NONE, windowsProxy_appeared_callback.bind(this),
						     windowsProxy_vanished_callback.bind(this));

        this.apiProxy.connectSignal('ActivitiesChanged', this.refreshActivities.bind(this));
        this.refreshActivities();

        Main.panel.menuManager.addMenu(this.panelWidget.menu);
        Main.wm.addKeybinding("show-hamster-dropdown",
			      this.panelWidget._settings,
			      Meta.KeyBindingFlags.NONE,
			      // Since Gnome 3.16, Shell.KeyBindingMode is replaced by Shell.ActionMode
			      Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : Shell.ActionMode.ALL,
			      this.panelWidget.toggle_menu.bind(this.panelWidget)
			     );
    }

    disable() {
        this.shouldEnable = false;
        Main.wm.removeKeybinding("show-hamster-dropdown");

        console.log('Shutting down hamster-shell-extension.');
        this._removeWidget(this.placement);
        Main.panel.menuManager.removeMenu(this.panelWidget.menu);
        this.panelWidget.destroy();
        this.panelWidget = null;
        this.apiProxy = null;
        this.windowsProxy = null;
    }

    /**
     * Build a new cache of all activities present in the backend.
     */
    refreshActivities() {
        if (this.runningActivitiesQuery) {
            return(this.activities);
        }

        this.runningActivitiesQuery = true;
        this.apiProxy.GetActivitiesRemote("", function([response], err) {
            this.reportIfError(_("Failed to get activities"), err);
            this.runningActivitiesQuery = false;
            this.activities = response;
        }.bind(this));
    }

    /**
     * Report an error if one is passed. If error is falsey (e.g.
     * null), nothing is reported.
     */
    reportIfError(msg, error) {
        if (error) {
            // Use toString, error can be a string, exception, etc.
            console.log("error: Hamster: " + msg + ": " + error.toString());
            // Prefix msg to details (second argument), since the
            // details are word-wrapped and the title is not.
            Main.notify("Hamster: " + msg, msg + "\n" + error.toString());
            // Close menu so notification can be seen
            if (this.panelWidget)
                this.panelWidget.close_menu();
        }
    }

    /**
     * Place the actual extension wi
     * get in the right place according to settings.
     */
    _placeWidget(placement, panelWidget) {
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
        } else if (placement == 3) {
            // 'Center'
            Main.panel.addToStatusArea("hamster", this.panelWidget, 1, "center");
        } else {
            // 'Default'
            Main.panel.addToStatusArea("hamster", this.panelWidget, 0, "right");
        }
    }

    _removeWidget(placement) {
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
    }
}

