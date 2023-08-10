Hamster Gnome Shell extension
===============================

A Simple Hamster shell extension for Gnome 3.

Important: Testers needed
-------------------------
One of the main reasons development on this extension is slow is that there is
hardly any testing for feature/bugfix branches. As automated tests are not
really an options we would love to **hear from you** if you would be willing to
take new feature branches for a test drive and provide some feedback every now
and then. **Please get in touch!**

Usage
-----
Quick categorization of activities is done by entering your activity in the
following format: 'activity@category, description #tag1 #tag2', where the comma
is mandatory when adding a description and/or tag(s).

Install
--------

Dependencies
~~~~~~~~~~~~
Because *Hamster-Shell-Extension* is just a frontend to the hamster dbus
service the presence of `hamster-time-tracker
<https://github.com/projecthamster/hamster>`_ is required. You can verify that
the relevant dbus services are up and running by issuing ``ps aux | grep
hamster`` which should bring up ``hamster-service`` and
``hamster-windows-service``.

Install For Production
~~~~~~~~~~~~~~~~~~~~~~
The extension is available on `the central extension repository <https://extensions.gnome.org/extension/425/project-hamster-extension>`_.

Current compatible Gnome shell versions: 3.34, 3.36. *This version is not compatible
with Gnome shell 3.32 and earlier.*
For previous shell versions check `releases <https://github.com/projecthamster/hamster-shell-extension/tags>`_.

Creating a development environment
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
As ``hamster-shell-extension`` is mainly simple JS there is not much of a development
setup needed if you just want to get hacking right away. We do however provide
a few convenience functionalities that make documenting and releasing the extension
easier. For those purposes some additional python packages are required.
The easiest and cleanest way to go about this is to create a new virtual environment and activate
it::

    python3 -m venv .venv
    source .venv/bin/activate

Now you are all setup to run ``make develop`` and related make targets without
changing you main environment.

Manual Installation For Testing and Development
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Clone the repository::

    git clone https://github.com/projecthamster/hamster-shell-extension.git

Make sure you are on the development branch::

    git checkout develop

Build a fresh distribution package::

    make dist

This will create a distributable archive located in the ``dist/`` folder.


**Shortcut on** ``develop``

If you are using the ``develop`` branch since May 2020, you can run ``make
install-user`` to install your current working branch in your user environment
or ``make install`` for a system-wide installation. The ``DESTDIR`` variable
can be provided to ``make install`` to adjust the base installation path (it
defaults to ``DESTDIR=/usr/local``).

Otherwise, on other branches, follow the steps below to manually install the
distribution archive::

    # Build
    make dist
    # Remove any old installation
    rm -rf ~/.local/share/gnome-shell/extensions/contact@projecthamster.org
    # Create directory
    mkdir -p ~/.local/share/gnome-shell/extensions/contact@projecthamster.org
    # Unpack build
    tar xfz dist/contact@projecthamster.org.tar.gz -C ~/.local/share/gnome-shell/extensions/contact@projecthamster.org

Afterwards, enable the extension and change the preferences using Tweak Tool,
or on ``https://extensions.gnome.org/local/``. On GNOME 3.36 and later, you
can also use the GNOME "Extensions" tool.

Reloading the Extension
~~~~~~~~~~~~~~~~~~~~~~~

If the Hamster GNOME shell extension is already loaded and you change some code, 
the GNOME shell needs to be restarted in order to update and restart the extension.
The easiest way to do this is to run GNOME under X11 and use the key combination
``Alt-F2`` followed by ``r``. If you run GNOME under Wayland, either re-login, or 
start a `nested session <https://wiki.gnome.org/Initiatives/Wayland/GnomeShell/Testing>`_::
    
    dbus-run-session -- gnome-shell --nested --wayland

Changing the extension UUID
~~~~~~~~~~~~~~~~~~~~~~~~~~~

It's possible to change the "UUID" of the extension from
``contact@projecthamster.org`` to a name of your choice. If you do this,
you have to obey the `UUID Guidelines
<https://wiki.gnome.org/Projects/GnomeShell/Extensions/UUIDGuidelines>`.
This may become necessary in some cases if there are problems with the
official UUID on `https://extensions.gnome.org`.

To change the UUID, pass it to ``make dist`` in the instructions above::

    # Build
    make dist UUID="my_uuid@my.domain"

The rest of the build procedure is like above, except that you have to replace
``contact@projecthamster.org`` by your new UUID everywhere.
