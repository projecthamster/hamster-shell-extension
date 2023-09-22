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
Copyright (c) 2018 Thibaut Madelaine <madtibo_git@tribu-ml.fr>
*/

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Stuff from '../stuff.js';

/**
 * Custom Label widget that displays total time.
 */
var TotalTimeWidget = GObject.registerClass(
  class TotalTime extends St.Label {
    _init() {
      super._init({style_class: 'summary-label'});
    }

    /**
     * Recompute values and replace old string with new one based on passed facts.
     */
    refresh(facts) {
        /**
         * Construct a string representing today total.
         */
        function getString(facts) {
            let totalTime = 0;
            for (let fact of facts) {
                totalTime += fact.delta;
            }

            let string = "Total: " + Stuff.formatDurationHours(totalTime);
            return string;
        }

        this.set_text(getString(facts));
    }
});

export default TotalTimeWidget;
