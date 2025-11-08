# How to Add New Album Pages

This guide shows you how to create individual album pages with photo grids for each of your concerts/events.

## Quick Steps

### 1. Copy the Template

Copy `albums/porchfest-2025.html` and rename it:

```bash
cp albums/porchfest-2025.html albums/YOUR-ALBUM-NAME.html
```

### 2. Edit the New File

Open your new album file and change these parts:

#### A. Page Title (line 6)
```html
<title>YOUR ALBUM TITLE - Jayne Clamp Photography</title>
```

#### B. Album Header (lines 62-64)
```html
<h2 class="page-title">YOUR ALBUM TITLE</h2>
<p class="page-subtitle">NUMBER photos</p>
```

#### C. Flickr Album URL (line 108)
```javascript
const albumUrl = 'YOUR_FLICKR_ALBUM_URL';
```

### 3. Add to Your Album List

Open `js/main.js` and find your album in the `ALBUM_DATA` section. Add the `albumPage` property:

```javascript
{
    title: 'YOUR ALBUM TITLE',
    photoCount: 12,
    flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/ALBUM_ID/',
    coverUrl: 'https://live.staticflickr.com/65535/PHOTO_ID_b.jpg',
    albumPage: '../albums/your-album-name.html'  // ← Add this line
},
```

## Complete Example

Let's say you want to add a page for "2025-09-21 Vincas @ Hendershots":

### Step 1: Create the file
```bash
albums/vincas-hendershots-2025.html
```

### Step 2: Edit the file

Change these lines:

```html
<!-- Line 6 -->
<title>2025-09-21 Vincas @ Hendershots | Athens, GA - Jayne Clamp Photography</title>

<!-- Lines 62-64 -->
<h2 class="page-title">2025-09-21 Vincas @ Hendershots | Athens, GA</h2>
<p class="page-subtitle">11 photos</p>

<!-- Line 108 -->
const albumUrl = 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/';
```

### Step 3: Update js/main.js

```javascript
{
    title: '2025-09-21 Vincas @ Hendershots | Athens, GA',
    photoCount: 11,
    flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
    coverUrl: 'https://live.staticflickr.com/65535/54876776442_e83e6eea26_b.jpg',
    albumPage: '../albums/vincas-hendershots-2025.html'  // ← Add this
},
```

## What Happens

- **Without `albumPage`**: Album card links directly to Flickr (opens in new tab)
- **With `albumPage`**: Album card links to your custom page with photo grid + lightbox

## File Naming Tips

Keep filenames:
- Lowercase
- Use hyphens instead of spaces
- Short but descriptive
- End with `.html`

Examples:
- `porchfest-2025.html`
- `vincas-hendershots-2025.html`
- `dbt-homecoming-2025.html`
- `steel-pulse-2019.html`

## Template Structure

```
albums/
├── porchfest-2025.html          ← Template (copy this)
├── vincas-hendershots-2025.html ← Your new album
├── dbt-homecoming-2025.html     ← Another album
└── ...
```

## Quick Copy-Paste Template

Here's what to change in each new album file:

```html
<!-- 1. Page title (line 6) -->
<title>ALBUM_TITLE - Jayne Clamp Photography</title>

<!-- 2. Meta description (line 7) -->
<meta name="description" content="Photos from EVENT_NAME">

<!-- 3. Back button (line 54) -->
<a href="../collections/COLLECTION_TYPE.html" class="back-button">

<!-- 4. Album title (line 62) -->
<h2 class="page-title">ALBUM_TITLE</h2>

<!-- 5. Photo count (line 63) -->
<p class="page-subtitle">NUMBER photos</p>

<!-- 6. Flickr URL (line 108) -->
const albumUrl = 'YOUR_FLICKR_ALBUM_URL';
```

## Testing

1. Save your new album file
2. Go to `collections/music.html` (or relevant collection)
3. Click the album card
4. Should open your custom page with photo grid
5. Click any photo to test lightbox

## Troubleshooting

**Photos not loading?**
- Check the Flickr album URL is correct
- Check browser console (F12) for errors
- Make sure API key is configured in `js/main.js`

**Album card still links to Flickr?**
- Make sure you added `albumPage: '../albums/filename.html'` in `js/main.js`
- Check the path is correct (use `../` to go up one directory)

**Page looks broken?**
- Check CSS path: `<link rel="stylesheet" href="../css/style.css">`
- Check JS path: `<script src="../js/main.js"></script>`
- Make sure you're using `../` since you're in the `albums/` folder

## Batch Creation

To create multiple albums quickly, you can use this bash script:

```bash
#!/bin/bash
# Create multiple album pages at once

albums=(
    "vincas-hendershots-2025"
    "dbt-homecoming-2025"
    "james-mcmurtry-2025"
)

for album in "${albums[@]}"; do
    cp albums/porchfest-2025.html "albums/${album}.html"
    echo "Created albums/${album}.html"
done
```

Then edit each file individually with the correct details.

---

**Need help?** Check `FLICKR_API_GUIDE.md` for more details on the Flickr API integration.
