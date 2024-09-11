import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Cairo from 'gi://cairo';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const Pie = GObject.registerClass({
    Properties: {
        'angle': GObject.ParamSpec.double(
            'angle', 'angle', 'angle',
            GObject.ParamFlags.READWRITE,
            0, 2 * Math.PI, 0),
    },
}, class Pie extends St.DrawingArea {
    _init() {
        this._angle = 0;
        this._outerBorder = true;
        super._init({
            style_class: 'pie',
            visible: false,
        });
    }

    get angle() {
        return this._angle;
    }

    set_angle(angle) {
        if (this._angle === angle)
            return;

        this._angle = angle;
        this.notify('angle');
        this.queue_repaint();
    }

    calculate_styles(width, height, outerBorder) {
        let min = Math.min(width, height);
        min += 0.5;
        this.style = 'width: ' + min + 'em; ' + 'height: ' + min + 'em;';
        this._outerBorder = outerBorder;
    }

    vfunc_repaint() {
        let node = this.get_theme_node();
        let fillColor = node.get_color('-pie-color');
        let bgColor = node.get_color('-pie-background-color');
        let borderColor = node.get_color('-pie-border-color');
        let borderWidth = node.get_length('-pie-border-width');
        let [width, height] = this.get_surface_size();
        let radius = Math.min(width / 2, height / 2);

        let startAngle = 3 * Math.PI / 2;
        let endAngle = startAngle + this._angle;

        let cr = this.get_context();
        cr.setLineCap(Cairo.LineCap.ROUND);
        cr.setLineJoin(Cairo.LineJoin.ROUND);
        cr.translate(width / 2, height / 2);

        if (this._angle < 2 * Math.PI)
            cr.moveTo(0, 0);

        cr.arc(0, 0, radius - borderWidth * (this._outerBorder ? 2.6 : 1), startAngle, endAngle);

        if (this._angle < 2 * Math.PI)
            cr.lineTo(0, 0);

        cr.closePath();

        cr.setLineWidth(0);
        cr.setSourceColor(fillColor);
        cr.fill();

        if (!this._outerBorder) {
            cr.moveTo(0, 0);

            if (this._angle >= 2 * Math.PI || this._angle >= 0) {
                cr.arc(0, 0, radius - borderWidth, startAngle, startAngle - 0.000000000001);
            } else {
                cr.arc(0, 0, radius - borderWidth, endAngle, startAngle);
            }

            cr.lineTo(0, 0);

            cr.closePath();

            cr.setLineWidth(0);
            cr.setSourceColor(bgColor);
            cr.fill();
        }
        
        // Draw outer border
        if (this._outerBorder) {
            cr.arc(0, 0, radius - borderWidth, startAngle, startAngle + 2 * Math.PI);
                    
            cr.setLineWidth(borderWidth);
            cr.setSourceColor(borderColor);
            cr.stroke();
        }
        
        cr.$dispose();
    }
});

