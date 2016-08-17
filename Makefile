help:
	@echo "Please use 'make <target>' where <target> is one of"
	@echo "   clean"
	@echo "   dist          to package a release to be uploaded to extensions.gnome.org"

clean:
	rm -f dist/*

dist: clean
	zip -r dist/hamster@projecthamster.wordpress.com.zip extension/*
	ls -l dist
