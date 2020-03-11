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
~~~~~~~~~~~~~~~~~~~~~~~
The extension is available on `the central extension repository <https://extensions.gnome.org/extension/425/project-hamster-extension>`_.

Current compatible Gnome shell version: 3.28
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

Installing directly from file::

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

