// Quick test for birds and winter 2025 albums
async function testSpecificAlbums() {
    const FLICKR_API_KEY = '7d9678338d941743b7b6d33d3559cc30';
    
    const albumsToTest = [
        { name: 'Birds', id: '72177720330371404' },
        { name: 'Winter 2025', id: '72177720323325987' }
    ];
    
    for (const album of albumsToTest) {
        try {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getInfo&api_key=${FLICKR_API_KEY}&photoset_id=${album.id}&format=json&nojsoncallback=1`;
            
            console.log(`Testing ${album.name} (${album.id})...`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.stat === 'ok') {
                console.log(`✅ ${album.name} - ${data.photoset.photos} photos`);
            } else {
                console.log(`❌ ${album.name} - ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`💥 ${album.name} - Network error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

console.log('🧪 Quick album test loaded!');
console.log('Run: testSpecificAlbums()');
