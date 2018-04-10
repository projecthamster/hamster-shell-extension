Style Guide
============

General
--------
- Try to stick to 79 chars. When this is not enough you may use up to 99 chars.
  This is more tolerable for code than for documentation.

Code-style
--------------
- Like the *GNOME-Shell* project we follow the `GJS coding style
  <https://wiki.gnome.org/Projects/GnomeShell/Gjs_StyleGuide>`_ which in short
  is: indent 4 spaces, no tabs, spaces after comma, no space after function
  call (Emacs mode line for this: 
  ``/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */``.
- Imports should be at the top, in two groups, one for standard imports (like
  ``imports.lang`` or ``imports.dbus``) and introspection, the other for Shell
  API.  Within the same group, put everything in alphabetic order.
- Readability trumps almost anything. Readable and approachable code carries
  it's weight as a lower contribution-barrier, less bugs and easier
  debugging.  Having a particular clever, aka dense, alternative is rarely
  warranted.
- Favour multiple small specialized (local) functions/methods over big
  all-encompassing ones.
- Use well established and maintained high quality 3rd party libraries over own
  implementations.
- Use expressive variable names. If you have to trade off verbosity and 
  expressiveness, go for the later.
- Assigning variables even if they are used only once can be preferable if
  expressions become clearer and less dense.

Documentation
---------------
- We use `JSDoc syntax and blog tags <http://usejsdoc.org>`_ to document all
  our code.
- Headings should capitalise each word.
- Please use ``-`` for unordered lists and ``#.`` for ordered lists unless you
  really want to enforce a certain numbering.
- No blank lines after headings. 

Committing and commit messages
------------------------------
- Commit one change/feature at a time (you can use `tig <http://jonas.nitro.dk/tig/>`_
  to select the changes you want to commit).
- Separate bug fixes from feature changes, bugfixes may need to be backported
  to the stable branch.
- Maximum line length is 50 characters for the first line and 72 for all
  following lines.
- The first line is a short summary, no trailing period.
- Leave a blank line between the summary and the body of the commit message.
- Explain what you did and add all relevant information to the commit message.
- If an issue exists for your feature/bug/task add it to the end of the commit
  message. If your commit implements a feature use the ``closes`` keyword, if
  it fixes a bug use ``fixes``.

Rebasing
--------
- Try to rebase to keep the commit history linear::

    $ git pull --rebase

- If you have uncommitted changes in your working directory use ``git stash``
  to stash the changes while rebasing::

    $ git stash
    $ git pull --rebase
    $ git stash pop

- Before you prepare your Pull Request, please squash (``git rebase -i
  HEAD~XXX``) any commits that really belong to one functional unit. It is
  perfectly fine (and preferable) if your PR has multiple modular and distinct
  commits though.

- **Do not** rebase already published changesets!

Pull Requests
-------------
The title of a pull request should contain a summary of the issue it is related
to, as well as the prepended issue id in square brackets. An example would look like
``[#23] Advanced report options``. This way, a link between the PR and the
issue will be created.
Each PR that is not absolutly non-trivial should include at least a very short
description on what is done and why. Just imagine the kind of info you would
look for in you dig it up in 12 month time.

Every pull request has to be approved by at least one other developer before
merging.
