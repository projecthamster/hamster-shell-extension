Hamster Gnome Shell extension
===============================

A Simple Hamster shell extension for Gnome 3.

-----

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

Current compatible Gnome shell version: 3.26
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

This will create a distributable archive.
You can now use the ``tweaktool`` (at the bottom of the ``extensions`` tab)
to install and activate the new ``zip`` file located in the ``dist`` directory.

Alternatively you just can unpack the tar archive to ``~/.local/share/gnome-shell/extensions/``.
As a result, a directory named ``contact@projecthamster.org`` should be there now.

After that you can enable the extension and change the preferences using Tweak
Tool, or on ``https://extensions.gnome.org/local/``
