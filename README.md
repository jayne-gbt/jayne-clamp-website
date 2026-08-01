# Jayne Clamp Photography

Photography portfolio site - black background, collections for Music, Events, Travel, Birds, Landscapes, and Misc. Photos are hosted on Flickr; the site fetches and displays them through the Flickr API.

## Structure

```
index.html, music.html, events.html, ...   collection pages
music/, events/, landscapes/, ...          individual show/album pages
css/style.css                              styles
js/main.js                                 Flickr fetching, album data, filtering, lightbox
```

`js/main.js` contains `ALBUM_DATA`, a per-collection list of shows/albums with their Flickr URLs, cover images, and (optionally) a link to a dedicated page under `music/` or `events/` etc. See the docs folder (sibling to this repo, not published) for the full workflow on adding a new album.

## Hosting

Netlify, deployed from this repo's `main` branch on GitHub - push to `main` and Netlify builds and deploys automatically.
