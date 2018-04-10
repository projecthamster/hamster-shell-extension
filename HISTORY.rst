.. :changelog:

History
========

Version 0.10.0
----------------------------------------------------------------------------------------------------------------------------------------------------------
As this release contains a massive refactoring effort as well as a general overhaul of the entire project, the following
gives just general overview over the most significant changes. For a full list of all closed issued please refer to the
`issue tracker <https://github.com/projecthamster/hamster-shell-extension/issues?q=is%3Aissue+milestone%3A0.10.0+is%3Aclosed>`_.

- Switch to a semantic versioning scheme (starting at ``0.10.0``).
- Provide an all new ``Makefile`` that handles common development and packaging tasks.
- Support ``gnome-shell`` versions up to ``3.28``.
- Add 'weblate.org' translation workflow.
- Provide basic documentation.
- Improve handling of async dbus calls.
- Update copyright notices.
- ``JSHint`` compliance (enforced by CI setup).
- Fix multiple ``variable redeclaration error`` s.
- Switch to a new UUID for the extension (``contact@projecthamster.org``).
- Split codebase over multiple files for clarity.
- Show extension version in preference dialog.
- Removed obsolete legacy imports.



Build 18 (2015-10-03)
------------------------
- Fix GNOME Shell 3.18 compatibility issues.

Build 17 (2015-07-28)
----------------------
- Activities are now scrolled to the bottom when opening the menu (@rrthomas).


Build 12 (2014-10-28)
-----------------------
- The uploaded extension was missing subfolders.


Build 11 (2014-10-26)
---------------------
- Cosmetic fixes to the dropdown - set ``min-width`` and fix the input box.


Build 10 (2014-10-18)
----------------------
 * Bump Gnome compatibility to 3.14.


Build 8 (2014-09-07)
---------------------
- Allow autocomplete after deltas and timestams (@ams-cs).
- Update icons (@0rAX0).
- German locale (@bwcknr).
- Check tag presence correctly and avoid adding hashes to activities (@toupeira).


Build 7 (2014-03-14)
---------------------
- Call the windows synchronously, so hopefully less of two-click "window is ready".
- Fix typo in Czechz locale (@Idoktor).
- Fix vertical label alignment in panel (@beanaroo).
- Fix too much shadow (HT @jfcahce).


Build 6 (2013-10-22)
---------------------
- Update to 3.10 (patch by @exine).


Build 5 (2013-07-07)
---------------------
- Update to 3.8 (patches by @aleho and @WBTMagnum).


Build 4.4 (2012-12-31)
-----------------------
- Fix bug where unlock screen breaks just because we changed stage focus upon
  showing menu (issue #50).
- Attempt to fix bug with locale switching to english when hamster is running.


Build 4.2, 4.3 (2012-11-08)
---------------------------
- Properly kill the refresh timeout on disabling.


Build 4, 4.1 (2012-10-30)
----------------------------
- Switch over to GNOME Shell 3.6+.


Build 3 (2012-10-04)
---------------------
- "Add earlier activity" now back in the dropdown.
- Reactivating task via extension now also includes tags and the description.
- Global hotkey is back - tweak it via extension preferences page.


Build 2 (2012-08-13)
---------------------
- Initial push to ``extensions.gnome.org``.
