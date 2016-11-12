const Lang = imports.lang;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Stuff = Me.imports.stuff;


/**
 * Custom Label widget that displays category totals.
 */
const CategoryTotalsWidget = new Lang.Class({
    Name: 'CategoryTotals',
    Extends: St.Label,

    _init: function() {
        this.parent({style_class: 'summary-label'});

    },

    /**
     * Recompute values and replace old string with new one based on passed facts.
     */
    refresh: function(facts) {
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
            };

            let string = "";
            for (let category of categories) {
                string += category + ": " + Stuff.formatDurationHours(byCategory[category]) +  ", ";
            };
            // strip trailing comma
            return string.slice(0, string.length - 2);
        };

        this.set_text(getString(facts))
    },
});
