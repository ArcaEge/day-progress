import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';


export default class DayProgress extends Extension {
    enable() {
        // Uncomment for easier debug
        // global.dayprogress = this;

        // Create a panel button
        this._indicator = new PanelMenu.Button(0.5, this.metadata.name, false);

        // Get settings
        this._settings = this.getSettings();

        // Get show elapsed key
        this.showElapsed = this._settings.get_boolean('show-elapsed');
        this.showElapsedHandle = this._settings.connect('changed::show-elapsed', (settings, key) => {
            this.showElapsed = settings.get_boolean(key);
            this.updateBar();
        });

        // Width
        this.width = this._settings.get_int('width') / 5;

        // Height
        this.height = this._settings.get_int('height') / 5;

        // Circular
        this.circular = this._settings.get_boolean('circular');

        // Create UI elements
        this.box = new St.BoxLayout({
            // style: `border-width: 1px; border-color: rgba(220, 220, 220, 1); height: 20px; border-radius: 10px; background-color: rgb(255, 255, 255); width: 40px;`, // border-width: 1px; border-color: rgba(220, 220, 220, 1); height: 10px; border-radius: 10px; background-color: rgba(255, 255, 255, 0.2)
            xAlign: Clutter.ActorAlign.CENTER,
            xExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: true,
        });

        this.container = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            style: ``, // width: 2.5em; height: 0.85em; background-color: rgba(255, 255, 255, 0.0); border-radius: 1em; border-width: 0.1em; overflow: hidden;
            styleClass: 'container',
        });

        this.border = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            styleClass: 'border',
        });

        this.bar = new St.Bin({
            styleClass: 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.box.add_child(this.container);
        this.container.add_child(this.border);
        this.border.add_child(this.bar);
        this._indicator.add_child(this.box);

        // Add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Width
        this.widthHandle = this._settings.connect('changed::width', (settings, key) => {
            this.width = settings.get_int(key) / 5;
            this.calculateStyles();
            this.updateBar();
        });

        // Height
        this.heightHandle = this._settings.connect('changed::height', (settings, key) => {
            this.height = settings.get_int(key) / 5;
            this.calculateStyles();
            this.updateBar();
        });

        // Circular
        this.circularHandle = this._settings.connect('changed::circular', (settings, key) => {
            this.circular = settings.get_boolean(key);
            this.calculateStyles();
            this.updateBar();
        });

        // Start time
        this.startHour = this._settings.get_int('start-hour');
        this.startHourHandle = this._settings.connect('changed::start-hour', (settings, key) => {
            this.startHour = settings.get_int(key);
            this.updateBar();
        });

        this.startMinute = this._settings.get_int('start-minute');
        this.startMinuteHandle = this._settings.connect('changed::start-minute', (settings, key) => {
            this.startMinute = settings.get_int(key);
            this.updateBar();
        });

        // Reset times
        this.resetHour = this._settings.get_int('reset-hour');
        this.resetHourHandle = this._settings.connect('changed::reset-hour', (settings, key) => {
            this.resetHour = settings.get_int(key);
            this.updateBar();
        });

        this.resetMinute = this._settings.get_int('reset-minute');
        this.resetMinuteHandle = this._settings.connect('changed::reset-minute', (settings, key) => {
            this.resetMinute = settings.get_int(key);
            this.updateBar();
        });

        // Panel position
        this.panelPosition = this._settings.get_int('panel-position');
        this.panelPositionHandle = this._settings.connect('changed::panel-position', (settings, key) => {
            this.panelPosition = settings.get_int(key);
            this.applyPosition();
        });

        this.panelIndex = this._settings.get_int('panel-index');
        this.panelIndexHandle = this._settings.connect('changed::panel-index', (settings, key) => {
            this.panelIndex = settings.get_int(key);
            this.applyPosition();
        });

        this.applyPosition();
        this.calculateStyles();

        // Update bar now to immediately populate it
        this.updateBar();

        this.timerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this.updateBar();
            return GLib.SOURCE_CONTINUE;
        });

        // Add a menu item to open the preferences window
        this._indicator.menu.addAction(_('Preferences'),
            () => this.openPreferences());
    }

    calculateStyles() {
        this.container.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';;
        this.border.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';;
    }

    // Update the bar
    updateBar() {
        const localDateTime = GLib.DateTime.new_now_local();
        const percentElapsedOfPeriod = (() => {
            // Current time as a fraction of the day
            const currentTimeFraction = (localDateTime.get_hour() + localDateTime.get_minute() / 60 + localDateTime.get_second() / 3600) / 24;
            
            // Start time as a fraction of the day
            const startTimeFraction = this.startHour / 24 + this.startMinute / (60 * 24);

            // End time as a fraction of the day
            const endTimeFraction = this.resetHour / 24 + this.resetMinute / (60 * 24);
            
            // Duration of the period as a fraction of the day
            let periodDuration = endTimeFraction - startTimeFraction;

            // If start time is in the future
            if (startTimeFraction > currentTimeFraction && periodDuration > 0) {
                return 0;
            }

            // If reset time is in the past
            if ((endTimeFraction < currentTimeFraction && periodDuration > 0) || (endTimeFraction > currentTimeFraction && periodDuration <= 0)) {
                return 100;
            }
            
            if (periodDuration <= 0) {
                periodDuration += 1;  // Handle wrap around midnight
            }
            
            // Elapsed time since the start of the period
            let elapsedTime = currentTimeFraction - startTimeFraction;
            if (elapsedTime < 0) {
                elapsedTime += 1;  // Handle wrap around midnight
            }
            
            // Calculate the percent elapsed of the period
            return (elapsedTime / periodDuration) % 1;
        })();
        const percentRemainingOfDay = 1 - percentElapsedOfPeriod;
        this.bar.style = `width: ` + mapNumber(this.showElapsed ? percentElapsedOfPeriod : percentRemainingOfDay, 0, 1, 0.0, this.width - 0.15) +
            `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.30) + 'em;';
    }

    // Mostly copied from Noiseclapper@JordanViknar
    applyPosition() {
        const boxes = {
            left: Main.panel._leftBox,
            center: Main.panel._centerBox,
            right: Main.panel._rightBox,
        };
        const position = this.panelPosition;
        const index = this.panelIndex;
        Main.panel._addToPanelBox(this.metadata.name, this._indicator, index, boxes[position === 0 ? 'left' : position === 1 ? 'center' : 'right']);
    }
    
    disable() {
        // Uncomment for easier debug
        // delete global.dayprogress;

        if (this.timerID) {
            GLib.Source.remove(this.timerID);
            this.timerID = null;
        }

        if (this.showElapsedHandle) {
            this._settings.disconnect(this.showElapsedHandle);
            this.showElapsedHandle = null;
        }
        if (this.widthHandle) {
            this._settings.disconnect(this.widthHandle);
            this.widthHandle = null;
        }
        if (this.heightHandle) {
            this._settings.disconnect(this.heightHandle);
            this.heightHandle = null;
        }
        if (this.circularHandle) {
            this._settings.disconnect(this.circularHandle);
            this.circularHandle = null;
        }
        if (this.startHourHandle) {
            this._settings.disconnect(this.startHourHandle);
            this.startHourHandle = null;
        }
        if (this.startMinuteHandle) {
            this._settings.disconnect(this.startMinuteHandle);
            this.startMinuteHandle = null;
        }
        if (this.resetHourHandle) {
            this._settings.disconnect(this.resetHourHandle);
            this.resetHourHandle = null;
        }
        if (this.resetMinuteHandle) {
            this._settings.disconnect(this.resetMinuteHandle);
            this.resetMinuteHandle = null;
        }
        if (this.panelPositionHandle) {
            this._settings.disconnect(this.panelPositionHandle);
            this.panelPositionHandle = null;
        }
        if (this.panelIndexHandle) {
            this._settings.disconnect(this.panelIndexHandle);
            this.panelIndexHandle = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
        this.box?.destroy();
        this.box = null;
        this.container?.destroy();
        this.container = null;
        this.border?.destroy();
        this.border = null;
        this.bar?.destroy();
        this.bar = null;

        this.showElapsed = null;
        this.circular = null;
        this.width = null;
        this.startHour = null;
        this.startMinute = null;
        this.resetHour = null;
        this.resetMinute = null;
        this.panelPosition = null;
        this.panelIndex = null;

        this._settings = null;
    }
}


function mapNumber(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}