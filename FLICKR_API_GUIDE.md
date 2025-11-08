# Flickr API Integration Guide

This guide explains how to use the new Flickr API integration to dynamically display photos from your Flickr albums in a beautiful grid with lightbox functionality.

## 🎯 What's New

Your website now supports **two methods** for displaying photos:

1. **Manual Album Links** (current method) - Links directly to Flickr albums
2. **Dynamic Photo Grid** (NEW) - Fetches and displays photos using Flickr API with lightbox

## 🚀 Quick Start

### Option 1: Using Public Feed (No API Key Required)

The easiest way to get started is using Flickr's public feed. This is already configured in `js/main.js`:

```javascript
const FLICKR_CONFIG = {
    apiKey: 'YOUR_FLICKR_API_KEY',
    userId: '198613393@N03', // Your Flickr user ID
    usePublicFeed: true // Set to true for no API key required
};
```

**Limitations of Public Feed:**
- Only shows your 20 most recent public photos
- Cannot fetch specific album photos
- Limited photo size options

### Option 2: Using Flickr REST API (Recommended)

For full control and to fetch specific album photos:

#### Step 1: Get Your Flickr API Key

1. Go to https://www.flickr.com/services/api/
2. Click "Request an API Key"
3. Choose "Apply for a Non-Commercial Key"
4. Fill out the form (it's quick!)
5. Copy your API Key

#### Step 2: Configure Your API Key

Open `js/main.js` and update the configuration:

```javascript
const FLICKR_CONFIG = {
    apiKey: 'YOUR_ACTUAL_API_KEY_HERE', // Paste your API key
    userId: '198613393@N03', // Your Flickr user ID (already correct)
    usePublicFeed: false // Set to false to use REST API
};
```

## 📸 How to Use the Photo Grid

### Method 1: Create a Dedicated Album Page

Use the example template `album-example.html`:

1. Copy `album-example.html` to create a new page (e.g., `album-porchfest.html`)
2. Update the album URL in the script section:

```javascript
const albumUrl = 'https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/';
displayAlbumPhotos(albumUrl);
```

3. Update the page title and subtitle in the HTML

### Method 2: Use Query Parameters

You can pass the album URL as a query parameter:

```
album-example.html?album=https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/
```

This allows you to use one template for all albums!

### Method 3: Modify Existing Collection Pages

Update your collection pages (e.g., `collections/music.html`) to show photos instead of album cards:

1. Change the grid div from `albums-grid` to `photos-grid`:
```html
<div id="photos-grid" class="photos-grid">
    <!-- Photos will be loaded here -->
</div>
```

2. Add the lightbox HTML before the footer:
```html
<div id="lightbox">
    <div class="lightbox-content">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <button class="lightbox-nav lightbox-prev" onclick="prevLightboxImage()">
            <i class="fas fa-chevron-left"></i>
        </button>
        <img id="lightbox-img" src="" alt="Photo">
        <button class="lightbox-nav lightbox-next" onclick="nextLightboxImage()">
            <i class="fas fa-chevron-right"></i>
        </button>
        <div class="lightbox-caption" id="lightbox-caption"></div>
        <div class="lightbox-counter" id="lightbox-counter"></div>
    </div>
</div>
```

3. Add JavaScript to load photos:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const albumUrl = 'YOUR_FLICKR_ALBUM_URL';
    displayAlbumPhotos(albumUrl);
});
```

## 🎨 Features

### Responsive Photo Grid
- Automatically adjusts columns based on screen size
- Desktop: 3-4 columns
- Tablet: 2-3 columns
- Mobile: 1-2 columns

### Lightbox Viewer
- Click any photo to open in fullscreen lightbox
- Navigate with arrow buttons or keyboard (← →)
- Press ESC to close
- Shows photo title and counter (e.g., "3 / 24")
- Smooth transitions and animations

### Automatic Updates
- Photos update automatically when you add new ones to Flickr
- No need to manually update your website
- Just upload to Flickr and they appear!

## 🔧 Available Functions

### `displayAlbumPhotos(albumUrl)`
Fetches and displays photos from a specific Flickr album.

```javascript
displayAlbumPhotos('https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/');
```

### `fetchFlickrAlbumPhotos(albumId, maxPhotos)`
Fetches photos from a Flickr album using REST API.

```javascript
const photos = await fetchFlickrAlbumPhotos('72177720329859726', 50);
```

### `fetchFlickrPublicPhotos(maxPhotos)`
Fetches recent public photos (no API key required).

```javascript
const photos = await fetchFlickrPublicPhotos(20);
```

### Lightbox Functions
- `openLightbox(photos, index)` - Open lightbox at specific photo
- `closeLightbox()` - Close the lightbox
- `nextLightboxImage()` - Show next photo
- `prevLightboxImage()` - Show previous photo

## 🎯 Example Use Cases

### 1. Single Album Gallery
Perfect for showcasing one concert or event:
```javascript
displayAlbumPhotos('https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/');
```

### 2. Multiple Albums on One Page
Show photos from multiple albums:
```javascript
const album1 = await fetchFlickrAlbumPhotos('72177720329859726');
const album2 = await fetchFlickrAlbumPhotos('72177720329904439');
const allPhotos = [...album1, ...album2];
// Display combined photos
```

### 3. Recent Photos Feed
Show your latest uploads:
```javascript
const recentPhotos = await fetchFlickrPublicPhotos(30);
// Display recent photos
```

## 🔒 Security Note

Your Flickr API key is visible in the JavaScript file. This is normal for client-side applications. Flickr API keys are designed to be used this way and have rate limits to prevent abuse. Just make sure to:

1. Use a **Non-Commercial** API key
2. Don't share your key in public repositories (if you make the code public)
3. Monitor your API usage on Flickr

## 🐛 Troubleshooting

### Photos Not Loading?
1. Check browser console for errors (F12 → Console)
2. Verify your API key is correct
3. Make sure `usePublicFeed` is set correctly
4. Check that the album URL is valid

### API Key Error?
- Make sure you copied the entire API key
- Verify the key is active on Flickr
- Check you're not exceeding rate limits

### Lightbox Not Working?
- Make sure the lightbox HTML is added to your page
- Check that Font Awesome is loaded (for icons)
- Verify JavaScript is not blocked

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎉 Next Steps

1. **Get your API key** from Flickr
2. **Update the configuration** in `js/main.js`
3. **Test with** `album-example.html`
4. **Customize** your collection pages to use the photo grid
5. **Enjoy** automatic photo updates!

## 💡 Tips

- Use high-quality cover images for album cards
- Keep album titles descriptive
- Organize photos into themed albums
- Add captions to photos on Flickr (they'll show in the lightbox)
- Use consistent aspect ratios for best grid appearance

---

**Need help?** Check the Flickr API documentation: https://www.flickr.com/services/api/
