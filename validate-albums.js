// Album ID Validation Script
// Run this in browser console on any page to check all album IDs

async function validateAllAlbumIds() {
    console.log('🔍 Starting album ID validation...');
    
    const FLICKR_API_KEY = '7d9678338d941743b7b6d33d3559cc30'; // Your API key
    const results = {
        valid: [],
        invalid: [],
        errors: []
    };
    
    // Extract album IDs from ALBUM_DATA
    const albumsToCheck = ALBUM_DATA.music.filter(album => album.flickrUrl);
    
    console.log(`📊 Checking ${albumsToCheck.length} albums...`);
    
    for (let i = 0; i < albumsToCheck.length; i++) {
        const album = albumsToCheck[i];
        const albumId = extractAlbumId(album.flickrUrl);
        
        if (!albumId) {
            results.errors.push({
                title: album.title,
                error: 'Could not extract album ID from URL',
                flickrUrl: album.flickrUrl
            });
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
            
            // Rate limiting - wait 100ms between requests
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
    console.log('\n📋 VALIDATION SUMMARY:');
    console.log(`✅ Valid albums: ${results.valid.length}`);
    console.log(`❌ Invalid albums: ${results.invalid.length}`);
    console.log(`💥 Errors: ${results.errors.length}`);
    
    if (results.invalid.length > 0) {
        console.log('\n❌ INVALID ALBUMS:');
        results.invalid.forEach(album => {
            console.log(`- ${album.title}: ${album.error}`);
            console.log(`  Album ID: ${album.albumId}`);
            console.log(`  URL: ${album.flickrUrl}`);
        });
    }
    
    if (results.errors.length > 0) {
        console.log('\n💥 ERRORS:');
        results.errors.forEach(album => {
            console.log(`- ${album.title}: ${album.error}`);
        });
    }
    
    return results;
}

// Helper function to extract album ID (same as in main.js)
function extractAlbumId(flickrUrl) {
    if (!flickrUrl) return null;
    const match = flickrUrl.match(/albums\/(\d+)/);
    return match ? match[1] : null;
}

console.log('🚀 Album validation script loaded!');
console.log('Run: validateAllAlbumIds()');
