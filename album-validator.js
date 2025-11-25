/**
 * Album ID Validation Script for Jayne Clamp Photography Website
 * 
 * This script validates all Flickr album IDs in ALBUM_DATA to ensure:
 * - All album IDs exist and are accessible on Flickr
 * - No "Photoset not found" errors that break the tags page
 * - All URLs are properly formatted
 * 
 * USAGE:
 * 1. Open your website in a browser (any page)
 * 2. Open browser console (F12 → Console)
 * 3. Copy/paste this entire script
 * 4. Run: validateAllAlbumIds()
 * 
 * Created: November 2024
 * Last Updated: November 2024
 */

async function validateAllAlbumIds() {
    console.log('🔍 Starting album ID validation...');
    console.log('📅 ' + new Date().toLocaleString());
    
    const FLICKR_API_KEY = '7d9678338d941743b7b6d33d3559cc30';
    const results = {
        valid: [],
        invalid: [],
        errors: [],
        skipped: []
    };
    
    // Check if ALBUM_DATA exists
    if (typeof ALBUM_DATA === 'undefined' || !ALBUM_DATA.music) {
        console.error('❌ ALBUM_DATA not found. Make sure you\'re on a page that loads main.js');
        return;
    }
    
    // Extract albums with Flickr URLs (skip albums without flickrUrl like single-photo albums)
    const albumsToCheck = ALBUM_DATA.music.filter(album => album.flickrUrl);
    const albumsSkipped = ALBUM_DATA.music.filter(album => !album.flickrUrl);
    
    console.log(`📊 Found ${ALBUM_DATA.music.length} total albums`);
    console.log(`🔍 Checking ${albumsToCheck.length} albums with Flickr URLs`);
    console.log(`⏭️  Skipping ${albumsSkipped.length} albums without Flickr URLs`);
    
    // Log skipped albums
    if (albumsSkipped.length > 0) {
        console.log('\n⏭️  SKIPPED ALBUMS (no Flickr URL):');
        albumsSkipped.forEach(album => {
            results.skipped.push({
                title: album.title,
                reason: 'No flickrUrl (likely single photo album)'
            });
            console.log(`- ${album.title}`);
        });
    }
    
    console.log('\n🔍 VALIDATING FLICKR ALBUMS:');
    
    for (let i = 0; i < albumsToCheck.length; i++) {
        const album = albumsToCheck[i];
        const albumId = extractAlbumId(album.flickrUrl);
        
        if (!albumId) {
            results.errors.push({
                title: album.title,
                error: 'Could not extract album ID from URL',
                flickrUrl: album.flickrUrl
            });
            console.log(`💥 ${i + 1}/${albumsToCheck.length}: ${album.title} - Invalid URL format`);
            continue;
        }
        
        try {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getInfo&api_key=${FLICKR_API_KEY}&photoset_id=${albumId}&format=json&nojsoncallback=1`;
            
            console.log(`${i + 1}/${albumsToCheck.length}: Checking ${album.title}...`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.stat === 'ok') {
                results.valid.push({
                    title: album.title,
                    albumId: albumId,
                    photoCount: data.photoset.photos,
                    flickrUrl: album.flickrUrl
                });
                console.log(`✅ ${album.title} - ${data.photoset.photos} photos`);
            } else {
                results.invalid.push({
                    title: album.title,
                    albumId: albumId,
                    error: data.message || 'Unknown error',
                    flickrUrl: album.flickrUrl
                });
                console.log(`❌ ${album.title} - ${data.message || 'Unknown error'}`);
            }
            
            // Rate limiting - wait 100ms between requests to be nice to Flickr API
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            results.errors.push({
                title: album.title,
                albumId: albumId,
                error: error.message,
                flickrUrl: album.flickrUrl
            });
            console.log(`💥 ${album.title} - Network error: ${error.message}`);
        }
    }
    
    // Summary report
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Valid albums: ${results.valid.length}`);
    console.log(`❌ Invalid albums: ${results.invalid.length}`);
    console.log(`💥 Errors: ${results.errors.length}`);
    console.log(`⏭️  Skipped albums: ${results.skipped.length}`);
    console.log(`📊 Total albums: ${ALBUM_DATA.music.length}`);
    
    // Detailed error reporting
    if (results.invalid.length > 0) {
        console.log('\n❌ INVALID ALBUMS (need fixing):');
        console.log('-'.repeat(40));
        results.invalid.forEach(album => {
            console.log(`🔴 ${album.title}`);
            console.log(`   Error: ${album.error}`);
            console.log(`   Album ID: ${album.albumId}`);
            console.log(`   URL: ${album.flickrUrl}`);
            console.log('');
        });
    }
    
    if (results.errors.length > 0) {
        console.log('\n💥 ERRORS (need fixing):');
        console.log('-'.repeat(40));
        results.errors.forEach(album => {
            console.log(`🔴 ${album.title}`);
            console.log(`   Error: ${album.error}`);
            if (album.flickrUrl) console.log(`   URL: ${album.flickrUrl}`);
            console.log('');
        });
    }
    
    // Success message
    if (results.invalid.length === 0 && results.errors.length === 0) {
        console.log('\n🎉 ALL ALBUMS VALIDATED SUCCESSFULLY!');
        console.log('✅ No issues found - your tags page should work perfectly!');
    } else {
        console.log(`\n⚠️  Found ${results.invalid.length + results.errors.length} issues that need fixing.`);
        console.log('💡 Fix these albums to ensure tags page works correctly.');
    }
    
    console.log('\n📅 Validation completed: ' + new Date().toLocaleString());
    
    return results;
}

// Helper function to extract album ID from Flickr URL
function extractAlbumId(flickrUrl) {
    if (!flickrUrl) return null;
    const match = flickrUrl.match(/albums\/(\d+)/);
    return match ? match[1] : null;
}

// Quick tags page test function
async function quickTagsTest() {
    console.log('🏷️  Quick Tags Page Test');
    console.log('This will check if the tags page loads without errors');
    
    if (window.location.pathname.includes('tags.html')) {
        console.log('✅ Already on tags page');
        console.log('👀 Check console for any "Photoset not found" errors');
        console.log('🔍 Look for messages like: "✅ Fetched ALL X photos from album Y"');
    } else {
        console.log('💡 To test tags page:');
        console.log('1. Navigate to /collections/tags.html');
        console.log('2. Watch console for loading messages');
        console.log('3. Look for any "❌" or "Photoset not found" errors');
        console.log('4. Try clicking a few tags to verify they show albums');
    }
}

// Utility function to check a specific album
async function checkSingleAlbum(albumTitle) {
    const album = ALBUM_DATA.music.find(a => a.title.includes(albumTitle));
    if (!album) {
        console.log(`❌ Album not found: ${albumTitle}`);
        return;
    }
    
    if (!album.flickrUrl) {
        console.log(`⏭️  Album has no Flickr URL: ${album.title}`);
        return;
    }
    
    const albumId = extractAlbumId(album.flickrUrl);
    const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getInfo&api_key=7d9678338d941743b7b6d33d3559cc30&photoset_id=${albumId}&format=json&nojsoncallback=1`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.stat === 'ok') {
            console.log(`✅ ${album.title} - ${data.photoset.photos} photos`);
        } else {
            console.log(`❌ ${album.title} - ${data.message}`);
        }
    } catch (error) {
        console.log(`💥 ${album.title} - ${error.message}`);
    }
}

// Load message
console.log('🚀 Album Validation Script Loaded!');
console.log('');
console.log('Available commands:');
console.log('📋 validateAllAlbumIds()     - Check all album IDs');
console.log('🏷️  quickTagsTest()          - Quick tags page test info');
console.log('🔍 checkSingleAlbum("title") - Check specific album');
console.log('');
console.log('💡 Start with: validateAllAlbumIds()');
