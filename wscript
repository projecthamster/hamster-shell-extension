# -*- python -*-
VERSION = '0.1'
APPNAME = 'hamster-shell-extension'
top = '.'
out = 'build'

import intltool, gnome
import os

def configure(conf):
    conf.check_tool('gnome intltool dbus')

    conf.define('ENABLE_NLS', 1)
    conf.define('HAVE_BIND_TEXTDOMAIN_CODESET', 1)

    conf.define('VERSION', VERSION)
    conf.define('GETTEXT_PACKAGE', APPNAME)
    conf.define('PACKAGE', APPNAME)

def build(bld):
    # gnome shell applet
    bld.install_files('${DATADIR}/gnome-shell/extensions/hamster@gnome.org',
                      'src/*')

    # icons
    bld.install_files('${DATADIR}/gnome-shell/extensions/hamster@gnome.org/data',
                      'data/*')

    # the gsettings schemas - TODO - use whatever default tools there are
    bld.install_files('${DATADIR}/glib-2.0/schemas',
                      'hamster-applet.gschema.xml')


    def post(ctx):
        if bld.is_install:
            print "Compiling schema"
            ctx.exec_command("glib-compile-schemas '%s'" % os.path.join(ctx.env['DATADIR'], "glib-2.0", "schemas"))


    bld.add_post_fun(post)
