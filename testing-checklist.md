# Website Testing Checklist

## 🎯 Core Functionality Tests

### Music Page (`/music/index.html`)
- [ ] All album covers load properly
- [ ] Album filtering dropdown works
- [ ] Search functionality works
- [ ] All album links work
- [ ] No broken images or placeholder images

### Tags Page (`/collections/tags.html`)
- [ ] Page loads without console errors
- [ ] All tags appear in the tag cloud
- [ ] Clicking tags shows correct photos
- [ ] Photo lightbox works
- [ ] Back to Top button works
- [ ] No "Photoset not found" errors in console

### Individual Album Pages
- [ ] All album pages load
- [ ] Photos display in lightbox
- [ ] Navigation works
- [ ] SEO meta tags present
- [ ] No JavaScript errors

## 🔍 Specific Problem Areas to Check

### Album ID Issues (like Elf Power bug)
- [ ] Run `validateAllAlbumIds()` script
- [ ] Check console for "Photoset not found" errors
- [ ] Verify albums with known tags appear on tags page

### Cover Image Issues (like Eyelids spider bug)
- [ ] No placeholder images on music page
- [ ] All covers are actual concert photos
- [ ] No broken image links

### Filtering Issues (like Dimmer Twins bug)
- [ ] Multi-artist albums appear when filtering by individual names
- [ ] No duplicate albums in results
- [ ] filterNames arrays work correctly

## 🧪 Testing Methods

### 1. Automated Script Testing
```javascript
// Run in browser console on any page:
validateAllAlbumIds()
```

### 2. Tags Page Stress Test
- Visit `/collections/tags.html`
- Wait for all albums to load
- Check console for errors
- Click 10-15 random tags
- Verify expected albums appear

### 3. Music Page Filtering Test
- Visit `/music/index.html`
- Try filtering by various artists
- Check for missing albums
- Verify cover images load

### 4. Random Album Page Test
- Visit 5-10 random album pages
- Check photos load in lightbox
- Verify no JavaScript errors

## 📊 Console Monitoring

### Good Signs:
- `✅ Fetched ALL X photos from album Y`
- No "Photoset not found" errors
- No 404 image errors

### Bad Signs:
- `❌ Alternative method failed: Photoset not found`
- `💥 Error fetching Flickr photos`
- `🚫 Failed to load image` errors

## 🔧 Quick Fixes for Common Issues

### Wrong Album ID:
1. Find correct ID in album page HTML
2. Update ALBUM_DATA flickrUrl
3. Test tags page

### Missing Cover Image:
1. Add manual coverUrl to album object
2. Or fix fetchFlickrAlbumCover logic

### Missing from Tags:
1. Check if album fetches successfully
2. Verify photos have expected tags on Flickr
3. Check album ID is correct

## 📝 Testing Log Template

```
Date: ___________
Tester: _________

Music Page: ✅/❌
Tags Page: ✅/❌
Album Pages: ✅/❌
Console Errors: ___________
Issues Found: ___________
```
