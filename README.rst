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

Please follow the instructions under
`Manual Installation For Testing and Development`_ below to install from git.
See `metadata.json.in`_ for GNOME shell compatibility status of the current branch.

*Important:* The "Hamster Time Tracker" extension on
`extensions.gnome.org https://extensions.gnome.org/extension/425/project-hamster-extension/`_
is *severely outdated*; it supports GNOME shell up to 3.20 only. There are
some other versions of this extension on extensions.gnome.org, but none of
them is supported by the current maintainers of the extension.

.. _metadata.json.in: data/metadata.json.in

Manual Installation For Testing and Development
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Clone the repository::

    git clone https://github.com/projecthamster/hamster-shell-extension.git

Make sure you are on the development branch::

    git switch -c develop origin/develop

To make this build available locally under your user account::

    make install-user

To build a fresh distribution package (this will create a distributable archive located in the ``dist/`` folder)::

    make dist

Afterwards, enable the extension and change the preferences using the
*gnome-extensions* tool (on GNOME 3.34 and earlier, you need to use *gnome-tweak-tool*).


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
