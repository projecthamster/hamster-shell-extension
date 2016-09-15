Packaging / Release Process
============================
Here we document the packaging and release process.
This will most likely be of no interest to you, but is done for transparency
and internal documentation.

Instead of having to go through the process manually we provide convenient make
targets for its individual steps as well as for the whole process (``make
dist``).

TL;DR
--------
#. Bump version: ``bumpversion [minor, patch]``
#. Check and if needed bump Gnome Shell compatibility in ``metadata.json``.
#. Commit your changes and run ``make dist``.
#. Go to ``https://extensions.gnome.org/upload/`` and upload the generated file
   ``hamster@projecthamster.wordpress.com.zip``.
#. You can check the review progress at ``https://extensions.gnome.org/review/``.

Long Version
-------------
GNOME-Shell extensions require at lest an ``extension.js`` as well as a
``metadata.json`` file in their root directory. Besides other auxillary files
we opt to add ``prefs.js`` and a ``stylesheet.css`` as optional files that are
(if used) expected to have those names and be placed at the root directory as
well.
All actual source code is placed in the ``/extensions`` directory of the main
repository.

File Location / Directory Structure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Besides the actual source code, our project makes use of addition non-code
resources. In particular: Icon image files and ``gettext`` translations. All
these resources are organized in a separate ``/data`` directory of the root
repository.
Whilst this structure make for a clean and simple organization of our codebase
to work on, it is unfit to be used as a working *extension*. This requires some
addition packaging.

Collect and Compile
~~~~~~~~~~~~~~~~~~~~~
In order for GNOME-Shell to accept our extension properly two additional things
need to happen.

#. We need to place the content of the ``data`` directory within the ``extension``
   directory (e.g. on the same level as ``extension.js``.
#. We need to compile the GSettings schema as well as gettext ``.po`` files so
   as it actually their binary versions ``gschemas.compiled`` and ``*.mo`` files
   that we deploy.

In order not to mess with our existing clean structure, all this collecting and
compiling happens in a dedicated build directory which is not part of the
project repository.

Packaging
~~~~~~~~~~
Now that our build directory contains all required files in state expected by
GNOME-shell all that is left to do is to warp it up in a convenient easy to
deploy way.  There are two relevant ways to deploy an extension.

#. Via the official `gnome extensions repository <https://extensions.gnome.org>`_.
#. Copying/symlinking the contend of the build directory to 
   ``~/.local/share/gnome-shell/extension/hamster@projecthamster.wordpreess.com``

In order to upload our release to ``extensions.gnome.org`` we wrap the build
directory in a zip file while we also provide a separate tarball of the same
content which can easily be used to copy/symlink its content in the
aforementioned way.
