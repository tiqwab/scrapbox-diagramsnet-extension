# scrapbox-diagramsnet-extension

Web browser extension to integrate [Diagrams.net](https://www.diagrams.net/) (Draw.io) editor with [Scrapbox](https://scrapbox.io).

https://user-images.githubusercontent.com/11240297/169002527-49601dcf-7c7f-4db3-8fdf-8a6532585738.mp4

## Features

- Add a new diagram drawn on Diagrams.net
- Edit diagram created by this extension

## Prerequisite

- Have a Scrapbox account with Gyazo OAuth Upload enabled

## Install

- [for Firefox](https://addons.mozilla.org/en-US/firefox/addon/scrapbox-diagramsnet-extension/)
- for Google Chrome (not yet prepared)

## Build and package

```
# Generate artifacts in distribution/
$ npm run build

# Generate an extension package (zip) in web-ext-artifacts/
$ npm run package
```

## Release

Upload extension package manually or run release workflow with version tag.
