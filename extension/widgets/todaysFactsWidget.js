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
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Stuff = Me.imports.stuff;


/**
 * A widget that lists all facts for *today*.
 */
var TodaysFactsWidget = new Lang.Class({
    Name: 'TodaysFactsWidget',
    Extends: St.ScrollView,

    _init: function(controller, panelWidget) {
        this.parent({style_class: 'hamster-scrollbox'});
        this._controller = controller;
        this._panelWidget = panelWidget;


        this.factsBox = new St.BoxLayout({});
        this.factsBox.set_vertical(true);
        this.facts_widget = new St.Widget({
            style_class: 'hamster-activities',
            layout_manager: new Clutter.TableLayout(),
            reactive: true
        });
        this.factsBox.add(this.facts_widget);
        this.add_actor(this.factsBox);

    },

    /**
     * Populate the widget with rows representing the passed facts.
     */
    populateFactsWidget: function(facts, ongoingFact) {

        /**
         * Construct an individual row within the widget - representing a single fact.
         */
        function constructRow(fact, ongoingFact, controller, menu) {
            /**
             * Check if two facts have the same activity.
             */
            function checkSameActivity(fact, otherFact) {
                // Check if two facts have the same activity.
                let result = true;
                if (!otherFact ||
                    otherFact.name != fact.name ||
                    otherFact.category != fact.category ||
                    // [FIXME]
                    // This is wrong, isn't it? Tags 'belong' to facts, not
                    // activities! We keep it for now and need to address this
                    // as a single issue.
                    otherFact.tags.join(",") != fact.tags.join(",")) {
                        result = false;
                    }
                return result;
            }

            /**
             * Callback for the 'openEditDialog'-Button.
             *
             * Opens the edit dialog and closes the extension 'drop down
             *  bubble' menu.
             *
             * @callback TodaysFactsWidget~openEditDialog
             */
            function onOpenEditDialog(button, event) {
                controller.windowsProxy.editSync(GLib.Variant.new('i', [fact.id]));
                menu.close();
            }

            /**
             * Callback for the 'onContinue'-Button.
             *
             * Start a new ongoing fact with this facts activity and tags.
             * Closes the menu.
             *
             * @callback TodaysFactsWidget~onContinueButton
             */
            function onContinueButton(button, event) {
                // [FIXME]
                // This probably should be a "serialize" method of the fact object.
                let fact = button.fact;
                let factStr = fact.name + "@" + fact.category + ", " + (fact.description);
                if (fact.tags.length) {
                    factStr += " #" + fact.tags.join(", #");
                }

                controller.apiProxy.AddFactRemote(factStr, 0, 0, false, Lang.bind(this, function(response, err) {
                    // not interested in the new id - this shuts up the warning
                }));
                menu.close();
            }

            // Construct the ``Label`` rendering the start- and endtime information.
            let timeLabel = new St.Label({style_class: 'cell-label'});
            let timeString;
            let start_string = "%02d:%02d - ".format(fact.startTime.getHours(), fact.startTime.getMinutes());
            if (fact.endTime) {
                let end_string = "%02d:%02d".format(fact.endTime.getHours(), fact.endTime.getMinutes());
                timeString = start_string + end_string;
            } else {
                timeString = start_string;
            }
            timeLabel.set_text(timeString);

            // Construct the ``Label``rendering the remaining fact info.
            let factLabel = new St.Label({style_class: 'cell-label'});
            // [FIXME]
            // This needs to be cleaner!
            factLabel.set_text(fact.name + (0 < fact.tags.length ? (" #" + fact.tags.join(", #")) : ""));

            // Construct the ``Label rendering the facts duration.
            let deltaLabel = new St.Label({style_class: 'cell-label'});
            deltaLabel.set_text(Stuff.formatDurationHuman(fact.delta));

            // Construct a button that triggers 'edit' dialog.
            let editIcon = new St.Icon({icon_name: "document-open-symbolic", icon_size: 16});
            let editButton = new St.Button({style_class: 'clickable cell-button'});
            editButton.set_child(editIcon);
            // [FIXME]
            // Wouldn't it be cleaner to pass the fact as data payload to the callback binding?
            editButton.connect('clicked', Lang.bind(this, onOpenEditDialog));

            // Construct a 'start previous fact's activity as new' button.
            // This is only done if the *ongoing fact* activity is actually
            // different from the one we currently process.
            let continueButton = null;
            if (!checkSameActivity(fact, ongoingFact)) {

                let continueIcon = new St.Icon({icon_name: "media-playback-start-symbolic", icon_size: 16});
                continueButton = new St.Button({style_class: 'clickable cell-button'});
                continueButton.set_child(continueIcon);
                continueButton.fact = fact;
                continueButton.connect('clicked', Lang.bind(this, onContinueButton));
            }

            //The order of the array will be the order in which they will be added to the row.
            let result = [timeLabel, factLabel, deltaLabel, editButton];

            if (continueButton) {
                result.push(continueButton);
            }
            return result;

        }

        let rowCount = 0;
        let layout = this.facts_widget.layout_manager;
        for (let fact of facts) {
            let rowComponents = constructRow(fact, ongoingFact, this._controller, this._panelWidget.menu);
            for (let component of rowComponents) {
                layout.pack(component, rowComponents.indexOf(component), rowCount);
            }
            rowCount += 1;
        }
    },

    /**
     * Clear the widget and populate it anew.
     */
    refresh: function(facts, ongoingFact) {
        this.facts_widget.remove_all_children();
        this.populateFactsWidget(facts, ongoingFact);
    },
});
