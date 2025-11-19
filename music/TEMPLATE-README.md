# Music Album Template Usage Guide

## Template File: `TEMPLATE-music-album.html`

This template provides a standardized structure for all music album pages with consistent:
- **Margins and spacing** (proper margin above "Back to Music" button)
- **Share functionality** (Instagram, Threads, Facebook, Pinterest, Copy Link)
- **Lightbox structure** with uniform share icon sizes and positioning
- **Official artist links section** (optional)
- **Bottom back button** with consistent margins
- **SEO meta tags** for optimal search engine optimization
- **Google Analytics** integration

## How to Use This Template

### Step 1: Copy the Template
```bash
cp TEMPLATE-music-album.html [DATE]-[ARTIST-NAME]-[VENUE]-athens-ga.html
```

### Step 2: Replace All Placeholders

**Required Replacements:**
- `[DATE]` → Event date (e.g., "2025-11-11")
- `[ARTIST]` → Artist name (e.g., "Jerry Joseph & the Jackmormons")
- `[VENUE]` → Venue name (e.g., "Nowhere Bar")
- `[Artist Name]` → Artist name for keywords
- `[genre]` → Music genre (e.g., "alternative rock, indie rock")
- `[additional relevant terms]` → Extra keywords
- `[EVENT DETAILS]` → Full event description
- `[FLICKR_IMAGE_URL]` → Cover photo URL from Flickr
- `[PAGE_URL]` → HTML filename
- `[FLICKR_ALBUM_URL]` → Full Flickr album URL

**Optional Replacements (if artist has official site):**
- Uncomment the "Artist Official Site" section
- `[OFFICIAL_LINK]` → Artist's official website URL
- `[ARTIST NAME]` → Artist name for link text

### Step 3: Example Replacements

**From:**
```html
<title>[DATE] [ARTIST] @ [VENUE] | Athens, GA - Jayne Clamp Photography</title>
```

**To:**
```html
<title>2025-11-11 Jerry Joseph & the Jackmormons @ Nowhere Bar | Athens, GA - Jayne Clamp Photography</title>
```

### Step 4: Flickr Album URL Format
```javascript
const albumUrl = 'https://www.flickr.com/photos/jayneclamp/albums/72177720330387630/';
```

## Template Features

### ✅ Standardized Structure
- Consistent header with mobile menu toggle
- Proper "Back to Music" button positioning with margin
- Uniform photo grid layout
- Standard footer with social links

### ✅ Complete Share Functionality
- Lightbox share button (exact same size across all albums)
- Share menu with standardized icon order:
  1. Instagram
  2. Threads  
  3. Facebook
  4. Pinterest
  5. Copy Link

### ✅ SEO Optimization
- Complete meta tag structure
- Open Graph tags for social media
- Twitter Card integration
- Proper keyword optimization

### ✅ Optional Artist Links
- Standardized styling for official artist websites
- Consistent positioning and margins
- Professional appearance with hover effects

## File Naming Convention
```
YYYY-MM-DD-artist-name-venue-athens-ga.html
```

**Examples:**
- `2025-11-11-jerry-joseph-jackmormons-nowhere-bar-athens-ga.html`
- `2024-03-01-lona-40-watt-athens-ga.html`
- `2023-10-07-taxicab-verses-40-watt-athens-ga.html`

## Quality Checklist

Before publishing, verify:
- [ ] All placeholders replaced with actual content
- [ ] Flickr album URL is correct and working
- [ ] Cover photo URL is valid
- [ ] Meta tags are properly filled out
- [ ] Artist official site link works (if included)
- [ ] Page title matches the content
- [ ] File name follows naming convention

This template ensures every music album page has the same professional appearance, functionality, and user experience across the entire website.
