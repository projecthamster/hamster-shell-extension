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
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;

const Gettext = imports.gettext.domain('hamster-shell-extension');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const FactsBox = Me.imports.widgets.factsBox.FactsBox;
const Stuff = Me.imports.stuff;

/**
 * Class that defines the actual extension widget to be shown in the panel.
 *
 *  -------------------------------------------------------------
 *  | Gnome top menu bar  | PanelWidget / PanelWidget.panelLabel|
 *  -------------------------------------------------------------
 *                        |PanelWidget.menu                     |
 *                        |                                     |
 *                        |PanelWidget.factsBox                 |
 *                        |                                     |
 *                        |PanelWidget.overviewMenuItem         |
 *                        |PanelWidget.stopTrackingMenuItem     |
 *                        |PanelWidget.addNewFactMenuItem       |
 *                        |PanelWidget.SettingMenuItem          |
 *                        |                                     |
 *                        ---------------------------------------
 *
 * @class
 */
var PanelWidget = GObject.registerClass(
class PanelWidget extends PanelMenu.Button {
    _init(controller) {
        // [FIXME]
        // What is the parameter?
        super._init(0.0);

        this._controller = controller;
        // [FIXME]
        // Still needed?
        this._extensionMeta = controller.extensionMeta;
        this._settings = controller.settings;
        this._windowsProxy = controller.windowsProxy;

        controller.apiProxy.connectSignal('FactsChanged',      Lang.bind(this, this.refresh));
        controller.apiProxy.connectSignal('TagsChanged',       Lang.bind(this, this.refresh));


        // Setup the main layout container for the part of the extension
        // visible in the panel.
        let panelContainer = new St.BoxLayout({style_class: "panel-box"});
        this.actor.add_actor(panelContainer);
        this.actor.add_style_class_name('panel-status-button');

        this.panelLabel = new St.Label({
            text: _("Loading..."),
            y_align: Clutter.ActorAlign.CENTER
        });

        // If we want to switch icons, we actually keep the same instance and
        // just swap the actual image.
        // [FIXME]
        // Is there no path manipulation lib?
        this._trackingIcon = Gio.icon_new_for_string(this._extensionMeta.path + "/images/hamster-tracking-symbolic.svg");
        this._idleIcon = Gio.icon_new_for_string(this._extensionMeta.path + "/images/hamster-idle-symbolic.svg");
        this.icon = new St.Icon({gicon: this._trackingIcon,
                                 icon_size: 16,
                                 style_class: "panel-icon"});

        panelContainer.add(this.icon);
        panelContainer.add(this.panelLabel);

        this.factsBox = new FactsBox(controller, this);
        this.menu.addMenuItem(this.factsBox);

        // overview
        let overviewMenuItem = new PopupMenu.PopupMenuItem(_("Show Overview"));
        overviewMenuItem.connect('activate', Lang.bind(this, this._onOpenOverview));
        this.menu.addMenuItem(overviewMenuItem);

        // [FIXME]
        // This should only be shown if we have an 'ongoing fact'.
        // stop tracking
        let stopTrackinMenuItem = new PopupMenu.PopupMenuItem(_("Stop Tracking"));
        stopTrackinMenuItem.connect('activate', Lang.bind(this, this._onStopTracking));
        this.menu.addMenuItem(stopTrackinMenuItem);

        // add new task
        let addNewFactMenuItem = new PopupMenu.PopupMenuItem(_("Add Earlier Activity"));
        addNewFactMenuItem.connect('activate', Lang.bind(this, this._onOpenAddFact));
        this.menu.addMenuItem(addNewFactMenuItem);

        // settings
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let SettingMenuItem = new PopupMenu.PopupMenuItem(_("Tracking Settings"));
        SettingMenuItem.connect('activate', Lang.bind(this, this._onOpenSettings));
        this.menu.addMenuItem(SettingMenuItem);

        // focus menu upon display
        this.menu.connect('open-state-changed', Lang.bind(this,
            function(menu, open) {
                if (open) {
                    this.factsBox.focus();
                } else {
                    this.factsBox.unfocus();
                }
            }
        ));

        // refresh the widget every 60 secs
        this.timeout = GLib.timeout_add_seconds(0, 60, Lang.bind(this, this.refresh));
        this.connect('destroy', Lang.bind(this, this._disableRefreshTimer));
        this.refresh();
    }

    /**
     * This is our main 'update/refresh' method.
     * Whenever we suspect that things have changed (via dbus signals)
     * this should be triggered.
     * Upon such triggering, this method should call relevant sub-widget's
     * 'refresh' method.
     * As such it should do as little work as possible and rather gather all
     * required facts etc and pass them to the relevant sub-widget's
     * refresh methods.
     */
    refresh() {
    /**
     * We need to wrap our actual refresh code in this callback for now as
     * I am having major difficulties using a syncronous dbus method call to
     * fetch the array of 'todaysFacts'.
     */
	function _refresh([response], err) {
        /**
         * Extract *ongoing fact* from our list of facts. Due to how *legacy
         * hamster* works this is the first element in the array returned my
         * ``getTodayFacts``.
         *
         * Returns ``null`` if there is no *ongoing fact*.
         */
		function getOngoingFact(facts) {
		    let result = null;
		    if (facts.length) {
			let lastFact = facts[facts.length - 1];
			if (!lastFact.endTime) { result = lastFact; }
		    }
		    return result;
		}

		let facts = [];

        // [FIXME]
        // This seems a rather naive way to handle potential errors.
		if (err) {
		    log(err);
		} else if (response.length > 0) {
		    facts = Stuff.fromDbusFacts(response);
		}

		let ongoingFact = getOngoingFact(facts);

		this.updatePanelDisplay(ongoingFact);
		this.factsBox.refresh(facts, ongoingFact);
	}

    // [FIXME]
    // This should really be a synchronous call fetching the facts.
    // Once this is done, the actual code from the callback should follow
    // here.
    this._controller.apiProxy.GetTodaysFactsRemote(Lang.bind(this, _refresh));
    return GLib.SOURCE_CONTINUE;
    }

    /**
     * Open 'popup menu' containing the bulk of the extension widgets.
     */
    show() {
        this.menu.open();
    }

    /**
     * Close/Open the 'popup menu' depending on previous state.
     */
    toggle() {
        this.menu.toggle();
    }


    /**
     * Update the rendering of the PanelWidget in the panel itself.
     *
     * Depending on the 'display mode' set in the extensions settings this has
     * slightly different consequences.
     */
    updatePanelDisplay(fact) {
        /**
         * Return a text string representing the passed fact suitable for the panelLabel.
         *
         * @param fact The fact to be represented. Be advised. If there is no
         * *ongoing fact* this will be ``null``!
         */
        function getLabelString(fact) {
            let result = _("No activity");
            if (fact) {
                result = "%s %s".format(fact.name, Stuff.formatDuration(fact.delta));
            }
            return result;
        }
        /**
         * Returns the appropriate icon image depending on ``fact``.
         */
        function getIcon(panelWidget) {
            let result = panelWidget._idleIcon;
            if (fact) { result = panelWidget._trackingIcon; }
            return result;
        }

        // 0 = show label, 1 = show just icon, 2 = show label and icon
        switch (this._settings.get_int("panel-appearance")) {
            case 0:
                this.panelLabel.set_text(getLabelString(fact));
                this.panelLabel.show();
                this.icon.hide();
                break;
            case 1:
                this.icon.gicon = getIcon(this);
                this.icon.show();
                this.panelLabel.hide();
                break;
            case 2:
                this.icon.gicon = getIcon(this);
                this.icon.show();
                this.panelLabel.set_text(getLabelString(fact));
                this.panelLabel.show();
                break;
        }
    }

    /**
     * Disable the refresh timer.
     *
     * @callback panelWidget~_disableRefreshTimer
     *
     * This method is actually a callback triggered on the destroy
     * signal.
     */
    _disableRefreshTimer() {
        GLib.source_remove(this.timeout);
    }

    /**
     * Callback to be triggered when an *ongoing fact* is stopped.
     * @callback PanelWidget~_onStopTracking
     *
     * This will get the current time and issue the ``StopTracking``
     * method call to the dbus interface.
     */
    _onStopTracking() {
        let now = new Date();
        let epochSeconds = Date.UTC(now.getFullYear(),
                                    now.getMonth(),
                                    now.getDate(),
                                    now.getHours(),
                                    now.getMinutes(),
                                    now.getSeconds());
        epochSeconds = Math.floor(epochSeconds / 1000);
        this._controller.apiProxy.StopTrackingRemote(GLib.Variant.new('i', [epochSeconds]));
    }

    /**
     * Callback that triggers opening of the *Overview*-Window.
     *
     * @callback panelWidget~_onOpenOverview
     */
    _onOpenOverview() {
        this._controller.windowsProxy.overviewSync();
    }

    /**
     * Callback that triggers opening of the *Add Fact*-Window.
     *
     * @callback panelWidget~_onOpenAddFact
     */
    _onOpenAddFact() {
        this._controller.windowsProxy.editSync(GLib.Variant.new('i', [0]));
    }

    /**
     * Callback that triggers opening of the *Add Fact*-Window.
     *
     * @callback panelWidget~_onOpenSettings
     *
     * Note: This will open the GUI settings, not the extension settings!
     */
    _onOpenSettings() {
        this._controller.windowsProxy.preferencesSync();
    }
});
