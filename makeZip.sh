#!/bin/bash

extensionName="day-progress@arcaege.github.io"

# Remove directory if exists
rm -rf /tmp/gnome-extension

# Re-create it
echo "Creating folders"
mkdir /tmp/gnome-extension
mkdir /tmp/gnome-extension/$extensionName

# Copy all files
echo "Copying files"
cp -r ./* /tmp/gnome-extension/$extensionName/

# Remove unnecessary files/folders
echo "Removing unnecessary files"
cd /tmp/gnome-extension/$extensionName
rm -rf ./.git
rm -rf ./docs
rm -r  ./README.md
rm -r  ./makeZip.sh

# Zip files
echo "Zipping it up"
zip -r ../$extensionName.zip ./

# Open website and folder in default apps
echo "Opening website and file browser"
xdg-open https://extensions.gnome.org/upload/
xdg-open ..

echo "Done!"