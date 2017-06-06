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

const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const PanelWidget = Me.imports.widgets.panelWidget.PanelWidget;
const Util = imports.misc.util;

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

        enable: function() {
            Util.spawn(['/usr/bin/hamster-service']);
            Util.spawn(['/usr/bin/hamster-windows-service']);
            GLib.timeout_add_seconds(0, 5, Lang.bind(this, this.lazyEnable));
        },

        disable: function() {
            Main.wm.removeKeybinding("show-hamster-dropdown");

            this._removeWidget(this.placement)
            Main.panel.menuManager.removeMenu(this.panelWidget.menu);
            GLib.source_remove(this.panelWidget.timeout);
            this.panelWidget.actor.destroy();
            this.panelWidget.destroy();
            this.panelWidget = null;
        },

        /**
         * Build a new cache of all activities present in the backend.
         */
        refreshActivities: function() {
            /**
             * Return an Array of [Activity.name, AcAivity.category.name] Arrays.
             *
             */
            function getActivities(controller) {
                // [FIXME]
                // It seems preferable to have a sync methods call in order to
                // avoid race conditions (previously extensions used async
                // version).
                // There is however a reasonable risk this may actually be a bad
                // idea as it may block the entire shell if the request takes too
                // long. This may be particulary likly if the dbus service uses
                // a remote database as persistent storage.
                // We need to come back to this once we have the low hanging fruits
                // covered.
                let activities = controller.apiProxy.GetActivitiesSync('');
                // [FIXME]
                // For some bizare reason I am unable to create a proper array out
                // of the return value of the dbus method call any other way.
                // So unless can provide some insight here, this hack does the job.
                let foo = function([activities]) {
                    return activities;
                };
                return foo(activities);
            };

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
                let activitiesMenu = Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0]
                    // If our widget replaces the 'Activities' menu in the panel,
                    // this property stores the original text so we can restore it
                    // on ``this.disable``.
                this._activitiesText = activitiesMenu.get_text();
                activitiesMenu.set_text('');
                Main.panel.addToStatusArea("hamster", this.panelWidget, 1, "left");
            } else {
                // 'Default'
                Main.panel.addToStatusArea("hamster", this.panelWidget, 0, "right");
            };
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
            } else if (placement == 2) {
                // We replaced the 'Activities' menu
                let activitiesMenu = Main.panel._leftBox.get_children()[0].get_children()[0].get_children()[0].get_children()[0]
                activitiesMenu.set_text(this._activitiesText);
            };
        },
        lazyEnable: function(proxy, sender) {
            this.apiProxy = new ApiProxy(Gio.DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster');
            this.windowsProxy = new WindowsProxy(Gio.DBus.session, "org.gnome.Hamster.WindowServer", "/org/gnome/Hamster/WindowServer");
            if (!this.testAPI()) {
                return false;
            }
            this.apiProxy.connectSignal('ActivitiesChanged', Lang.bind(this, this.refreshActivities));
            this.activities = this.refreshActivities();
            this.settings = Convenience.getSettings();
            this.panelWidget = new PanelWidget(this);
            this.placement = this.settings.get_int("panel-placement");

            this._placeWidget(this.placement, this.panelWidget)

            Main.panel.menuManager.addMenu(this.panelWidget.menu);
            Main.wm.addKeybinding("show-hamster-dropdown",
                this.panelWidget._settings,
                Meta.KeyBindingFlags.NONE,
                // Since Gnome 3.16, Shell.KeyBindingMode is replaced by Shell.ActionMode
                Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : Shell.ActionMode.ALL,
                Lang.bind(this.panelWidget, this.panelWidget.toggle)
            );
            return false;
        },
        testAPI: function() {
            try {
                ApiProxy(Gio.DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster')
            } catch (err) {
                global.log(err);
                button = new St.Bin();
                let icon = new St.Icon({
                    icon_name: 'error',
                    style_class: 'error-icon'
                });
                button.set_child(icon);
                Main.panel._rightBox.insert_child_at_index(button, 0);
                Main.notify(_("Hamster widget: Dbus connection failed "));
                return false;
            }

            return true;

        },
    };
};


function init(extensionMeta) {
    Convenience.initTranslations("hamster-shell-extension");
    return new Controller(extensionMeta);
}
