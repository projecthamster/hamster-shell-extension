Hacking
========

One of the great challenges developing or contributing to a *GNOME-Shell*
extension is the lack of documentation for it.
In order to be as inviting as possible and to allow you to get hacking on
*Hamster-Shell-Extension* without dwelling all to deep in the muddy waters of
*GNOME-Shell* development we aim to do two things.

#. Highlight those parts of the code that are closely coupled with specific
   parts of the *GNOME-Shell* framework. This way you have a good idea if there
   are hidden constrains to be considered or if "what you see is what you get".
#. Provide some references and bits and pieces about various aspects of
   *GNOME-Shell* development in general. This is particularly helpful if you
   actually need to interact with the shell framework to get you work done.

References
-----------
- `GNOME's own entry point for extension development <https://wiki.gnome.org/Projects/GnomeShell/Extensions>`_
- `Notes on i18n and preferences dialog <https://iacopodeenosee.wordpress.com/2013/03/10/simple-guide-to-improve-your-own-extension-on-gnome-shell/>`_.
- `UUID Guidelines <https://wiki.gnome.org/Projects/GnomeShell/Extensions/UUIDGuidelines>`_
- `GJS <https://wiki.gnome.org/action/show/Projects/Gjs?action=show&redirect=Gjs>`_: Javascript Bindings for *GNOME*. This also mentions the possibility of tests.
- `A non trivial introduction <http://mathematicalcoffee.blogspot.de/2012/09/gnome-shell-extensions-getting-started.html>`_ by mathematicalcoffee which
  also explains some of the mandatory and optional bits and pieces.
- The closest to a practical `API Reference <http://mathematicalcoffee.blogspot.de/2012/09/gnome-shell-javascript-source.html>`_
  I could find. While not perfect it provides a most useful starting point if you know what kind of widget/feature you want
  but not where to find it. Or of cause, if you want to know where to find out more about this obscure
  line of code you just stumbled upon.
- `Additional information <https://wiki.gnome.org/Projects/GnomeShell/Extensions/FAQ/CreatingExtensions>`_ on i18n and multi-file extensions
- Information on current `dbus best practices <https://mail.gnome.org/archives/gnome-shell-list/2013-February/msg00059.html>`_.
  This is particular usefull as it mentions that ``Sync`` and ``Remote`` strings are appended to our interface method names. For a full tutorial
  please `see refer to this one <http://cheesehead-techblog.blogspot.de/2012/08/dbus-tutorial-introspection-figuring.html>`_.
- `A comprehensive overview over the shell <https://blog.fpmurphy.com/2011/05/more-gnome-shell-customization.html>`_ that cover a wide range from general architecture to
  the exact names of various parts of the "gnome shell screen".
- `GNOME's official page on shell development <https://wiki.gnome.org/Projects/GnomeShell/Development>`_ is particularly useful in linking the different bits and pieces (css, tweeners, clutter, ...) togeter.
- `One of the most instructive series/tutorials <http://blog.mecheye.net/2011/11/modern-gnome-shell-extension-part-1/>`_ by Jasper St. Pierre.
