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

        // Get show year progress key
        this.showYearProgress = this._settings.get_boolean('show-year-progress');

        // Get show life progress key
        this.showLifeProgress = this._settings.get_boolean('show-life-progress');

        // Stack direction
        this.stackDirection = this._settings.get_string('stack-direction');

        // Width
        this.width = this._settings.get_int('width') / 5;

        // Height
        this.height = this._settings.get_int('height') / 10;

        // Create main box to stack all progress bars
        this.mainBox = new St.BoxLayout({
            vertical: this.stackDirection === 'vertical',
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
        });

        // Create UI elements for DAY progress
        this.dayBox = new St.BoxLayout({
            xAlign: Clutter.ActorAlign.CENTER,
            xExpand: false,
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: false,
        });

        this.dayContainer = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            style: ``,
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container',
        });

        this.dayPie = new Pie();

        this.dayBorder = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            styleClass: 'border',
        });

        this.dayBar = new St.Bin({
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.dayBox.add_child(this.dayContainer);
        this.dayBox.add_child(this.dayPie);
        this.dayContainer.add_child(this.dayBorder);
        this.dayBorder.add_child(this.dayBar);

        // Create UI elements for YEAR progress
        this.yearBox = new St.BoxLayout({
            xAlign: Clutter.ActorAlign.CENTER,
            xExpand: false,
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: false,
        });

        this.yearContainer = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            style: ``,
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container',
        });

        this.yearPie = new Pie();

        this.yearBorder = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            styleClass: 'border',
        });

        this.yearBar = new St.Bin({
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.yearBox.add_child(this.yearContainer);
        this.yearBox.add_child(this.yearPie);
        this.yearContainer.add_child(this.yearBorder);
        this.yearBorder.add_child(this.yearBar);

        // Create UI elements for LIFE progress
        this.lifeBox = new St.BoxLayout({
            xAlign: Clutter.ActorAlign.CENTER,
            xExpand: false,
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: false,
        });

        this.lifeContainer = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            style: ``,
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container',
        });

        this.lifePie = new Pie();

        this.lifeBorder = new St.Bin({
            reactive: false,
            trackHover: false,
            canFocus: false,
            xExpand: true,
            yExpand: true,
            xAlign: Clutter.ActorAlign.CENTER,
            yAlign: Clutter.ActorAlign.CENTER,
            styleClass: 'border',
        });

        this.lifeBar = new St.Bin({
            styleClass: this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
        });

        this.lifeBox.add_child(this.lifeContainer);
        this.lifeBox.add_child(this.lifePie);
        this.lifeContainer.add_child(this.lifeBorder);
        this.lifeBorder.add_child(this.lifeBar);

        // Add all boxes to main box
        this.mainBox.add_child(this.dayBox);
        this.mainBox.add_child(this.yearBox);
        this.mainBox.add_child(this.lifeBox);
        this._indicator.add_child(this.mainBox);

        // Menu items for DAY
        this.menuDayElapsedContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.dayElapsedLabel = new St.Label({
            text: 'Day Elapsed',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.dayElapsedValue = new St.Label({
            text: '',
        });
        this.menuDayElapsedContainer.add_child(this.dayElapsedLabel);
        this.menuDayElapsedContainer.add_child(this.dayElapsedValue);

        this.menuDayRemainingContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.dayRemainingLabel = new St.Label({
            text: 'Day Remaining',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.dayRemainingValue = new St.Label({
            text: '',
        });
        this.menuDayRemainingContainer.add_child(this.dayRemainingLabel);
        this.menuDayRemainingContainer.add_child(this.dayRemainingValue);

        // Menu items for YEAR
        this.menuYearElapsedContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.yearElapsedLabel = new St.Label({
            text: 'Year Elapsed',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.yearElapsedValue = new St.Label({
            text: '',
        });
        this.menuYearElapsedContainer.add_child(this.yearElapsedLabel);
        this.menuYearElapsedContainer.add_child(this.yearElapsedValue);

        this.menuYearRemainingContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.yearRemainingLabel = new St.Label({
            text: 'Year Remaining',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.yearRemainingValue = new St.Label({
            text: '',
        });
        this.menuYearRemainingContainer.add_child(this.yearRemainingLabel);
        this.menuYearRemainingContainer.add_child(this.yearRemainingValue);

        // Menu items for LIFE
        this.menuLifeElapsedContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.lifeElapsedLabel = new St.Label({
            text: 'Life Elapsed',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.lifeElapsedValue = new St.Label({
            text: '',
        });
        this.menuLifeElapsedContainer.add_child(this.lifeElapsedLabel);
        this.menuLifeElapsedContainer.add_child(this.lifeElapsedValue);

        this.menuLifeRemainingContainer = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        this.lifeRemainingLabel = new St.Label({
            text: 'Life Remaining',
            xAlign: Clutter.ActorAlign.START,
            xExpand: true,
            styleClass: 'label',
        });
        this.lifeRemainingValue = new St.Label({
            text: '',
        });
        this.menuLifeRemainingContainer.add_child(this.lifeRemainingLabel);
        this.menuLifeRemainingContainer.add_child(this.lifeRemainingValue);

        // Add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Show elapsed
        this.showElapsedHandle = this._settings.connect('changed::show-elapsed', (settings, key) => {
            this.showElapsed = settings.get_boolean(key);
            this.updateBars();
        });

        // Show year progress
        this.showYearProgressHandle = this._settings.connect('changed::show-year-progress', (settings, key) => {
            this.showYearProgress = settings.get_boolean(key);
            this.updateVisibility();
            this.updateBars();
        });

        // Show life progress
        this.showLifeProgressHandle = this._settings.connect('changed::show-life-progress', (settings, key) => {
            this.showLifeProgress = settings.get_boolean(key);
            this.updateVisibility();
            this.updateBars();
        });

        // Stack direction
        this.stackDirectionHandle = this._settings.connect('changed::stack-direction', (settings, key) => {
            this.stackDirection = settings.get_string(key);
            this.mainBox.vertical = this.stackDirection === 'vertical';
            this.updateBars();
        });

        // Width
        this.widthHandle = this._settings.connect('changed::width', (settings, key) => {
            this.width = settings.get_int(key) / 5;
            this.calculateStyles();
            this.updateBars();
        });

        // Height
        this.heightHandle = this._settings.connect('changed::height', (settings, key) => {
            this.height = settings.get_int(key) / 10;
            this.calculateStyles();
            this.updateBars();
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
            this.updateBars();
        });

        this.startMinute = this._settings.get_int('start-minute');
        this.startMinuteHandle = this._settings.connect('changed::start-minute', (settings, key) => {
            this.startMinute = settings.get_int(key);
            this.updateBars();
        });

        // Reset times
        this.resetHour = this._settings.get_int('reset-hour');
        this.resetHourHandle = this._settings.connect('changed::reset-hour', (settings, key) => {
            this.resetHour = settings.get_int(key);
            this.updateBars();
        });

        this.resetMinute = this._settings.get_int('reset-minute');
        this.resetMinuteHandle = this._settings.connect('changed::reset-minute', (settings, key) => {
            this.resetMinute = settings.get_int(key);
            this.updateBars();
        });

        // Year start date
        this.yearStartMonth = this._settings.get_int('year-start-month');
        this.yearStartMonthHandle = this._settings.connect('changed::year-start-month', (settings, key) => {
            this.yearStartMonth = settings.get_int(key);
            this.updateBars();
        });

        this.yearStartDay = this._settings.get_int('year-start-day');
        this.yearStartDayHandle = this._settings.connect('changed::year-start-day', (settings, key) => {
            this.yearStartDay = settings.get_int(key);
            this.updateBars();
        });

        // Life start and end years
        this.lifeStartYear = this._settings.get_int('life-start-year');
        this.lifeStartYearHandle = this._settings.connect('changed::life-start-year', (settings, key) => {
            this.lifeStartYear = settings.get_int(key);
            this.updateBars();
        });

        this.lifeEndYear = this._settings.get_int('life-end-year');
        this.lifeEndYearHandle = this._settings.connect('changed::life-end-year', (settings, key) => {
            this.lifeEndYear = settings.get_int(key);
            this.updateBars();
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
        this.updateVisibility();

        // Update bars now to immediately populate them
        this.updateBars();

        // Light styles
        this.colorSchemeChanged();

        this.timerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
            this.updateBars();
            return GLib.SOURCE_CONTINUE;
        });

        this._indicator.menu.addMenuItem(this.menuDayElapsedContainer);
        this._indicator.menu.addMenuItem(this.menuDayRemainingContainer);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addMenuItem(this.menuYearElapsedContainer);
        this._indicator.menu.addMenuItem(this.menuYearRemainingContainer);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addMenuItem(this.menuLifeElapsedContainer);
        this._indicator.menu.addMenuItem(this.menuLifeRemainingContainer);
        // Add a menu item to open the preferences window
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addAction(_('Preferences'),
            () => this.openPreferences());
    }

    updateVisibility() {
        this.yearBox.visible = this.showYearProgress;
        this.menuYearElapsedContainer.visible = this.showYearProgress;
        this.menuYearRemainingContainer.visible = this.showYearProgress;

        this.lifeBox.visible = this.showLifeProgress;
        this.menuLifeElapsedContainer.visible = this.showLifeProgress;
        this.menuLifeRemainingContainer.visible = this.showLifeProgress;
    }

    // Support for light panel through extensions such as Light Style
    colorSchemeChanged() {
        this.lightColorScheme = this.colorSchemeSettings.get_string('color-scheme') == 'prefer-light';
        
        // Day elements
        this.dayContainer.styleClass = this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container';
        this.dayBar.styleClass = this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar';
        this.dayPie.style_class = this.isUsingClassic || this.lightColorScheme ? 'pie-classic' : 'pie';
        this.dayPie.calculate_styles(this.width, this.height, this.style == 2);
        
        // Year elements
        this.yearContainer.styleClass = this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container';
        this.yearBar.styleClass = this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar';
        this.yearPie.style_class = this.isUsingClassic || this.lightColorScheme ? 'pie-classic' : 'pie';
        this.yearPie.calculate_styles(this.width, this.height, this.style == 2);

        // Life elements
        this.lifeContainer.styleClass = this.isUsingClassic || this.lightColorScheme ? 'container-classic' : 'container';
        this.lifeBar.styleClass = this.isUsingClassic || this.lightColorScheme ? 'bar-classic' : 'bar';
        this.lifePie.style_class = this.isUsingClassic || this.lightColorScheme ? 'pie-classic' : 'pie';
        this.lifePie.calculate_styles(this.width, this.height, this.style == 2);
    }

    calculateStyles() {
        // Day styles
        this.dayContainer.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.dayBorder.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.dayPie.calculate_styles(this.width, this.height, this.style == 2);
        this.dayContainer.visible = (this.style == 0 || this.style == 1);
        this.dayPie.visible = (this.style == 2 || this.style == 3);
        
        // Year styles
        this.yearContainer.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.yearBorder.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.yearPie.calculate_styles(this.width, this.height, this.style == 2);
        this.yearContainer.visible = (this.style == 0 || this.style == 1);
        this.yearPie.visible = (this.style == 2 || this.style == 3);

        // Life styles
        this.lifeContainer.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.lifeBorder.style = `width: ` + this.width + `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.3) + 'em;';
        this.lifePie.calculate_styles(this.width, this.height, this.style == 2);
        this.lifeContainer.visible = (this.style == 0 || this.style == 1);
        this.lifePie.visible = (this.style == 2 || this.style == 3);
        
        this.updateBars();
    }

    // Update all bars
    updateBars() {
        this.colorSchemeChanged();

        const localDateTime = GLib.DateTime.new_now_local();
        
        // === DAY PROGRESS ===
        const startTimeFraction = this.startHour / 24 + this.startMinute / (60 * 24);
        const endTimeFraction = this.resetHour / 24 + this.resetMinute / (60 * 24);

        const percentElapsedOfPeriod = (() => {
            const currentTimeFraction = (localDateTime.get_hour() + localDateTime.get_minute() / 60 + localDateTime.get_second() / 3600) / 24;

            if (endTimeFraction > startTimeFraction) {
                return mapNumber(clamp(currentTimeFraction, startTimeFraction, endTimeFraction), startTimeFraction, endTimeFraction, 0, 1);
            }

            if (currentTimeFraction >= endTimeFraction && currentTimeFraction < startTimeFraction) return 1;
            const durationFraction = (1 - (startTimeFraction - endTimeFraction));
            const offset = 1 - startTimeFraction;
            const offsettedTimeFraction = (currentTimeFraction + 1 + offset) % 1;
            return mapNumber(clamp(offsettedTimeFraction, 0, durationFraction), 0, durationFraction, 0, 1);
        })();
        
        const percentRemainingOfPeriod = 1 - percentElapsedOfPeriod;
        
        this.dayBar.style = `width: ` + mapNumber(this.showElapsed ? percentElapsedOfPeriod : percentRemainingOfPeriod, 0, 1, 0.0, this.width - 0.15) +
            `em; ` + `height: ` + this.height + `em; ` + 'border-radius: ' + (this.circular ? 1 : 0.15) + 'em;';
        this.updateDayPie((this.showElapsed ? percentElapsedOfPeriod : percentRemainingOfPeriod) * (Math.PI * 2.0));

        const duration = endTimeFraction > startTimeFraction ? (endTimeFraction - startTimeFraction) : (1 - (startTimeFraction - endTimeFraction));
        const elapsedHours = Math.floor(percentElapsedOfPeriod * duration * 24);
        const elapsedMinutes = Math.floor((percentElapsedOfPeriod * duration * 24 * 60) % 60);
        const remainingHours = Math.floor(percentRemainingOfPeriod * duration * 24);
        const remainingMinutes = Math.floor((percentRemainingOfPeriod * duration * 24 * 60) % 60);
        this.dayElapsedValue.text = elapsedHours + 'h ' + elapsedMinutes + 'm' + ' | ' + Math.round(percentElapsedOfPeriod * 100) + '%';
        this.dayRemainingValue.text = remainingHours + 'h ' + remainingMinutes + 'm' + ' | ' + Math.round(percentRemainingOfPeriod * 100) + '%';

        // === YEAR PROGRESS ===
        const dayOfYear = localDateTime.get_day_of_year();
        const year = localDateTime.get_year();
        const isLeapYear = new Date(year, 1, 29).getDate() === 29;
        const totalDays = isLeapYear ? 366 : 365;

        // Calculate custom year start (e.g., fiscal year)
        const yearStartDate = GLib.DateTime.new_local(year, this.yearStartMonth, this.yearStartDay, 0, 0, 0);
        const yearStartDayOfYear = yearStartDate.get_day_of_year();
        
        // Adjust current day relative to custom year start
        let adjustedDayOfYear;
        if (dayOfYear >= yearStartDayOfYear) {
            adjustedDayOfYear = dayOfYear - yearStartDayOfYear + 1;
        } else {
            // We're in the next calendar year but same custom year
            adjustedDayOfYear = (totalDays - yearStartDayOfYear + 1) + dayOfYear;
        }

        const percentElapsedOfYear = adjustedDayOfYear / totalDays;
        const percentRemainingOfYear = 1 - percentElapsedOfYear;
        const daysRemaining = totalDays - adjustedDayOfYear;

        this.yearBar.style = `width: ` + mapNumber(
            this.showElapsed ? percentElapsedOfYear : percentRemainingOfYear,
            0, 1, 0.0, this.width - 0.15
        ) + `em; height: ` + this.height + `em; border-radius: ` + 
        (this.circular ? 1 : 0.15) + 'em;';

        this.updateYearPie((this.showElapsed ? percentElapsedOfYear : percentRemainingOfYear) * (Math.PI * 2.0));

        const elapsedDays = adjustedDayOfYear;
        this.yearElapsedValue.text = `${elapsedDays} days | ${Math.round(percentElapsedOfYear * 100)}%`;
        this.yearRemainingValue.text = `${daysRemaining} days | ${Math.round(percentRemainingOfYear * 100)}%`;

        // === LIFE PROGRESS ===
        if (this.lifeStartYear && this.lifeEndYear && this.lifeEndYear > this.lifeStartYear) {
            const currentYear = year;
            
            // Calculate fractional years (including current day of year)
            const currentYearFraction = currentYear + (dayOfYear / totalDays);
            const lifeSpanYears = this.lifeEndYear - this.lifeStartYear;
            const elapsedYears = currentYearFraction - this.lifeStartYear;
            
            const percentElapsedOfLife = clamp(elapsedYears / lifeSpanYears, 0, 1);
            const percentRemainingOfLife = 1 - percentElapsedOfLife;
            
            this.lifeBar.style = `width: ` + mapNumber(
                this.showElapsed ? percentElapsedOfLife : percentRemainingOfLife,
                0, 1, 0.0, this.width - 0.15
            ) + `em; height: ` + this.height + `em; border-radius: ` + 
            (this.circular ? 1 : 0.15) + 'em;';

            this.updateLifePie((this.showElapsed ? percentElapsedOfLife : percentRemainingOfLife) * (Math.PI * 2.0));

            const yearsElapsed = Math.floor(elapsedYears);
            const yearsRemaining = Math.max(0, Math.floor(lifeSpanYears - elapsedYears));
            this.lifeElapsedValue.text = `${yearsElapsed} years | ${Math.round(percentElapsedOfLife * 100)}%`;
            this.lifeRemainingValue.text = `${yearsRemaining} years | ${Math.round(percentRemainingOfLife * 100)}%`;
        } else {
            // Invalid configuration
            this.lifeBar.style = `width: 0em; height: ` + this.height + `em;`;
            this.updateLifePie(0);
            this.lifeElapsedValue.text = 'Configure in settings';
            this.lifeRemainingValue.text = 'Configure in settings';
        }

        this.applyPosition();
    }

    updateDayPie(angle) {
        this.dayPie.set_angle(angle);
    }

    updateYearPie(angle) {
        this.yearPie.set_angle(angle);
    }

    updateLifePie(angle) {
        this.lifePie.set_angle(angle);
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
        if (this.showYearProgressHandle) {
            this._settings.disconnect(this.showYearProgressHandle);
            this.showYearProgressHandle = null;
        }
        if (this.showLifeProgressHandle) {
            this._settings.disconnect(this.showLifeProgressHandle);
            this.showLifeProgressHandle = null;
        }
        if (this.stackDirectionHandle) {
            this._settings.disconnect(this.stackDirectionHandle);
            this.stackDirectionHandle = null;
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
        if (this.yearStartMonthHandle) {
            this._settings.disconnect(this.yearStartMonthHandle);
            this.yearStartMonthHandle = null;
        }
        if (this.yearStartDayHandle) {
            this._settings.disconnect(this.yearStartDayHandle);
            this.yearStartDayHandle = null;
        }
        if (this.lifeStartYearHandle) {
            this._settings.disconnect(this.lifeStartYearHandle);
            this.lifeStartYearHandle = null;
        }
        if (this.lifeEndYearHandle) {
            this._settings.disconnect(this.lifeEndYearHandle);
            this.lifeEndYearHandle = null;
        }
        if (this.panelPositionHandle) {
            this._settings.disconnect(this.panelPositionHandle);
            this.panelPositionHandle = null;
        }
        if (this.panelIndexHandle) {
            this._settings.disconnect(this.panelIndexHandle);
            this.panelIndexHandle = null;
        }

        // Destroy day elements
        this.dayRemainingValue?.destroy();
        this.dayRemainingValue = null;
        this.dayElapsedValue?.destroy();
        this.dayElapsedValue = null;
        this.dayRemainingLabel?.destroy();
        this.dayRemainingLabel = null;
        this.dayElapsedLabel?.destroy();
        this.dayElapsedLabel = null;
        this.menuDayRemainingContainer?.destroy();
        this.menuDayRemainingContainer = null;
        this.menuDayElapsedContainer?.destroy();
        this.menuDayElapsedContainer = null;
        this.dayBar?.destroy();
        this.dayBar = null;
        this.dayBorder?.destroy();
        this.dayBorder = null;
        this.dayPie?.destroy();
        this.dayPie = null;
        this.dayContainer?.destroy();
        this.dayContainer = null;
        this.dayBox?.destroy();
        this.dayBox = null;

        // Destroy year elements
        this.yearRemainingValue?.destroy();
        this.yearRemainingValue = null;
        this.yearElapsedValue?.destroy();
        this.yearElapsedValue = null;
        this.yearRemainingLabel?.destroy();
        this.yearRemainingLabel = null;
        this.yearElapsedLabel?.destroy();
        this.yearElapsedLabel = null;
        this.menuYearRemainingContainer?.destroy();
        this.menuYearRemainingContainer = null;
        this.menuYearElapsedContainer?.destroy();
        this.menuYearElapsedContainer = null;
        this.yearBar?.destroy();
        this.yearBar = null;
        this.yearBorder?.destroy();
        this.yearBorder = null;
        this.yearPie?.destroy();
        this.yearPie = null;
        this.yearContainer?.destroy();
        this.yearContainer = null;
        this.yearBox?.destroy();
        this.yearBox = null;

        // Destroy life elements
        this.lifeRemainingValue?.destroy();
        this.lifeRemainingValue = null;
        this.lifeElapsedValue?.destroy();
        this.lifeElapsedValue = null;
        this.lifeRemainingLabel?.destroy();
        this.lifeRemainingLabel = null;
        this.lifeElapsedLabel?.destroy();
        this.lifeElapsedLabel = null;
        this.menuLifeRemainingContainer?.destroy();
        this.menuLifeRemainingContainer = null;
        this.menuLifeElapsedContainer?.destroy();
        this.menuLifeElapsedContainer = null;
        this.lifeBar?.destroy();
        this.lifeBar = null;
        this.lifeBorder?.destroy();
        this.lifeBorder = null;
        this.lifePie?.destroy();
        this.lifePie = null;
        this.lifeContainer?.destroy();
        this.lifeContainer = null;
        this.lifeBox?.destroy();
        this.lifeBox = null;

        this.mainBox?.destroy();
        this.mainBox = null;
        this._indicator?.destroy();
        this._indicator = null;

        this.showElapsed = null;
        this.showYearProgress = null;
        this.showLifeProgress = null;
        this.stackDirection = null;
        this.circular = null;
        this.width = null;
        this.height = null;
        this.style = null;
        this.startHour = null;
        this.startMinute = null;
        this.resetHour = null;
        this.resetMinute = null;
        this.yearStartMonth = null;
        this.yearStartDay = null;
        this.lifeStartYear = null;
        this.lifeEndYear = null;
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
        