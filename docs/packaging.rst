Packaging / Release Process
============================

#. Bump version: ``bumpversion [minor, patch]``
#. Check and if needed bump Gnome Shell compatibility in ``metadata.json``.
#. Commit your changes and run ``make dist``.
#. Go to ``https://extensions.gnome.org/upload/`` and upload the generated file
   ``hamster@projecthamster.wordpress.com.zip``.
#. You can check the review progress at ``https://extensions.gnome.org/review/``.
