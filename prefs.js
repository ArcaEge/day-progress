import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


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

        // Create a new preferences row
        const show = new Adw.SwitchRow({
            title: _('Show Panel Indicator'),
        });
        appearance.add(show);

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
        // const remaining = new Adw.PreferencesGroup({
        //     title: _('Elapsed or remaining'),
        //     description: _('Whether to count up or down'),
        // });
        // page.add(remaining);

        // Create a settings object and bind show to the `show-indicator` key
        window._settings = this.getSettings();
        window._settings.bind('show-indicator', show, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        window._settings.bind('show-elapsed', elapsed, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        
        window._settings.bind('width', width, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        
        window._settings.bind('circular', circular, 'active',
            Gio.SettingsBindFlags.DEFAULT);
    }
}
