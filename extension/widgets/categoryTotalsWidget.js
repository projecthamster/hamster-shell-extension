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


const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Stuff = Me.imports.stuff;


/**
 * Custom Label widget that displays category totals.
 */
var CategoryTotalsWidget = GObject.registerClass(
class CategoryTotals extends St.Label {
    _init() {
        super._init({style_class: 'summary-label'});
    }

    /**
     * Recompute values and replace old string with new one based on passed facts.
     */
    refresh(facts) {
        /**
         * Construct a string representing category totals.
         */
        function getString(facts) {
            let byCategory = {};
            let categories = [];
            for (let fact of facts) {
                byCategory[fact.category] = (byCategory[fact.category] || 0) + fact.delta;
                if (categories.indexOf(fact.category) == -1)
                    categories.push(fact.category);
            }

            let string = "";
            for (let category of categories) {
                string += category + ": " + Stuff.formatDurationHours(byCategory[category]) +  ", ";
            }
            // strip trailing comma
            return string.slice(0, string.length - 2);
        }

        this.set_text(getString(facts));
    }
});
