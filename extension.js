import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';


export default class DayProgress extends Extension {
    enable() {
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
            this.container.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.15) + 'em;';
            this.border.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.15) + 'em;';
            this.updateBar();
        });

        // Circular
        this.container.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.border.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.circularHandle = this._settings.connect('changed::circular', (settings, key) => {
            this.circular = settings.get_boolean(key);
            this.container.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
            this.border.style = `width: ` + this.width + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
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

    // Update the bar
    updateBar() {
        const localDateTime = GLib.DateTime.new_now_local();
        const percentElapsedOfDay = (((localDateTime.get_hour() + localDateTime.get_minute() / 60 + localDateTime.get_second() / 3600) / 24) -
            (this.resetHour / 24 + this.resetMinute / (60 * 24)) + 1) % 1;
        const percentRemainingOfDay = 1 - percentElapsedOfDay;
        this.bar.style = `width: ` + mapNumber(this.showElapsed ? percentElapsedOfDay : percentRemainingOfDay, 0, 1, 0.0, this.width - 0.15) +
            `em;` + 'border-radius: ' + (this.circular ? 1 : 0.15) + 'em;';
    }
    
    disable() {
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
        if (this.circularHandle) {
            this._settings.disconnect(this.circularHandle);
            this.circularHandle = null;
        }
        if (this.resetHourHandle) {
            this._settings.disconnect(this.resetHourHandle);
            this.resetHourHandle = null;
        }
        if (this.resetMinuteHandle) {
            this._settings.disconnect(this.resetMinuteHandle);
            this.resetMinuteHandle = null;
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
        this.resetHour = null;
        this.resetMinute = null;

        this._settings = null;
    }
}


function mapNumber(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}