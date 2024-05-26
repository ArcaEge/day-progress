import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

function mapNumber(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

export default class DayProgress extends Extension {
    enable() {
        // Create a panel button
        this._indicator = new PanelMenu.Button(0.5, this.metadata.name, false);

        // Add an icon
        this.icon = new St.Icon({
            icon_name: 'face-laugh-symbolic',
            style_class: 'system-status-icon',
        });
        this.text = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });

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
            style: `width: 0.7em;`,
            styleClass: 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.box.add_child(this.container);
        this.container.add_child(this.border);
        this.border.add_child(this.bar);
        // this.box.add_child(this.text);
        
        this._indicator.add_child(this.box);
        
        // Add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        
        this.updateBar();

        this.timerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this.updateBar();
            return true;
        });

        // Add a menu item to open the preferences window
        this._indicator.menu.addAction(_('Update'),
            () => this.updateBar());
        
        this._indicator.menu.addAction(_('Preferences'),
            () => this.openPreferences());

        // Create a new GSettings object, and bind the "show-indicator"
        // setting to the "visible" property.
        this._settings = this.getSettings();
        this._settings.bind('show-indicator', this._indicator, 'visible',
            Gio.SettingsBindFlags.DEFAULT);

        // Watch for changes to a specific setting
        this._settings.connect('changed::show-indicator', (settings, key) => {
            console.debug(`${key} = ${settings.get_value(key).print(true)}`);
        });
    }

    updateBar() {
        const localDateTime = GLib.DateTime.new_now_local();
        const percentElapsedOfDay = (localDateTime.get_hour() + localDateTime.get_minute() / 60 + localDateTime.get_second() / 3600) / 24;
        const percentRemainingOfDay = 1 - percentElapsedOfDay;
        // this.text.text = percentRemainingOfDay.toString();
        this.bar.style = `width: ` + mapNumber(percentElapsedOfDay, 0, 1, 0.0, 2.85) + `em;`;
    }

    disable() {
        this._indicator?.destroy();
        GLib.source_remove(this.timerID);
        this._indicator = null;
        this._settings = null;
    }
}