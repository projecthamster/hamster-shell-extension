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


import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Stuff from '../stuff.js';
import OngoingFactEntry from './ongoingFactEntry.js';
import CategoryTotalsWidget from './categoryTotalsWidget.js';
import TotalTimeWidget from './totalTimeWidget.js';
import TodaysFactsWidget from './todaysFactsWidget.js';

/**
 * Create the widget that ``PanelWidget`` will use to dispay the *raw fact entry* as
 * well as todays facts.
 * @class
 */
var FactsBox = GObject.registerClass(
class FactsBox extends PopupMenu.PopupBaseMenuItem {
    _init(controller, panelWidget) {
        super._init({reactive: false});

        this._controller = controller;

        // Setup main layout box
        let main_box = new St.BoxLayout({style_class: 'hamster-box'});
        main_box.set_vertical(true);
        this.actor.add_child(main_box);

        // Setup *ongoing fact* label and widget
        let _ongoingFactLabel = new St.Label({style_class: 'hamster-box-label'});
        _ongoingFactLabel.set_text(_("What are you doing?"));
        main_box.add_child(_ongoingFactLabel);

        this.ongoingFactEntry = new OngoingFactEntry(this._controller);
        //this.ongoingFactEntry.clutter_text.connect('key-release-event', this._onKeyReleaseEvent.bind(this));
        main_box.add_child(this.ongoingFactEntry);

        let fact_list_label = new St.Label({style_class: 'hamster-box-label'});
        fact_list_label.set_text(_("Today's activities"));
        main_box.add_child(fact_list_label);

        // Scrollbox that will house the list of todays facts
        // Since ``St.Table`` does not implement St.Scrollable, we create a
        // container object that does.
        this.todaysFactsWidget = new TodaysFactsWidget(this._controller, panelWidget);
        this._scrollAdjustment = this.todaysFactsWidget.vscroll.adjustment;
        main_box.add_child(this.todaysFactsWidget);

        // Setup category summery
        this.summaryLabel = new CategoryTotalsWidget();
        main_box.add_child(this.summaryLabel);
        // Setup total time
        this.totalTimeLabel = new TotalTimeWidget();
        main_box.add_child(this.totalTimeLabel);
    }

    // [FIXME]
    // The best solution would be to listen for a 'FactsChanged' Signal that carries the new
    // facts as payload and just refresh with this. But for now we stick with this
    // simpler version.
    refresh(facts, ongoingFact) {
        this.todaysFactsWidget.refresh(facts, ongoingFact);
        this.totalTimeLabel.refresh(facts);
        this.summaryLabel.refresh(facts);

    }

    /**
     * Focus the fact entry and make sure todaysFactsWidget are scrolled to the bottom.
     */
    focus() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, function() {
            this._scrollAdjustment.value = this._scrollAdjustment.upper;
            global.stage.set_key_focus(this.ongoingFactEntry);
        }.bind(this));
    }

    /**
     * Remove any existing focus.
     */
    unfocus() {
        global.stage.set_key_focus(null);
    }
});

export default FactsBox;
