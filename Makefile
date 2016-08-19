# Sphinx directories
BUILDDIR = _build
TEST_BUILDDIR = _test_build

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

help:
	@echo "Please use 'make <target>' where <target> is one of"
	@echo "   clean"
	@echo "   clean-docs"
	@echo "   develop       to install (or update) all packages required for development"
	@echo "   dist          to package a release to be uploaded to extensions.gnome.org"
	@echo "   open-docs     to build and open the documentation"
	@echo "   test-docs     to run automated tests on the documentation."

clean: clean-docs, clean-test-docs
	rm -f dist/*

clean-docs:
	$(MAKE) -C docs clean BUILDDIR=$(BUILDDIR)

clean-test-docs:
	$(MAKE) -C docs clean BUILDDIR=$(TEST_BUILDDIR)

develop:
	pip install -U pip setuptools wheel
	pip install -U -r requirements.pip

dist: clean
	zip -r dist/hamster@projecthamster.wordpress.com.zip extension/*
	ls -l dist

docs:
	$(MAKE) -C docs clean
	$(MAKE) -C docs html

open-docs: docs
	$(BROWSER) docs/_build/html/index.html

test-docs:
	make docs BUILDDIR=$(TEST_BUILDDIR) SPHINXOPTS='-W'
	make -C docs linkcheck BUILDDIR=$(TEST_BUILDDIR)
