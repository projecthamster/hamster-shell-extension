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
Copyright (c) 2016 - 2017 Eric Goller / projecthamster <elbenfreund@projecthamster.org>
*/


// Time formatting helpers

/* @function formatDuration
 *
 * Return time-information formatted as '%MM:%SS'
 *
 * @param {int} - Total amount of seconds to represent.
 */
function formatDuration(seconds) {
    minutes = seconds / 60;
    seconds = seconds % 60;
    // This string formatting is not part of JS canon but provided by the shell environment.
    return "%02d:%02d".format(minutes, seconds);
}

/* @function formatDurationHuman
 *
 * Return time-information as '%HHh %SSmin' or '%SSmin' (if hours=0).
 *
 * @param {int} - Total amount of seconds to represent.
 */
function formatDurationHuman(total_seconds) {
    let hours = total_seconds / 3600;
    let remaining_seconds = total_seconds % 3600;
    // We only care for "full minutes".
    let minutes = remaining_seconds / 60;

    let result = ''

    if (hours > 0 || minutes > 0) {
        if (hours > 0) {
            result += "%dh ".format(hours);
        }

        if (minutes > 0) {
            result += "%dmin".format(minutes);
        }
    } else {
        result = "Just started";
    }

    return result;
}

/* @function formatDurationHours
 *
 * Return time-information as decimal (with one decimal place) amount of hours.
 * Example: 'X.Yh'
 *
 * @param {int} - Total amount of seconds to represent.
 */
function formatDurationHours(seconds) {
    // We shift by one decimal place to the left in order to round properly.
    let hours = Math.round((seconds/3600)*10);
    // Shift right after rounding.
    hours = hours / 10;
    return '%2dh'.format(hours);
}

// Other helper functions

function fromDbusFact(fact) {
    // converts a fact coming from dbus into a usable object
    function UTCToLocal(timestamp) {
        // TODO - is this really the way?!
        let res = new Date(timestamp);
        return new Date(res.setUTCMinutes(res.getUTCMinutes() + res.getTimezoneOffset()));
    }

    let result = {
        name: fact[4],
        startTime: UTCToLocal(fact[1]*1000),
        endTime: fact[2] != 0 ? UTCToLocal(fact[2]*1000) : null,
        description: fact[3],
        activityId: fact[5],
        category: fact[6],
        tags: fact[7],
        date: UTCToLocal(fact[8] * 1000),
        delta: fact[9],
        id: fact[0]
    };
    return result;
};

function fromDbusFacts(facts) {
    let res = [];
    for (var fact of facts) {
        res.push(fromDbusFact(fact));
    }

    return res;
};
