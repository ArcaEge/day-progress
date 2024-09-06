import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const appearance = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Configure the appearance of the extension'),
        });
        page.add(appearance);

        const panelPosition = new Adw.PreferencesGroup({
            title: _('Panel position'),
            description: _('Where on the panel the indicator will be displayed'),
        });
        page.add(panelPosition);

        const startTime = new Adw.PreferencesGroup({
            title: _('Start time'),
            description: _('The time at which the indicator starts'),
        });
        page.add(startTime);

        const resetTime = new Adw.PreferencesGroup({
            title: _('Reset time'),
            description: _('The time at which the indicator resets'),
        });
        page.add(resetTime);

        // Elapsed
        const elapsed = new Adw.SwitchRow({
            title: _('Time Elapsed'),
            subtitle: _('Whether to show time elapsed instead of remaining'),
        });
        appearance.add(elapsed);

        // Width
        const width = new Adw.SpinRow({
            title: _("Width"),
            subtitle: _('Width of the indicator (measured in fifth of an em), scales with font'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 150,
                step_increment: 1
            })
        });
        appearance.add(width);

        // Height
        const height = new Adw.SpinRow({
            title: _("Height"),
            subtitle: _('Height of the indicator (measured in tenth of an em), scales with font'),
            adjustment: new Gtk.Adjustment({
                lower: 2,
                upper: 50,
                step_increment: 1
            })
        });
        appearance.add(height);

        // Style
        const styles = [_("Bar"), _("Circular bar (experimental)"), _("Pie"), _("Pie (no border)")];
        let styleOptionsList = new Gtk.StringList();
        styles.forEach((it) => {
            styleOptionsList.append(it);
        });
        const styleRow = new Adw.ComboRow({
            title: _("Indicator style"),
            subtitle: _("How the indicator is displayed"),
            model: styleOptionsList
        });
        appearance.add(styleRow);

        // Start time
        const startHour = new Adw.SpinRow({
            title: _("Hours"),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 23,
                step_increment: 1
            })
        });
        startTime.add(startHour);
        const startMinute = new Adw.SpinRow({
            title: _("Minutes"),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 59,
                step_increment: 1
            })
        });
        startTime.add(startMinute);

        // Reset time
        const resetHour = new Adw.SpinRow({
            title: _("Hours"),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 23,
                step_increment: 1
            })
        });
        resetTime.add(resetHour);
        const resetMinute = new Adw.SpinRow({
            title: _("Minutes"),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 59,
                step_increment: 1
            })
        });
        resetTime.add(resetMinute);

        // Panel position
        const positions = [_("Left"), _("Centre"), _("Right")];
        let optionsList = new Gtk.StringList();
        positions.forEach((it) => {
            optionsList.append(it);
        });
        const positionRow = new Adw.ComboRow({
            title: _("Position"),
            subtitle: _("The side of the panel it is on"),
            model: optionsList
        });
        panelPosition.add(positionRow);

        // Panel index
        const panelIndex = new Adw.SpinRow({
            title: _("Index"),
            subtitle: _("How far along the panel area it is"),
            adjustment: new Gtk.Adjustment({
                lower: -128,
                upper: 127,
                step_increment: 1
            })
        });
        panelPosition.add(panelIndex);

        // Bind
        window._settings = this.getSettings();
        window._settings.bind('show-elapsed', elapsed, 'active', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('width', width, 'value', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('height', height, 'value', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('style', styleRow, 'selected', Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('start-hour', startHour, 'value', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('start-minute', startMinute, 'value', Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('reset-hour', resetHour, 'value', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('reset-minute', resetMinute, 'value', Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('panel-position', positionRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('panel-index', panelIndex, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
