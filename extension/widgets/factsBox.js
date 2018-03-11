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
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Stuff = Me.imports.stuff;
const OngoingFactEntry = Me.imports.widgets.ongoingFactEntry.OngoingFactEntry;
const CategoryTotalsWidget = Me.imports.widgets.categoryTotalsWidget.CategoryTotalsWidget;
const TodaysFactsWidget = Me.imports.widgets.todaysFactsWidget.TodaysFactsWidget;


/**
 * Create the widget that ``PanelWidget`` will use to dispay the *raw fact entry* as
 * well as todays facts.
 * @class
 */
var FactsBox = new Lang.Class({
    Name: 'FactsBox',
    Extends: PopupMenu.PopupBaseMenuItem,
    _init: function(controller, panelWidget) {
        this.parent({reactive: false});

        this._controller = controller;

        // Setup main layout box
        let main_box = new St.BoxLayout({style_class: 'hamster-box'});
        main_box.set_vertical(true);
        this.actor.add_child(main_box);

        // Setup *ongoing fact* label and widget
        let _ongoingFactLabel = new St.Label({style_class: 'hamster-box-label'});
        _ongoingFactLabel.set_text(_("What are you doing?"));
        main_box.add(_ongoingFactLabel);

        this.ongoingFactEntry = new OngoingFactEntry(this._controller);
        //this.ongoingFactEntry.clutter_text.connect('key-release-event', Lang.bind(this, this._onKeyReleaseEvent));
        main_box.add(this.ongoingFactEntry);

        let fact_list_label = new St.Label({style_class: 'hamster-box-label'});
        fact_list_label.set_text(_("Today's activities"));
        main_box.add(fact_list_label);

        // Scrollbox that will house the list of todays facts
        // Since ``St.Table`` does not implement St.Scrollable, we create a
        // container object that does.
        this.todaysFactsWidget = new TodaysFactsWidget(this._controller, panelWidget);
        this._scrollAdjustment = this.todaysFactsWidget.vscroll.adjustment;
        main_box.add(this.todaysFactsWidget);

        // Setup category summery
        this.summaryLabel = new CategoryTotalsWidget();
        main_box.add(this.summaryLabel);
    },

    // [FIXME]
    // The best solution would be to listen for a 'FactsChanged' Signal that carries the new
    // facts as payload and just refresh with this. But for now we stick with this
    // simpler version.
    refresh: function(facts, ongoingFact) {
        this.todaysFactsWidget.refresh(facts, ongoingFact);
        this.summaryLabel.refresh(facts);

    },

    /**
     * Focus the fact entry and make sure todaysFactsWidget are scrolled to the bottom.
     */
    focus: function() {
        Mainloop.timeout_add(20, Lang.bind(this, function() {
            this._scrollAdjustment.value = this._scrollAdjustment.upper;
            global.stage.set_key_focus(this.ongoingFactEntry);
        }));
    },

    /**
     * Remove any existing focus.
     */
    unfocus: function() {
        global.stage.set_key_focus(null);
    },
});
