# Sphinx directories
SPHINX_BUILDDIR = _build
SPHINX_TEST_SPHINX_BUILDDIR = _test_build

# Directory to collect all sourc file to in order to build.
BUILDDIR = build
# Directory to save a 'ready to deploy extension' archive
DISTDIR = dist

# Script to lauch a browser in order to open passed path.
define BROWSER_PYSCRIPT
import os, webbrowser, sys
try:
	from urllib import pathname2url
except:
	from urllib.request import pathname2url

webbrowser.open("file://" + pathname2url(os.path.abspath(sys.argv[1])))
endef
export BROWSER_PYSCRIPT

BROWSER := python -c "$$BROWSER_PYSCRIPT"

.PHONY: docs clean

.NOTPARALLEL: clean-build collect

help:
	@echo "Please use 'make <target>' where <target> is one of"
	@echo "   clean"
	@echo "   clean-build		to clean the build directory of any leftovers."
	@echo "   clean-docs"
	@echo "   collect			to collect all required files to the build directory."
	@echo "   compile			to compile file that needs to be shipped as a binary."
	@echo "   develop			to install (or update) all packages required for development"
	@echo "   dist				to package a release as a ready to deploy extension archive"
	@echo "   gettext-catalogue to generate a new gettext catalogue"
	@echo "   open-docs			to build and open the documentation"
	@echo "   test-style		to run the code against a set of stylechecks and linter."
	@echo "						(Requires JSHint)."
	@echo "   test-docs			to run automated tests on the documentation."

clean: clean-build clean-docs clean-test-docs
	rm -f dist/*

clean-build:
	rm -fr build

clean-docs:
	$(MAKE) -C docs clean SPHINX_BUILDDIR=$(SPHINX_BUILDDIR)

clean-test-docs:
	$(MAKE) -C docs clean SPHINX_BUILDDIR=$(SPHINX_TEST_SPHINX_BUILDDIR)

$(BUILDDIR):
	mkdir -p $@

collect:	$(BUILDDIR)
	cp -R extension/* $(BUILDDIR)
	cp -R data/* $(BUILDDIR)

compile: collect
	glib-compile-schemas $(BUILDDIR)/schemas
	find $(BUILDDIR) -name \*.po -execdir msgfmt hamster-shell-extension.po -o hamster-shell-extension.mo \;

gettext-catalogue:
	find ./extension/ -type f -name '*.js' -print > list
	xgettext -L JavaScript --from-code=UTF-8 --files-from=list -k_ -kN_ -o  ./messages.pot
	rm ./list

develop:
	pip install -U pip setuptools wheel
	pip install -U -r requirements.pip

dist: compile
# We need to do this like this as 'zip' always uses the cwd as archive root.
# And for the extension to work extension.js etc. need to be at the root.
	mkdir -p $(DISTDIR);
	cd $(BUILDDIR); zip -rq ../dist/contact@projecthamster.org.zip ./* || true
	cd $(BUILDDIR); tar -czf ../dist/contact@projecthamster.org.tar.gz *
	@ls -l dist

docs:
	$(MAKE) -C docs clean
	$(MAKE) -C docs html

open-docs: docs
	$(BROWSER) docs/_build/html/index.html

test-docs:
	make docs SPHINX_BUILDDIR=$(SPHINX_TEST_SPHINX_BUILDDIR) SPHINXOPTS='-W'
	make -C docs linkcheck SPHINX_BUILDDIR=$(SPHINX_TEST_SPHINX_BUILDDIR)

test-style:
	jshint --config .jshint.cfg extension/
