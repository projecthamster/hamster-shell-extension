/*
 * Simple Hamster extension for gnome-shell
 * Copyright (c) 2011 Jerome Oufella <jerome@oufella.com>
 * Copyright (c) 2011 Toms Baugis <toms.baugis@gmail.com>
 * Portions originate from the gnome-shell source code, Copyright (c)
 * its respectives authors.
 * This project is released under the GNU GPL License.
 * See COPYING for details.
 *
 */

const DBus = imports.dbus;
const GLib = imports.gi.GLib
const Lang = imports.lang;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Util = imports.misc.util;
const Gettext = imports.gettext;
const _ = Gettext.gettext;

/* We use keybindings provided by default in the metacity GConf tree, and which
 * are supported by default.
 * Most probably not the smartest choice, time will tell.
 */
const _hamsterKeyBinding = 'run_command_12';


// this is plain stupid - why are we not using dbus introspection here or something?
const HamsterIface = {
    name: 'org.gnome.Hamster',
    methods: [
		{ name: 'GetTodaysFacts', inSignature: '', outSignature: 'a(iiissisasii)'},
		{ name: 'StopTracking', inSignature: 'i'},
		{ name: 'Toggle', inSignature: ''},
        { name: 'AddFact', inSignature: 'ssiib', outSignature: 'i'},    ],
    signals: [
        {name: 'TagsChanged', inSignature: ''},
        {name: 'FactsChanged', inSignature: ''},
        {name: 'ActivitiesChanged', inSignature: ''},
        {name: 'ToggleCalled', inSignature: ''},
    ]
};
let HamsterProxy = DBus.makeProxyClass(HamsterIface);


function formatDuration(minutes) {
	return "%02d:%02d".format((minutes - minutes % 60) / 60, minutes % 60)
}

function formatDurationHuman(minutes) {
	let hours = (minutes - minutes % 60) / 60;
	let mins = minutes % 60;
	let res = ""

	if (hours > 0 || mins > 0) {
		if (hours > 0)
			res += "%dh ".format(hours)

		if (mins > 0)
			res += "%dmin".format(mins)
	} else {
		res = "Just started"
	}

	return res;
}

function fromDbusFact(fact) {
	// converts a fact coming from dbus into a usable object
	function UTCToLocal(timestamp) {
		// TODO - is this really the way?!
		let res = new Date(timestamp)
		return new Date(res.setUTCMinutes(res.getUTCMinutes() + res.getTimezoneOffset()));
	}

    return {
		name: fact[4],
		startTime: UTCToLocal(fact[1]*1000),
		endTime: fact[2] != 0 ? UTCToLocal(fact[2]*1000) : null,
		description: fact[3],
		activityId: fact[5],
		category: fact[6],
		tags: fact[7],
		date: UTCToLocal(fact[8] * 1000),
		delta: Math.floor(fact[9] / 60), // minutes
		id: fact[0]
	}
};

function fromDbusFacts(facts) {
	let res = [];
	for each(var fact in facts) {
		res.push(fromDbusFact(fact));
	}

	return res;
};


function moveCalendar() {
	// moving calendar to the left side (hummm....)
	let calendar = Main.panel._dateMenu.actor;
	let calendarFound = false;
	for each(var elem in Main.panel._centerBox.get_children()) {
		if (elem == calendar) {
			calendarFound = true;
		}
	}

	if (calendarFound) {
		Main.panel._centerBox.remove_actor(calendar)
		Main.panel._rightBox.add_actor(calendar)
	}
}


/* Popup */
function HamsterPopupMenuEntry() {
	this._init.apply(this, arguments);
}


/* a little box or something */
function HamsterBox() {
	this._init.apply(this, arguments);
}

HamsterBox.prototype = {
	__proto__: PopupMenu.PopupBaseMenuItem.prototype,

	_init: function(itemParams) {
		PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {reactive: false});

		let box = new St.BoxLayout({style_class: 'hamster-box'});
		box.set_vertical(true);

		let label = new St.Label({ style_class: 'hamster-box-label'});
		label.set_text("What are you doing?")
		box.add(label);

		this._textEntry = new St.Entry({name: 'searchEntry',
										can_focus: true,
										track_hover: false,
										hint_text: _("Enter activity...")});
		this._textEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
		box.add(this._textEntry);


		let scrollbox = new St.ScrollView({ x_fill: true, y_fill: true });
		scrollbox.get_hscroll_bar().hide();
		//box.add(scrollbox, {expand: true})


		label = new St.Label({ style_class: 'hamster-box-label'});
		label.set_text("Todays activities")
		box.add(label);


		this.activities = new St.Table({ style_class: 'hamster-activities'})
		box.add(this.activities)

		this.addActor(box);
	},


	_onEntryActivated: function() {
		this.emit('activate');
		this._textEntry.set_text('');
	}
};



