Versioning
===========
``hamster-shell-extension`` follows the `semantic versioning <http://semver.org>`_ scheme.
Each release is packaged and uploaded to the
`gnome extensions repository <https://extensions.gnome.org/extension/425/project-hamster-extension/>`_.
As this repository does not allow listing of multiple versions of the same
extension we will always provide the latest stable release.  If you need a
different version, please check out the master branch on github. We provide
tags for all releases as well as convenient tarballs for manual installation.

All current (pre 1.0) versions are targeted towards usage with ``hamter-time-tracker``
(aka ``legacy hamster``). Upcoming support for the rewritten codebase (``hamster-lib`` and
friends) will be indicated by the ``1.0.0`` version. The goal for our work on the ``0.*.*``
releases is to bring the repository/project up to standards with the rest of the project
in terms of documentation, tests and general infrastructure.

About Previous Versioning
--------------------------
Before version 0.10.0 *Hamster-Shell-Extension* used to handle versioning by
carrying a incrementing *build number*. In addition to that, *git tags* were
used on github (as releases) that indicate the (highest compatible) GNOME-Shell
version targeted by this release. Which actually is meta information and should
not be part of the versioning at all.
