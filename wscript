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
    bld.install_files('${DATADIR}/gnome-shell/extensions/hamster@projecthamster.wordpress.com',
                      'src/*')

    bld.add_post_fun(post)
