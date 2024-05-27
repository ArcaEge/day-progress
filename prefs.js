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

        const resetTime = new Adw.PreferencesGroup({
            title: _('Reset time'),
            description: _('The time at which the bar resets'),
        });
        page.add(resetTime);

        const elapsed = new Adw.SwitchRow({
            title: _('Time Elapsed'),
            subtitle: _('Whether to show time elapsed instead of remaining on the panel'),
        });
        appearance.add(elapsed);

        const width = new Adw.SpinRow({
            title: _("Width"),
            subtitle: _('Width of the bar (measured in fifth of an em), scales with font'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 150,
                step_increment: 1
            })
        });
        appearance.add(width);

        const circular = new Adw.SwitchRow({
            title: _('Circular bar (experimental)'),
            subtitle: _('Whether the ends of the bar rounded or not'),
        });
        appearance.add(circular);

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

        window._settings = this.getSettings();
        window._settings.bind('show-elapsed', elapsed, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('width', width, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('circular', circular, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('reset-hour', resetHour, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind('reset-minute', resetMinute, 'value',
            Gio.SettingsBindFlags.DEFAULT);
    }
}