/* Panel button */
function HamsterButton() {
	this._init();
}

HamsterButton.prototype = {
	__proto__: PanelMenu.Button.prototype,

	_init: function() {
		PanelMenu.Button.prototype._init.call(this, 0.0);

		this._proxy = new HamsterProxy(DBus.session, 'org.gnome.Hamster', '/org/gnome/Hamster');
		this._proxy.connect('FactsChanged', Lang.bind(this, this.onFactsChanged));
		this._proxy.connect('ActivitiesChanged', Lang.bind(this, this.onActivitiesChanged));
		this._proxy.connect('TagsChanged', Lang.bind(this, this.onTagsChanged));



		this._settings = new Gio.Settings({ schema: 'org.gnome.hamster' });

		this.panel_label = new St.Label({ style_class: 'hamster-label', text: _("Loading...") });
		this.current_activity = false; 
		this.actor.add_actor(this.panel_label);

		let item = new HamsterBox()
		item.connect('activate', Lang.bind(this, this._onActivityEntry));
		this._activityEntry = item;
		this.menu.addMenuItem(item);

        /* This one make the hamster add earlier activity window appear */
        item = new PopupMenu.PopupMenuItem(_("Add Earlier Activity"));
        item.connect('activate', Lang.bind(this, this._onShowHamsterEdit));
        this.menu.addMenuItem(item);

        item = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(item);

		/* This one make the hamster applet appear */
		item = new PopupMenu.PopupMenuItem(_("Open Applet"));
		item.connect('activate', Lang.bind(this, this._onShowHamsterActivate));
		this.menu.addMenuItem(item);

		/* To stop tracking the current activity */
		item = new PopupMenu.PopupMenuItem(_("Stop tracking"));
		item.connect('activate', Lang.bind(this, this._onStopTracking));
        this.menu.addMenuItem(item);

        item = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(item);

        /* This one make the hamster overview appear */
        item = new PopupMenu.PopupMenuItem(_("Show Overview"));
        item.connect('activate', Lang.bind(this, this._onShowHamsterOverview));
        this.menu.addMenuItem(item);

        /* This one make the hamster statistics appear */
        item = new PopupMenu.PopupMenuItem(_("Show Statistics"));
        item.connect('activate', Lang.bind(this, this._onShowHamsterStatistics));
        this.menu.addMenuItem(item);

        item = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(item);

        /* To edit hamster preferences */
        item = new PopupMenu.PopupMenuItem(_("Preferences"));
        item.connect('activate', Lang.bind(this, this._onEditPreferences));
		this.menu.addMenuItem(item);

		/* Integrate previously defined menu to panel */
		Main.panel._rightBox.insert_actor(this.actor, 0);
		Main.panel._menus.addMenu(this.menu);

 		/* Install global keybinding to log something */
		let shellwm = global.window_manager;
		shellwm.takeover_keybinding(_hamsterKeyBinding);
		shellwm.connect('keybinding::' + _hamsterKeyBinding,
		Lang.bind(this, this._onGlobalKeyBinding));

		// load data
		this.facts = null;
		this.currentFact = null;
		// refresh the label every 60 secs
		GLib.timeout_add_seconds(0, 60, Lang.bind(this, function () {this.refresh(); return true}))
		this.refresh();
	},

	onTagsChanged: function() {
		this.refresh();
	},

	onFactsChanged: function() {
		this.refresh();
	},

	onActivitiesChanged: function() {
		this.refresh();
	},


	refresh: function() {
    	this._proxy.GetTodaysFactsRemote(DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
			let facts = fromDbusFacts(response);

    	    let fact = null;
    	    if (facts.length) {
    	        fact = facts[facts.length - 1];
    	    }

    	    if (fact && !fact.endTime) {
				this.currentFact = fact;

        	    this.panel_label.text = "%s %s".format(fact.name, formatDuration(fact.delta));
 				this.current_activity = true;
    	    } else {
        	    this.panel_label.text = "No activity";
				this.current_activity = false;
    	    }


			let activities = this._activityEntry.activities
			activities.destroy_children() // remove previous entries

			var i = 0;
			for each (var fact in facts) {
				let label;

				label = new St.Label({ style_class: 'cell-label'});
				let text = "%02d:%02d - ".format(fact.startTime.getHours(), fact.startTime.getMinutes());
				if (fact.endTime) {
					text += "%02d:%02d".format(fact.endTime.getHours(), fact.endTime.getMinutes());
				}
				label.set_text(text)
				activities.add(label, { row: i, col: 0, x_expand: false});

 				button = new St.Button({ style_class: 'clickable'});
				label = new St.Label({ style_class: 'cell-label'});
				label.set_text(fact.name)
				button.set_child(label);
				activities.add(button, { row: i, col: 1});

				button.connect('clicked', Lang.bind(this, function(actor, event) {
 					let text = actor.get_child().get_text();
					if (!this.current_activity) {
                        this._proxy.AddFactRemote(text, '', 0, 0, false, Lang.bind(this, function(response, err) {
 							// not interested in the new id - this shuts up the warning
						}));
					}
 				}));

				label = new St.Label({style_class: 'cell-label'});
				label.set_text(formatDurationHuman(fact.delta))
				activities.add(label, { row: i, col: 2, x_expand: false});
				i += 1;
			}

    	}));
	},

	_onStopTracking: function() {
		let date = new Date()
		date = new Date(date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset())); // getting back to UTC

		let epochSeconds = Math.floor(date.getTime() / 1000);
		this._proxy.StopTrackingRemote(epochSeconds, DBus.CALL_FLAG_START);
	},

	_onShowHamsterActivate: function() {
		let app = Shell.AppSystem.get_default().lookup_app('hamster-time-tracker.desktop');
		app.activate(-1);
	},

    _onShowHamsterEdit: function() {
        Main.Util.spawnCommandLine('/usr/bin/hamster-time-tracker edit');
    },

    _onShowHamsterOverview: function() {
        Main.Util.spawnCommandLine('/usr/bin/hamster-time-tracker overview');
    },

    _onShowHamsterStatistics: function() {
        Main.Util.spawnCommandLine('/usr/bin/hamster-time-tracker statistics');
    },

    _onEditPreferences: function() {
        Main.Util.spawnCommandLine('/usr/bin/hamster-time-tracker preferences');
    },

	_onActivityEntry: function() {
		let text = this._activityEntry._textEntry.get_text();
		this._proxy.AddFactRemote(text, '', 0, 0, false, DBus.CALL_FLAG_START, Lang.bind(this, function(response, err) {
			// not interested in the new id - this shuts up the warning
		}));
	},

	_onGlobalKeyBinding: function() {
		this.menu.toggle();
		this._activityEntry._textEntry.grab_key_focus();
	}
};

let _extension; // a global variable, niiiice

function init(extensionMeta) {
	/* Localization stuff */
	let userExtensionLocalePath = extensionMeta.path + '/locale';
	Gettext.bindtextdomain("hamster-applet", userExtensionLocalePath);
	Gettext.textdomain("hamster-applet");
}

function enable() {
    _extension = new HamsterButton();

	let _settings = new Gio.Settings({ schema: 'org.gnome.hamster' });
	if (_settings.get_boolean("swap-with-calendar")) {
		moveCalendar();

		// if you go straight for the centerbox you fall into rightBox
		// this little jiggle does the trick (and i have no clue why)
		Main.panel._rightBox.add_actor(_extension.actor);
		Main.panel._rightBox.remove_actor(_extension.actor);

		Main.panel._centerBox.add_actor(_extension.actor);
	} else {
		Main.panel._rightBox.add_actor(_extension.actor);
	}
}

function disable() {
	let _settings = new Gio.Settings({ schema: 'org.gnome.hamster' });
	if (_settings.get_boolean("swap-with-calendar")) {
		Main.panel._centerBox.remove_actor(_extension.actor);
	} else {
		Main.panel._rightBox.remove_actor(_extension.actor);
	}

    _extension.destroy();
}