export default class DayProgress extends Extension {
    enable() {
        // Uncomment for easier debug
        // global.dayprogress = this;
        
        // Get if using GNOME classic
        this.isUsingClassic = GLib.getenv('GNOME_SHELL_SESSION_MODE') == "classic";

        // Light styles
        this.colorSchemeSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.interface',
        });

        this.lightColorScheme = this.colorSchemeSettings.get_string('color-scheme') == 'prefer-light';

        // Create a panel button
        this._indicator = new PanelMenu.Button(0.5, this.metadata.name, false);

        // Get settings
        this._settings = this.getSettings();

        // Get show elapsed key
        this.showElapsed = this._settings.get_boolean('show-elapsed');

        // Width
        this.width = this._settings.get_int('width') / 5;

        // Height
        this.height = this._settings.get_int('height') / 10;

        // Create UI elements
        this.box = new St.BoxLayout({
            // style: `border-width: 1px; border-color: rgba(220, 220, 220, 1); height: 20px; border-radius: 10px; background-color: rgb(255, 255, 255); width: 40px;`, // border-width: 1px; border-color: rgba(220, 220, 220, 1); height: 10px; border-radius: 10px; background-color: rgba(255, 255, 255, 0.2)
            xAlign: Clutter.ActorAlign.CENTER,
            xExpand: false,
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: false,
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
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container',
        });

        this.pie = new Pie();

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
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.box.add_child(this.container);
        this.box.add_child(this.pie);
        this.container.add_child(this.border);
        this.border.add_child(this.bar);
        this._indicator.add_child(this.box);

        this.menuElapsedContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.elapsedLabel = new St.Label({
            text: 'Elapsed',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.elapsedValue = new St.Label({
            text: '',
        });
        this.menuElapsedContainer.add_child(this.elapsedLabel);
        this.menuElapsedContainer.add_child(this.elapsedValue);

        this.menuRemainingContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.remainingLabel = new St.Label({
            text: 'Remaining',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.remainingValue = new St.Label({
            text: '',
        });
        this.menuRemainingContainer.add_child(this.remainingLabel);
        this.menuRemainingContainer.add_child(this.remainingValue);

        // Add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Show elapsed
        this.showElapsedHandle = this._settings.connect('changed::show-elapsed', (settings, key) => {
            this.showElapsed = settings.get_boolean(key);
            this.updateBar();
        });

        // Width
        this.widthHandle = this._settings.connect('changed::width', (settings, key) => {
            this.width = settings.get_int(key) / 5;
            this.calculateStyles();
            this.updateBar();
        });

        // Height
        this.heightHandle = this._settings.connect('changed::height', (settings, key) => {
            this.height = settings.get_int(key) / 10;
            this.calculateStyles();
            this.updateBar();
        });

        // Style
        this.style = this._settings.get_int('style');
        this.circular = this.style == 1;
        this.styleHandle = this._settings.connect('changed::style', (settings, key) => {
            this.style = settings.get_int(key);
            this.circular = this.style == 1;
            this.calculateStyles();
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

        // Light styles
        this.colorSchemeChanged();

        this.timerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
            this.updateBar();
            return GLib.SOURCE_CONTINUE;
        });

        this._indicator.menu.addMenuItem(this.menuElapsedContainer);
        this._indicator.menu.addMenuItem(this.menuRemainingContainer);
        // Add a menu item to open the preferences window
        this._indicator.menu.addAction(_('Preferences'),
            () => this.openPreferences());
    }

    // Support for light panel through extensions such as Light Style
    colorSchemeChanged() {
        this.lightColorScheme = this.colorSchemeSettings.get_string('color-scheme') == 'prefer-light';
        this.container.styleClass = this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container';
        this.bar.styleClass = this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar';
        this.pie.style_class = this.isUsingClassic || this.lightColorScheme ? 'pie-classic' : 'pie';
        this.pie.calculate_styles(this.width, this.height, this.style == 2);
    }

    calculateStyles() {
        this.container.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.border.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.pie.calculate_styles(this.width, this.height, this.style == 2);
        this.container.visible = (this.style == 0 || this.style == 1);
        this.pie.visible = (this.style == 2 || this.style == 3);
        this.updateBar();
    }

    // Update the bar
    updateBar() {
        // TODO: convert this to a listener
        this.colorSchemeChanged();

        const localDateTime = GLib.DateTime.new_now_local();
        // Start time as a fraction of the day
        const startTimeFraction = this.startHour / 24 + this.startMinute / (60 * 24);
        // End time as a fraction of the day
        const endTimeFraction = this.resetHour / 24 + this.resetMinute / (60 * 24);

        const percentElapsedOfPeriod = (() => {
            // Current time as a fraction of the day
            const currentTimeFraction = (localDateTime.get_hour() + localDateTime.get_minute() / 60 + localDateTime.get_second() / 3600) / 24;

            // No midnight wrap around
            if (endTimeFraction > startTimeFraction) {
                return mapNumber(clamp(currentTimeFraction, startTimeFraction, endTimeFraction), startTimeFraction, endTimeFraction, 0, 1);
            }

            // There is midnight wrap around
            if (currentTimeFraction >= endTimeFraction && currentTimeFraction < startTimeFraction) return 1;
            const durationFraction = (1 - (startTimeFraction - endTimeFraction));
            const offset = 1 - startTimeFraction;
            const offsettedTimeFraction = (currentTimeFraction + 1 + offset) % 1;
            return mapNumber(clamp(offsettedTimeFraction, 0, durationFraction), 0, durationFraction, 0, 1);
        })();
        const percentRemainingOfPeriod = 1 - percentElapsedOfPeriod;
        this.bar.style = `width: ` + mapNumber(this.showElapsed ? percentElapsedOfPeriod : percentRemainingOfPeriod, 0, 1, 0.0, this.width - 0.15) +
            `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.15) + 'em;';    // Needs to be 0.15, half of border curve as it is a smaller corner
        this.updatePie((this.showElapsed ? percentElapsedOfPeriod : percentRemainingOfPeriod) * (Math.PI * 2.0));

        const duration = endTimeFraction > startTimeFraction ? (endTimeFraction - startTimeFraction) : (1 - (startTimeFraction - endTimeFraction));
        const elapsedHours = Math.floor(percentElapsedOfPeriod * duration * 24);
        const elapsedMinutes = Math.floor((percentElapsedOfPeriod * duration * 24 * 60) % 60);
        const remainingHours = Math.floor(percentRemainingOfPeriod * duration * 24);
        const remainingMinutes = Math.floor((percentRemainingOfPeriod * duration * 24 * 60) % 60);
        this.elapsedValue.text = elapsedHours + 'h ' + elapsedMinutes + 'm' + ' | ' + Math.round(percentElapsedOfPeriod * 100) + '%';
        this.remainingValue.text = remainingHours + 'h ' + remainingMinutes + 'm' + ' | ' + Math.round(percentRemainingOfPeriod * 100) + '%';

        this.applyPosition();
    }

    updatePie(angle) {
        this.pie.set_angle(angle);
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
        if (this.styleHandle) {
            this._settings.disconnect(this.styleHandle);
            this.styleHandle = null;
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

        this.remainingValue?.destroy();
        this.remainingValue = null;
        this.elapsedValue?.destroy();
        this.elapsedValue = null;
        this.remainingLabel?.destroy();
        this.remainingLabel = null;
        this.elapsedLabel?.destroy();
        this.elapsedLabel = null;
        this.menuRemainingContainer?.destroy();
        this.menuRemainingContainer = null;
        this.menuElapsedContainer?.destroy();
        this.menuElapsedContainer = null;
        this.bar?.destroy();
        this.bar = null;
        this.border?.destroy();
        this.border = null;
        this.pie?.destroy();
        this.pie = null;
        this.container?.destroy();
        this.container = null;
        this.box?.destroy();
        this.box = null;
        this._indicator?.destroy();
        this._indicator = null;

        this.showElapsed = null;
        this.circular = null;
        this.width = null;
        this.height = null;
        this.style = null;
        this.startHour = null;
        this.startMinute = null;
        this.resetHour = null;
        this.resetMinute = null;
        this.panelPosition = null;
        this.panelIndex = null;

        this._settings = null;
        this.colorSchemeSettings = null;
    }
}

function mapNumber(number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}
