# -*- python -*-
VERSION = '0.1'
APPNAME = 'hamster-shell-extension'
top = '.'
out = 'build'

import intltool, gnome
import os

def configure(conf):
    conf.check_tool('gnome intltool dbus')
    conf.check_cfg(package='gnome-keybindings', variables='keysdir', mandatory=True)

    conf.define('ENABLE_NLS', 1)
    conf.define('HAVE_BIND_TEXTDOMAIN_CODESET', 1)

    conf.define('VERSION', VERSION)
    conf.define('GETTEXT_PACKAGE', APPNAME)
    conf.define('PACKAGE', APPNAME)

def build(bld):
    # gnome shell applet
    bld.install_files('${DATADIR}/gnome-shell/extensions/hamster@gnome.org',
                      'src/*')

    # the gsettings schemas - TODO - use whatever default tools there are
    bld.install_files('${DATADIR}/glib-2.0/schemas',
                      'data/hamster-applet.gschema.xml')


    def post(ctx):
        if bld.is_install:
            print "Compiling schema"
            ctx.exec_command("glib-compile-schemas '%s'" % os.path.join(ctx.env['DATADIR'], "glib-2.0", "schemas"))


    bld.add_post_fun(post)
