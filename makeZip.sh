#!/bin/bash

# Remove /tmp/day-progress-gnome-extension if exists
rm -rf /tmp/day-progress-gnome-extension

# Re-create it
echo "Creating folders"
mkdir /tmp/day-progress-gnome-extension
mkdir /tmp/day-progress-gnome-extension/day-progress@arcaege.github.io

# Copy all files
echo "Copying files"
cp -r ./ /tmp/day-progress-gnome-extension/day-progress@arcaege.github.io/

# Remove unnecessary files/folders
echo "Removing unnecessary files"
cd /tmp/day-progress-gnome-extension/day-progress@arcaege.github.io
rm -rf ./.git
rm -rf ./docs
rm -r  ./README.md
rm -r  ./makeZip.sh

# Zip files
echo "Zipping it up"
zip -r ../day-progress@arcaege.github.io.zip ./

echo "Done!"

xdg-open ..