// ===================================
// VIEW TRACKING SYSTEM
// ===================================
const ViewTracker = {
    // Check if current user is the site owner (excluded from tracking)
    isOwner: function() {
        return localStorage.getItem('siteOwner') === 'true';
    },
    
    // Get all view counts from localStorage
    getViews: function() {
        const views = localStorage.getItem('photoViews');
        return views ? JSON.parse(views) : { albums: {}, photos: {} };
    },
    
    // Save view counts to localStorage
    saveViews: function(views) {
        localStorage.setItem('photoViews', JSON.stringify(views));
    },
    
    // Track album view
    trackAlbumView: function(albumId) {
        if (this.isOwner()) {
            console.log(`Album ${albumId} - View not tracked (site owner)`);
            return this.getAlbumViews(albumId);
        }
        const views = this.getViews();
        views.albums[albumId] = (views.albums[albumId] || 0) + 1;
        this.saveViews(views);
        return views.albums[albumId];
    },
    
    // Track photo view
    trackPhotoView: function(photoId) {
        if (this.isOwner()) {
            console.log(`Photo ${photoId} - View not tracked (site owner)`);
            return this.getPhotoViews(photoId);
        }
        const views = this.getViews();
        views.photos[photoId] = (views.photos[photoId] || 0) + 1;
        this.saveViews(views);
        return views.photos[photoId];
    },
    
    // Get album view count
    getAlbumViews: function(albumId) {
        const views = this.getViews();
        return views.albums[albumId] || 0;
    },
    
    // Get photo view count
    getPhotoViews: function(photoId) {
        const views = this.getViews();
        return views.photos[photoId] || 0;
    },
    
    // Get total views across all albums
    getTotalAlbumViews: function() {
        const views = this.getViews();
        return Object.values(views.albums).reduce((sum, count) => sum + count, 0);
    },
    
    // Get total views across all photos
    getTotalPhotoViews: function() {
        const views = this.getViews();
        return Object.values(views.photos).reduce((sum, count) => sum + count, 0);
    }
};

// ===================================
// FLICKR API CONFIGURATION
// ===================================
const FLICKR_CONFIG = {
    apiKey: '7d9678338d941743b7b6d33d3559cc30', // Your Flickr API key
    userId: '198613393@N03', // Your Flickr user ID
    // Using public feed (no API key required) or REST API (requires key)
    usePublicFeed: false // Set to false to use REST API with API key
};

// ===================================
// FLICKR API HELPER FUNCTIONS
// ===================================

// Extract album ID from Flickr URL
function extractAlbumId(flickrUrl) {
    const match = flickrUrl.match(/albums\/(\d+)/);
    return match ? match[1] : null;
}

// Fetch photos from a Flickr album using REST API
async function fetchFlickrAlbumPhotos(albumId, maxPhotos = 50) {
    if (!FLICKR_CONFIG.apiKey || FLICKR_CONFIG.apiKey === 'YOUR_FLICKR_API_KEY') {
        console.warn('Flickr API key not configured. Using fallback method.');
        return null;
    }

    const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_c,url_h,url_o,url_l&format=json&nojsoncallback=1&per_page=${maxPhotos}`;
    
    console.log('Fetching from Flickr API:', url);
    
    try {
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Detailed logging for debugging
        if (data.photoset) {
            console.log('Photoset info:', {
                id: data.photoset.id,
                total: data.photoset.total,
                pages: data.photoset.pages,
                perpage: data.photoset.perpage,
                photoCount: data.photoset.photo ? data.photoset.photo.length : 0
            });
        }
        
        if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
            const photos = data.photoset.photo.map(photo => ({
                id: photo.id,
                title: photo.title,
                thumbnail: photo.url_c || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`,
                large: photo.url_h || photo.url_l || photo.url_o || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
            }));
            console.log(`Mapped ${photos.length} photos`);
            return photos;
        } else {
            console.error('Flickr API error:', data.message || 'Unknown error');
            console.log('Trying alternative method for older album...');
            
            // Try alternative method for older albums
            return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
        }
    } catch (error) {
        console.error('Error fetching Flickr photos:', error);
        console.log('Trying alternative method for older album...');
        
        // Try alternative method for older albums
        return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
    }
}

// Alternative method for older Flickr albums
async function fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos = 50) {
    console.log('Using alternative method for album:', albumId);
    
    // Try with different extras parameters for older albums
    const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_s,url_m,url_l,url_o&format=json&nojsoncallback=1&per_page=${maxPhotos}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Alternative API Response:', data);
        
        if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
            const photos = data.photoset.photo.map(photo => ({
                id: photo.id,
                title: photo.title,
                thumbnail: photo.url_m || photo.url_s || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`,
                large: photo.url_l || photo.url_o || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
            }));
            console.log(`Alternative method mapped ${photos.length} photos`);
            return photos;
        } else {
            console.error('Alternative method also failed:', data.message || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Alternative method error:', error);
        return null;
    }
}

// Fetch user's recent photos using public feed (no API key required)
async function fetchFlickrPublicPhotos(maxPhotos = 50) {
    const url = `https://www.flickr.com/services/feeds/photos_public.gne?id=${FLICKR_CONFIG.userId}&format=json&nojsoncallback=1`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        return data.items.slice(0, maxPhotos).map(item => ({
            id: item.link.match(/\/(\d+)\//)?.[1] || '',
            title: item.title,
            thumbnail: item.media.m.replace('_m.jpg', '_c.jpg'),
            large: item.media.m.replace('_m.jpg', '_b.jpg'),
            url: item.link
        }));
    } catch (error) {
        console.error('Error fetching Flickr public feed:', error);
        return null;
    }
}

// Fetch album cover photo from Flickr API
async function fetchFlickrAlbumCover(albumId) {
    const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_c,url_b&format=json&nojsoncallback=1&per_page=1`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.stat === 'ok' && data.photoset.photo.length > 0) {
            const photo = data.photoset.photo[0];
            // Return the cover photo URL (prefer url_b for better quality)
            return photo.url_b || photo.url_c || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
        }
        return null;
    } catch (error) {
        console.error('Error fetching album cover:', error);
        return null;
    }
}

// ===================================
// LIGHTBOX FUNCTIONALITY
// ===================================
let currentLightboxIndex = 0;
let lightboxPhotos = [];

function openLightbox(photos, index) {
    lightboxPhotos = photos;
    currentLightboxIndex = index;
    showLightboxImage();
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const shareMenu = document.getElementById('lightbox-share-menu');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    if (shareMenu) {
        shareMenu.classList.remove('show');
    }
}

function showLightboxImage() {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCounter = document.getElementById('lightbox-counter');
    
    if (lightboxImg && lightboxPhotos[currentLightboxIndex]) {
        const photo = lightboxPhotos[currentLightboxIndex];
        
        // Track photo view (private - logged to console only)
        const photoViews = ViewTracker.trackPhotoView(photo.id);
        console.log(`Photo ${photo.id} viewed ${photoViews} times (private stat)`);
        
        // Track photo view in Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'photo_view', {
                'photo_id': photo.id,
                'photo_title': photo.title,
                'photo_position': currentLightboxIndex + 1
            });
        }
        
        lightboxImg.src = photo.large;
        if (lightboxCaption) {
            lightboxCaption.textContent = photo.title;
        }
        if (lightboxCounter) lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxPhotos.length}`;
    }
}

function nextLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % lightboxPhotos.length;
    showLightboxImage();
}

function prevLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    showLightboxImage();
}

function toggleLightboxShare() {
    const shareMenu = document.getElementById('lightbox-share-menu');
    if (shareMenu) {
        shareMenu.classList.toggle('show');
    }
}

function shareLightboxPhoto(platform) {
    const currentPhoto = lightboxPhotos[currentLightboxIndex];
    if (!currentPhoto) return;
    
    // Share your website's album page URL instead of Flickr
    const pageUrl = window.location.href;
    const photoUrl = pageUrl; // Share the current album page
    
    const photoTitle = currentPhoto.title || 'Photo';
    const albumTitle = document.querySelector('.page-title')?.textContent || 'Photo Album';
    
    // Debug log to help troubleshoot
    console.log('Sharing photo:', {
        platform,
        photoUrl,
        photoTitle,
        currentPhoto
    });
    
    let shareUrl = '';
    
    switch(platform) {
        case 'instagram':
            // Instagram doesn't support direct URL sharing, copy link instead
            copyToClipboard(photoUrl);
            alert('Album URL copied! You can paste it in Instagram.');
            break;
        case 'threads':
            shareUrl = `https://threads.net/intent/post?text=${encodeURIComponent(albumTitle + ' - ' + photoUrl)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}`;
            break;
        case 'pinterest':
            shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&description=${encodeURIComponent(albumTitle)}`;
            break;
        case 'copy':
            copyToClipboard(photoUrl);
            alert('Album URL copied to clipboard!');
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    // Hide share menu after sharing
    const shareMenu = document.getElementById('lightbox-share-menu');
    if (shareMenu) {
        shareMenu.classList.remove('show');
    }
}

function copyToClipboard(text) {
    // Validate that we have text to copy
    if (!text || text === 'undefined') {
        console.error('Cannot copy undefined or empty text to clipboard');
        alert('Error: No URL available to copy');
        return false;
    }
    
    console.log('Copying to clipboard:', text);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Successfully copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard');
        });
    } else {
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log('Successfully copied to clipboard (fallback)');
            } else {
                console.error('Failed to copy to clipboard (fallback)');
                alert('Failed to copy to clipboard');
            }
        } catch (err) {
            console.error('Clipboard fallback failed:', err);
            alert('Failed to copy to clipboard');
        }
    }
    
    return true;
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightboxImage();
        if (e.key === 'ArrowLeft') prevLightboxImage();
    }
});

// ===================================
// MOBILE MENU TOGGLE
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const shareDropdown = document.querySelector('.share-dropdown');
    const shareTrigger = document.querySelector('.share-trigger');
    const collectionsDropdown = document.querySelector('.collections-dropdown');
    const collectionsTrigger = document.querySelector('.collections-trigger');

    // Mobile menu toggle
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }

    // Collections dropdown toggle (mobile)
    if (collectionsTrigger && collectionsDropdown) {
        collectionsTrigger.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                collectionsDropdown.classList.toggle('active');
            }
        });
    }

    // Share dropdown toggle (mobile)
    if (shareTrigger && shareDropdown) {
        shareTrigger.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                shareDropdown.classList.toggle('active');
            }
        });
    }
});

// ===================================
// SOCIAL SHARING FUNCTIONS
// ===================================
function shareToInstagram() {
    // Try to use Web Share API first (works on mobile)
    if (navigator.share) {
        navigator.share({
            title: 'Jayne Clamp Photography',
            text: 'Check out this photography collection',
            url: window.location.href
        }).catch((error) => {
            // If share fails, copy to clipboard
            copyToClipboard();
        });
    } else {
        // Fallback: copy to clipboard
        copyToClipboard();
    }
    
    function copyToClipboard() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard! Paste it in Instagram.');
        }).catch(() => {
            // If clipboard fails, show the URL
            prompt('Copy this link to share on Instagram:', window.location.href);
        });
    }
}

function shareToThreads() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out Jayne Clamp Photography');
    window.open(`https://threads.net/intent/post?text=${text}%20${url}`, '_blank', 'width=600,height=400');
}

function shareToFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareToPinterest() {
    const url = encodeURIComponent(window.location.href);
    const description = encodeURIComponent('Check out Jayne Clamp Photography');
    window.open(`https://pinterest.com/pin/create/button/?url=${url}&description=${description}`, '_blank', 'width=600,height=400');
}

function shareToBluesky() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out Jayne Clamp Photography');
    window.open(`https://bsky.app/intent/compose?text=${text}%20${url}`, '_blank', 'width=600,height=400');
}

// ===================================
// MANUAL ALBUM CONFIGURATION (NO API NEEDED!)
// ===================================
// Simply add your Flickr album URLs and info here
const ALBUM_DATA = {
    music: [
        // Add your music albums here - example format:
        // { title: 'Concert Name', photoCount: 24, flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/ALBUM_ID' }
        { 
            title: '2025-11-11 Jerry Joseph & the Jackmormons @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330299990/',
            coverUrl: 'https://live.staticflickr.com/65535/54922647191_6b0fe32e37_b.jpg',
            albumPage: '../music/2025-11-11-jerry-joseph-jackmormons-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2025-11-02 Paul McCartney @ State Farm Arena | Atlanta, GA <i class="fas fa-video"></i>', 
            photoCount: 15, 
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/BTMsMZICnNQ/oar2.jpg?sqp=-oaymwEoCJUDENAFSFqQAgHyq4qpAxcIARUAAIhC2AEB4gEKCBgQAhgGOAFAAQ==&rs=AOn4CLCd17tCVjHmnICrdwhh_aNE1TIFZw',
            albumPage: '../music/2025-11-02-paul-mccartney-state-farm-arena-videos.html'
        },
        { 
            title: '2025-10-19 Porchfest @ Athens, GA', 
            photoCount: 12, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/',
            coverUrl: 'https://live.staticflickr.com/65535/54876264980_887cfb1a8e_b.jpg',
            albumPage: '../music/2025-10-19-porchfest-athens-ga.html'
        },
        { 
            title: '2025-09-21 Vincas @ Hendershots | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'https://live.staticflickr.com/65535/54876776442_e83e6eea26_b.jpg',
            albumPage: '../music/2025-09-21-vincas-hendershots-athens-ga.html'
        }, 
        { 
            title: '2025-09-12 The Minus 5 & The Baseball Project @ 40 Watt | Athens, GA', 
            photoCount: 18, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329875831/',
            coverUrl: 'https://live.staticflickr.com/65535/54876815267_699a46d880_b.jpg',
            albumPage: '../music/2025-09-12-the-minus-5-the-baseball-project-40-watt-athens-ga.html'
        },
        { 
            title: '2025-09-07 Kevn Kinney & Peter Buck w Mike Mills @ Rialto Room | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329937140/',
            coverUrl: 'https://live.staticflickr.com/65535/54884771341_77e9aab1de_b.jpg',
            albumPage: '../music/2025-09-07-kevn-kinney-peter-buck-w-mike-mills-rialto-room-athens-ga.html'
        },
        { 
            title: '2025-09-06 James McMurtry @ 40 Watt | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329884840/',
            coverUrl: 'https://live.staticflickr.com/65535/54879107350_abf530c13c_b.jpg',
            albumPage: '../music/2025-09-06-james-mcmurtry-40-watt-athens-ga.html'
        }, 
        { 
            title: '2025-09-06 Bonnie Whitmore @ 40 Watt | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329939306/',
            coverUrl: 'https://live.staticflickr.com/65535/54879063564_ddbc9002e1_b.jpg',
            albumPage: '../music/2025-09-06-bonnie-whitmore-40-watt-athens-ga.html'
        }, 
        { 
            title: '2025-08-30 Sam Holt Band @ Live Wire | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329945912/',
            coverUrl: 'https://live.staticflickr.com/65535/54884859086_7ab1e2877e_b.jpg',
            albumPage: '../music/2025-08-30-sam-holt-band-remembering-mikey-todd-live-wire-athens-ga.html'
        },
        { 
            title: '2025-05-31 Vincas @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329969689/',
            coverUrl: 'https://live.staticflickr.com/65535/54885354709_e2e51bf9a2_b.jpg',
            albumPage: '../music/2025-05-31-vincas-nowhere-bar-athens-ga.html'
        },
         { 
            title: '2025-05-31 Johnny Falloon @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329948432/',
            coverUrl: 'https://live.staticflickr.com/65535/54885173011_ee959a91b3_b.jpg',
            albumPage: '../music/2025-05-31-johnny-falloon-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2025-05-31 Rauncher @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/54885443589/in/datetaken-public/',
            coverUrl: 'https://live.staticflickr.com/65535/54885443589_d64f40f294_b.jpg'
        },
        { 
            title: '2025-02-27 Michael Shannon, Jason Narducy & Friends REM Tribute @ 40 Watt | Athens, GA', 
            photoCount: 22, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205246/',
            coverUrl: 'https://live.staticflickr.com/65535/54364740380_9d40dc998f_b.jpg',
            albumPage: '../music/2025-02-27-michael-shannon-jason-narducy-friends-rem-tribute-40-watt-athens-ga.html',
            filterNames: ['Michael Shannon', 'Jason Narducy', 'REM']
        },
        { 
            title: '2025-02-27 Kevn Kinney, Lenny Hayes, Peter Buck, Mike Mills @ Rialto Room | Athens, GA', 
            photoCount: 3, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205156/',
            coverUrl: 'https://live.staticflickr.com/65535/54363461472_0b17468aa4_b.jpg',
            albumPage: '../music/2025-02-27-kevn-kinney-lenny-hayes-peter-buck-mike-mills-rialto-room-athens-ga.html'
        },
        { 
            title: '2025-02-17 Classic City Wrestling w Drive-By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324198785/',
            coverUrl: 'https://live.staticflickr.com/65535/54364287441_e8189d542b_b.jpg',
            albumPage: '../music/2025-02-17-classic-city-wrestling-w-drive-by-truckers-athens-ga.html'
        }, 
        { 
            title: '2025-02-15 Drive-By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 18, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324235638/',
            coverUrl: 'https://live.staticflickr.com/65535/54364787855_2bc9e4e3dc_b.jpg',
            albumPage: '../music/2025-02-15-drive-by-truckers-40-watt-homecoming-athens-ga.html'
        },
        { 
            title: '2024-10-11 Kimberly Morgan York @ Terrapin Beer Co. | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329963911/',
            coverUrl: 'https://live.staticflickr.com/65535/54065829880_14e5ba296a_b.jpg',
            albumPage: '../music/2024-10-11-kimberly-morgan-york-terrapin-beer-co-athens-ga.html'
        }, 
        { 
            title: '2024-10-10 Doug Emhoff Event with Michael Stipe @ 1055 Barber | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321198241/',
            coverUrl: 'https://live.staticflickr.com/65535/54067165798_b819722fc9_b.jpg',
            albumPage: '../music/2024-10-10-doug-emhoff-event-with-michael-stipe-athens-ga.html'
        }, 
        { 
            title: '2024-09-30 David Barbe @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321185275/',
            coverUrl: 'https://live.staticflickr.com/65535/54065843540_822872b94c_b.jpg',
            albumPage: '../music/2024-09-30-david-barbe-bday-show-flicker-athens-ga.html'
        }, 
        { 
            title: '2024-04-26 Five Eight @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330251330/',
            albumPage: '../music/2024-04-26-five-eight-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2024-04-04 Alejandro Escovedo @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330247733/',
            albumPage: '../music/2024-04-04-alejandro-escovedo-40-watt-athens-ga.html'
        },
        { 
            title: '2024-03-01 Lona @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330247523/',
            albumPage: '../music/2024-03-01-lona-40-watt-athens-ga.html'
        },
        { 
            title: '2024-02-15 Drive-By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330343237/',
            albumPage: '../music/2024-02-15-drive-by-truckers-40-watt-athens-ga.html'
        },
        { 
            title: '2024-01-26 Bit Brigade @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329982768/with/54887654154',
            coverUrl: 'https://live.staticflickr.com/65535/54887654154_1a2bbe03b2_b.jpg',
            albumPage: '../music/2024-01-26-bit-brigade-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2024-01-26 Lazer/Wulf @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330282554/',
            albumPage: '../music/2024-01-26-lazer-wulf-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2023-11-24 Taxicab Verses @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330192738/',
            albumPage: '../music/2023-11-24-taxicab-verses-flicker-athens-ga.html'
        },
        { 
            title: '2023-11-24 Jacob Morris @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330193693/',
            albumPage: '../music/2023-11-24-jacob-morris-flicker-athens-ga.html'
        },
        { 
            title: '2023-11-04 Jerry Joseph & the Jackmormons @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329992639/', 
            coverUrl: 'https://live.staticflickr.com/65535/54887676938_5139120bee_b.jpg',
            albumPage: '../music/2023-11-04-jerry-joseph-the-jackmormons-40-watt-athens-ga.html'
        },
        { 
            title: '2023-10-07 Baba Commandant & the Mandingo Band @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329968407/', 
            coverUrl: 'https://live.staticflickr.com/65535/54887240071_f8ff887ce5_b.jpg',
            albumPage: '../music/2023-10-07-baba-commandant-the-mandingo-band-40-watt-athens-ga.html'
        },
        { 
            title: '2023-09-30 David Barbe @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329958795/with/54887353605/',
            coverUrl: 'https://live.staticflickr.com/65535/54887353605_67e82e3d0c_b.jpg',
            albumPage: '../music/2023-09-30-david-barbe-60th-bday-40-watt-athens-ga.html'
        },
        { 
            title: '2023-09-30 Pilgrim @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330357813/',
            albumPage: '../music/2023-09-30-pilgrim-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2023-09-10 Jackmormons @ Heist Brewery | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330324995/',
            albumPage: '../music/2023-09-10-jackmormons-heist-brewery-athens-ga.html'
        },
        { 
            title: '2023-08-26 Telemarket @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330342632/',
            albumPage: '../music/2023-08-26-telemarket-40-watt-athens-ga.html'
        },
        { 
            title: '2023-08-12 Drug Ducks @ Nowhere | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330172460/',
            albumPage: '../music/2023-08-12-drug-ducks-nowhere-athens-ga.html'
        },
        { 
            title: '2023-06-24 Lona @ AthFest | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330330794/',
            albumPage: '../music/2023-06-24-lona-athfest-athens-ga.html'
        },
        { 
            title: '2023-03-25 Eyelids @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330204479/',
            albumPage: '../music/2023-03-25-eyelids-flicker-athens-ga.html'
        },
        { 
            title: '2023-03-25 Elf Power @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330258537/',
            albumPage: '../music/2023-03-25-elf-power-flicker-athens-ga.html'
        },
        { 
            title: '2023-02-10 Shotgun Shells: A Celebration of Todd McBride @ 40 Watt & Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330208208/',
            albumPage: '../music/2023-02-10-shotgun-shells-celebration-todd-mcbride-athens-ga.html'
        },
        { 
            title: '2023-03-10 Kimberly Morgan York @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329963911/',
            coverUrl: 'https://live.staticflickr.com/65535/54886514342_342d0e0b2b_b.jpg',
            albumPage: '../music/2023-03-10-kimberly-morgan-york-40-watt-athens-ga.html'
        },
        { 
            title: '2022-12-13 Supernova Rainbow of Fun @ Nuci\'s Space', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330172345/',
            albumPage: '../music/2022-12-13-supernova-rainbow-of-fun-nucis-space.html'
        },
        { 
            title: '2022-11-27 Bloodkin @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330219624/',
            albumPage: '../music/2022-11-27-bloodkin-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2022-10-02 Hunter Morris @ Porchfest | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330346052/',
            albumPage: '../music/2022-10-02-hunter-morris-porchfest-athens-ga.html'
        },
        { 
            title: '2022-09-15 Brown Dwarf @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330252736/',
            albumPage: '../music/2022-09-15-brown-dwarf-40-watt-athens-ga.html'
        },
        { 
            title: '2022-09-02 Infinite Favors @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330369904/',
            albumPage: '../music/2022-09-02-infinite-favors-40-watt-athens-ga.html'
        },
        { 
            title: '2022-07-22 Kimberly Morgan York @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329941170/with/54885463099',
            coverUrl: 'https://live.staticflickr.com/65535/54884346352_08513c42a3_b.jpg',
            albumPage: '../music/2022-07-22-kimberly-morgan-york-40-watt-athens-ga.html'
        },
        { 
            title: '2022-06-26 Kevn Kinney Band @ AthFest | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330258602/',
            albumPage: '../music/2022-06-26-kevn-kinney-band-athfest-athens-ga.html'
        },
        { 
            title: '2022-04-10 Patterson Hood, Claire Campbell & Jay Gonzalez @ Creature Comforts | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329983203/',
            coverUrl: 'https://live.staticflickr.com/65535/54887666343_32bb0a8754_b.jpg',
            albumPage: '../music/2022-04-10-patterson-hood-claire-campbell-jay-gonzalez-creature-comforts-athens-ga.html'
        },
        { 
            title: '2019-12-31 Five Eight @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330193758/',
            albumPage: '../music/2019-12-31-five-eight-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-10-21 Steel Pulse @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329982229/',
            coverUrl: 'https://live.staticflickr.com/65535/54886596559_161315c87d_b.jpg',
            albumPage: '../music/2019-10-21-steel-pulse-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2019-09-12 Bloodkin @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330330327/',
            albumPage: '../music/2019-09-12-bloodkin-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-03-30 Hayride @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330305987/',
            albumPage: '../music/2019-03-30-hayride-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-03-22 The Rock*A*Teens @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330338565/',
            albumPage: '../music/2019-03-22-rock-a-teens-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-02-01 David Barbe & the Quick Hooks | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330358648/',
            albumPage: '../music/2019-02-01-david-barbe-quick-hooks-athens-ga.html'
        },
        { 
            title: '2018-12-29 Lona @ Caledonia | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330229651/',
            albumPage: '../music/2018-12-29-lona-caledonia-athens-ga.html'
        },
        { 
            title: '2018-11-08 Robyn Hitchcock @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330345098/',
            albumPage: '../music/2018-11-08-robyn-hitchcock-40-watt-athens-ga.html'
        },
        { 
            title: '2018-10-31 Jerry Joseph & the Jackmormons @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330228355/',
            albumPage: '../music/2018-10-31-jerry-joseph-jackmormons-athens-ga.html'
        },
        { 
            title: '2018-07-14 Cinemechanica @ Caledonia | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330324630/',
            albumPage: '../music/2018-07-14-cinemechanica-caledonia-athens-ga.html'
        },
        { 
            title: '2018-06-04 Daniel Hutchens & David Barbe @ Georgia Theatre Rooftop | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330320628/',
            albumPage: '../music/2018-06-04-daniel-hutchens-david-barbe-georgia-theatre-rooftop-athens-ga.html'
        },
        { 
            title: '2017-12-14 5000 @ Caledonia | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330204669/',
            albumPage: '../music/2017-12-14-5000-caledonia-athens-ga.html'
        },
        { 
            title: '2011-06-02 Jerry Joseph, Bloodkin & Todd Nance @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72157626752915571/',
            coverUrl: 'https://live.staticflickr.com/2567/5794530220_411f84cb92_b.jpg',
            albumPage: '../music/2011-06-02-jerry-joseph-bloodkin-todd-nance-40-watt-athens-ga.html'
        },
    ],
    events: [
         { 
            title: '2025-10-25 Wild Rumpus @ Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329935603/with/54882711328',
            coverUrl: 'https://live.staticflickr.com/65535/54882711328_8efe955dea_b.jpg',
            albumPage: '../events/2025-10-25-wild-rumpus-athens-ga.html'
        }, 
        { 
            title: '2025-10-18 No Kings @ Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329866562/',
            coverUrl: 'https://live.staticflickr.com/65535/54875117537_93e96d972a_b.jpg',
            albumPage: '../events/2025-10-18-no-kings-athens-ga.html'
        },  
        { 
            title: '2025-06-14 No Kings @ Downtown Athens', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329940176/with/54885224370/',
            coverUrl: 'https://live.staticflickr.com/65535/54885223885_8a11e33546_b.jpg',
            albumPage: '../events/2025-06-14-no-kings-downtown-athens.html'
        },  
        { 
            title: '2024-10-26 Wild Rumpus @ Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321549494/',
            coverUrl: 'https://live.staticflickr.com/65535/54098561188_ce988963fc_b.jpg',
            albumPage: '../events/2024-10-26-wild-rumpus-athens-ga.html'
        },
        { 
            title: '2022-10-14 UGA Homecoming Parade | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330192248/',
            albumPage: '../events/2022-10-14-uga-homecoming-parade-athens-ga.html'
        },
        { 
            title: '2022-09-17 UCW Labor Rally w Stacey Abrams @ Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329962161/with/54887201501',
            coverUrl: 'https://live.staticflickr.com/65535/54886322487_2b2240f709_b.jpg',
            albumPage: '../events/2022-09-17-ucw-labor-rally-w-stacey-abrams-athens-ga.html'
        },
        { 
            title: '2022-06-12 Pride Parade @ Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329972373/',
            coverUrl: 'https://live.staticflickr.com/65535/54886560369_27df1d1567_b.jpg',
            albumPage: '../events/2022-06-12-pride-parade-athens-ga.html'
        },
        { 
            title: '2021-10-31 Wild Rumpus Halloween | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329961440/',
            coverUrl: 'https://live.staticflickr.com/65535/54886500317_39f45f57ac_b.jpg',
            albumPage: '../events/2021-10-31-wild-rumpus-halloween-athens-ga.html'
        },
        { 
            title: '2020-11-13 Jon Ossoff Senate Runoff Rally | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330345548/',
            albumPage: '../events/2020-11-13-jon-ossoff-senate-runoff-rally-athens-ga.html'
        },
        { 
            title: '2020-06-06 Black Lives Matter Protest | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329970212/with/54887726905',
            coverUrl: 'https://live.staticflickr.com/65535/54887679959_4cc6bae0aa_b.jpg',
            albumPage: '../events/2020-06-06-black-lives-matter-protest-athens-ga.html'
        },
        { 
            title: '2018-03-24 March for Our Lives Rally | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330192343/',
            albumPage: '../events/2018-03-24-march-for-our-lives-rally-athens-ga.html'
        }

    ],
    travel: [
        // Add your travel albums here
    ],
    birds: [
        { 
            title: 'Birds', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330371404/',
            displayDirectly: true
        }
    ],
    landscapes: [
        // Add your landscape albums here
         { 
            title: 'Winter 2025 | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720323325987/',
            coverUrl: 'https://live.staticflickr.com/65535/54279614662_ccb9db86a6_b.jpg',
            albumPage: '../landscapes/2025-winter-athens-ga.html'
        }, 
    ],
    pets: [
        // Add your pet photography albums here
    ]
};

// ===================================
// DISPLAY ALBUM PHOTOS IN GRID (NEW - WITH FLICKR API)
// ===================================
// Store current album photos globally for lightbox access
let currentAlbumPhotos = [];

// Helper function to find album data by URL
function findAlbumByUrl(albumUrl) {
    for (const collection of Object.values(ALBUM_DATA)) {
        const album = collection.find(album => album.flickrUrl === albumUrl);
        if (album) return album;
    }
    return null;
}

async function displayAlbumPhotos(albumUrl) {
    const photosGrid = document.getElementById('photos-grid');
    const loading = document.getElementById('loading');
    
    if (!photosGrid) {
        console.error('photos-grid element not found');
        return;
    }
    
    // Show loading
    if (loading) loading.style.display = 'block';
    photosGrid.innerHTML = '';
    
    // Extract album ID from URL
    const albumId = extractAlbumId(albumUrl);
    
    if (!albumId) {
        photosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Invalid album URL</p>';
        if (loading) loading.style.display = 'none';
        console.error('Could not extract album ID from URL:', albumUrl);
        return;
    }
    
    console.log('Fetching photos for album ID:', albumId);
    
    // Check if this album has manual photos defined (for legacy albums with API issues)
    const albumData = findAlbumByUrl(albumUrl);
    if (albumData && albumData.manualPhotos) {
        console.log('Using manual photo list for album:', albumId);
        const photos = albumData.manualPhotos.map(photo => ({
            id: photo.id,
            title: photo.title,
            thumbnail: `https://live.staticflickr.com/2567/${photo.id}_411f84cb92_c.jpg`,
            large: `https://live.staticflickr.com/2567/${photo.id}_411f84cb92_b.jpg`,
            url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
        }));
        
        // Hide loading
        if (loading) loading.style.display = 'none';
        
        // Update page subtitle with photo count
        const subtitle = document.querySelector('.page-subtitle');
        if (subtitle) {
            subtitle.textContent = `${photos.length} photos`;
        }
        
        // Store photos globally for lightbox
        currentAlbumPhotos = photos;
        
        // Display photos in grid
        photosGrid.innerHTML = photos.map((photo, index) => `
            <div class="photo-card" onclick="openAlbumLightbox(${index})">
                <img src="${photo.thumbnail}" alt="${photo.title}" loading="lazy">
                <div class="photo-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
        `).join('');
        
        console.log(`Successfully loaded ${photos.length} manual photos`);
        return;
    }
    
    // Track album view (private - logged to console only)
    const viewCount = ViewTracker.trackAlbumView(albumId);
    console.log(`Album ${albumId} viewed ${viewCount} times (private stat)`);
    
    // Track album view in Google Analytics
    if (typeof gtag !== 'undefined') {
        const albumTitle = document.querySelector('.page-title')?.textContent || 'Unknown Album';
        gtag('event', 'album_view', {
            'album_id': albumId,
            'album_title': albumTitle
        });
    }
    
    // Fetch photos from Flickr
    const photos = await fetchFlickrAlbumPhotos(albumId);
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    // Update page subtitle with photo count (public)
    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle && photos) {
        subtitle.textContent = `${photos.length} photos`;
    }
    
    if (!photos || photos.length === 0) {
        photosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">Unable to load photos</p>
                <p style="font-size: 0.95rem;">Check the browser console for errors</p>
                <a href="${albumUrl}" target="_blank" style="color: #fff; text-decoration: underline; margin-top: 1rem; display: inline-block;">View album on Flickr</a>
            </div>
        `;
        console.error('No photos returned from Flickr API');
        return;
    }
    
    console.log(`Successfully loaded ${photos.length} photos`);
    
    // Store photos globally for lightbox
    currentAlbumPhotos = photos;
    
    // Display photos in grid
    photosGrid.innerHTML = photos.map((photo, index) => `
        <div class="photo-card" onclick="openAlbumLightbox(${index})">
            <img src="${photo.thumbnail}" alt="${photo.title}" loading="lazy">
            <div class="photo-overlay">
                <i class="fas fa-search-plus"></i>
            </div>
        </div>
    `).join('');
}

// Helper function to open lightbox with current album photos
function openAlbumLightbox(index) {
    openLightbox(currentAlbumPhotos, index);
}

// Display albums from manual configuration
function displayAlbums(collectionType, filterYear = 'all', filterBand = 'all', filterVenue = 'all') {
    const albumsGrid = document.getElementById('albums-grid');
    const loading = document.getElementById('loading');
    
    if (!albumsGrid) return;

    // Get albums for this collection
    let albums = ALBUM_DATA[collectionType] || [];

    // Filter by year if specified
    if (filterYear !== 'all') {
        albums = albums.filter(album => album.title.startsWith(filterYear));
    }

    // Filter by band if specified
    if (filterBand !== 'all') {
        albums = albums.filter(album => {
            // Extract band name from title (format: "YYYY-MM-DD Band Name @ Venue" or "YYYY-MM-DD ... | Venue")
            const match = album.title.match(/\d{4}-\d{2}-\d{2}\s+(.+?)\s+(?:@|\|)/);
            if (!match) return false;
            
            let artistSection = match[1].trim();
            
            // Special handling: if title contains "Event with", extract artists after "with"
            const withMatch = artistSection.match(/\bwith\s+(.+)$/i);
            if (withMatch && artistSection.toLowerCase().includes('event')) {
                artistSection = withMatch[1].trim();
            }
            
            return artistSection.toLowerCase().includes(filterBand.toLowerCase());
        });
    }

    // Filter by venue if specified
    if (filterVenue !== 'all') {
        albums = albums.filter(album => {
            // Extract venue from title (format: "YYYY-MM-DD Band Name @ Venue" or "YYYY-MM-DD ... | Venue")
            const atMatch = album.title.match(/\s+@\s+(.+?)(?:\s*\|\s*|$)/);
            const pipeMatch = album.title.match(/\s+\|\s+(.+?)$/);
            
            let venue = '';
            if (atMatch) {
                venue = atMatch[1].trim();
            } else if (pipeMatch) {
                venue = pipeMatch[1].trim();
            }
            
            // Special handling for Porchfest events
            if (album.title.toLowerCase().includes('porchfest') && filterVenue.toLowerCase() === 'porchfest') {
                return true;
            }
            
            // Check if the selected venue matches any of the venues in this album
            // Handle combined venues like "40 Watt & Nowhere Bar"
            const individualVenues = venue.split(/\s*&\s+/);
            return individualVenues.some(individualVenue => 
                individualVenue.toLowerCase().includes(filterVenue.toLowerCase())
            );
        });
    }

    // Hide loading
    if (loading) loading.style.display = 'none';

    // If no albums configured yet, show helpful message
    if (albums.length === 0) {
        albumsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">No albums found</p>
                <p style="font-size: 0.95rem;">${filterYear === 'all' ? 'Add your Flickr album links in js/main.js' : 'No albums for ' + filterYear}</p>
            </div>
        `;
        return;
    }

    // Display albums
    albumsGrid.innerHTML = albums.map((album, index) => {
        const albumId = `album-${collectionType}-${index}`;
        
        // If no coverUrl, fetch from Flickr API
        if (!album.coverUrl && album.flickrUrl) {
            const flickrAlbumId = extractAlbumId(album.flickrUrl);
            if (flickrAlbumId) {
                fetchFlickrAlbumCover(flickrAlbumId).then(coverUrl => {
                    const imgElement = document.querySelector(`#${albumId} img`);
                    if (imgElement && coverUrl) {
                        imgElement.src = coverUrl;
                    }
                });
            }
        }
        
        return `
            <a href="${album.albumPage || album.flickrUrl}" 
               ${album.albumPage ? '' : 'target="_blank" rel="noopener"'} 
               class="album-card" 
               id="${albumId}"
               onclick="if(typeof gtag !== 'undefined') { gtag('event', 'album_card_click', { 'album_title': '${album.title.replace(/<[^>]*>/g, '').replace(/'/g, "\\'")}', 'collection': '${collectionType}' }); }">
                <div class="album-image">
                    <img src="${album.coverUrl || 'https://via.placeholder.com/800x600/333333/FFFFFF?text=Loading...'}" 
                         alt="${album.title}" 
                         loading="lazy"
                         style="${album.title.includes('Rauncher') ? 'object-position: top;' : ''}"
                         onerror="this.src='https://via.placeholder.com/800x600/000000/FFFFFF?text=${encodeURIComponent(album.title)}'">
                    <div class="album-overlay">
                        <h3>${album.title}</h3>
                        <p class="album-info">${album.photoCount || '?'} photos</p>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

// ===================================
// COLLECTION INITIALIZATION
// ===================================

// Initialize collections when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js loaded successfully - Version 20251116-1710');
    console.log('Current pathname:', window.location.pathname);
    
    // Initialize collections if on a collection page
    if (window.location.pathname.includes('/collections/')) {
        const collectionType = getCollectionTypeFromPath();
        console.log('Collection type detected:', collectionType);
        console.log('ALBUM_DATA available:', !!ALBUM_DATA);
        console.log('Collection data available:', collectionType && ALBUM_DATA[collectionType] ? ALBUM_DATA[collectionType].length : 'No data');
        
        if (collectionType && ALBUM_DATA[collectionType]) {
            console.log('Calling displayAlbums for:', collectionType);
            displayAlbums(collectionType);
            initializeFilters(collectionType);
        } else {
            console.error('Collection type or data not found:', collectionType, ALBUM_DATA);
        }
    }
    
    // Initialize album photos if on an album page
    if (window.location.pathname.includes('/music/') || 
        window.location.pathname.includes('/events/') || 
        window.location.pathname.includes('/landscapes/')) {
        
        // Get the album URL from the page's data attribute or construct it
        const albumUrl = getAlbumUrlFromPage();
        if (albumUrl) {
            displayAlbumPhotos(albumUrl);
        }
    }
});

// Get collection type from current path
function getCollectionTypeFromPath() {
    const path = window.location.pathname;
    console.log('Checking path for collection type:', path);
    
    // Handle both /collections/music and music.html formats
    if (path.includes('music.html') || path.includes('/music')) return 'music';
    if (path.includes('events.html') || path.includes('/events')) return 'events';
    if (path.includes('travel.html') || path.includes('/travel')) return 'travel';
    if (path.includes('birds.html') || path.includes('/birds')) return 'birds';
    if (path.includes('landscapes.html') || path.includes('/landscapes')) return 'landscapes';
    if (path.includes('pets.html') || path.includes('/pets')) return 'pets';
    
    console.log('No collection type matched for path:', path);
    return null;
}

// Initialize filters for collection pages
function initializeFilters(collectionType) {
    // Initialize band filter for music collection
    if (collectionType === 'music') {
        const bandFilter = document.getElementById('band-filter');
        if (bandFilter && ALBUM_DATA.music) {
            // Clear existing options except "All Bands"
            bandFilter.innerHTML = '<option value="all">All Bands</option>';
            
            // Extract unique artists from album titles
            const artists = new Set();
            ALBUM_DATA.music.forEach(album => {
                // Extract artist section (everything before @ or |)
                let artistSection;
                if (album.title.includes('@')) {
                    artistSection = album.title.split('@')[0].trim();
                } else if (album.title.includes('|')) {
                    artistSection = album.title.split('|')[0].trim();
                } else {
                    artistSection = album.title.trim();
                }
                
                // Remove date prefix (YYYY-MM-DD format)
                artistSection = artistSection.replace(/^\d{4}-\d{2}-\d{2}\s+/, '');
                
                // Handle "w/" format - extract the part after "w/"
                const withMatch = artistSection.match(/w\/\s*(.+)/);
                if (withMatch && artistSection.toLowerCase().includes('event')) {
                    artistSection = withMatch[1].trim();
                }
                
                // Band names that contain & but should NOT be split
                const doNotSplitBands = [
                    'Baba Commandant & the Mandingo Band'
                ];
                
                // Check if this is a band name that should not be split
                const isDoNotSplit = doNotSplitBands.some(band => 
                    artistSection.toLowerCase().includes(band.toLowerCase())
                );
                
                let individualArtists;
                if (isDoNotSplit) {
                    // Don't split, treat as single artist
                    individualArtists = [artistSection];
                } else {
                    // Split by common separators: &, w/, w (standalone), with, ,
                    individualArtists = artistSection.split(/\s*(?:&|w\/|\bw\b|with|,)\s+/);
                }
                
                individualArtists.forEach(artist => {
                    let cleanArtist = artist.trim();
                    
                    // Ignore "friends" and "Event" - don't create filters for them
                    if (cleanArtist.toLowerCase() === 'friends' || 
                        cleanArtist.toLowerCase() === 'event') {
                        return;
                    }
                    
                    // Capitalize "the" at the start
                    if (cleanArtist.toLowerCase().startsWith('the ')) {
                        cleanArtist = 'The' + cleanArtist.substring(3);
                    }
                    
                    // Normalize specific band names
                    if (cleanArtist.toLowerCase() === 'drive by truckers') {
                        cleanArtist = 'Drive-By Truckers';
                    }
                    
                    artists.add(cleanArtist);
                });
            });
            
            // Sort artists alphabetically, treating "The" as a suffix for sorting
            const sortedArtists = Array.from(artists).sort((a, b) => {
                const getSortName = (artist) => {
                    if (artist.startsWith('The ')) {
                        return artist.substring(4) + ', The';
                    }
                    return artist;
                };
                return getSortName(a).localeCompare(getSortName(b));
            });
            
            // Add options to dropdown
            sortedArtists.forEach(artist => {
                const option = document.createElement('option');
                option.value = artist;
                option.textContent = artist;
                bandFilter.appendChild(option);
            });
            
            // Add band filter event listener
            bandFilter.addEventListener('change', function() {
                const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
                const venueFilter = document.getElementById('venue-filter');
                const selectedVenue = venueFilter ? venueFilter.value : 'all';
                displayAlbums(collectionType, selectedYear, this.value, selectedVenue);
            });
        }

        // Initialize venue filter for music collection
        const venueFilter = document.getElementById('venue-filter');
        if (venueFilter && ALBUM_DATA.music) {
            // Clear existing options except "All Venues"
            venueFilter.innerHTML = '<option value="all">All Venues</option>';
            
            // Extract unique venues from album titles
            const venues = new Set();
            ALBUM_DATA.music.forEach(album => {
                // Extract venue from title (format: "YYYY-MM-DD Band Name @ Venue" or "YYYY-MM-DD ... | Venue")
                const atMatch = album.title.match(/\s+@\s+(.+?)(?:\s*\|\s*|$)/);
                const pipeMatch = album.title.match(/\s+\|\s+(.+?)$/);
                
                let venue = '';
                if (atMatch) {
                    venue = atMatch[1].trim();
                } else if (pipeMatch) {
                    venue = pipeMatch[1].trim();
                }
                
                if (venue) {
                    // Special handling for Porchfest events
                    if (album.title.toLowerCase().includes('porchfest')) {
                        venues.add('Porchfest');
                    } else {
                        // Split venues that are combined with & (e.g., "40 Watt & Nowhere Bar")
                        const individualVenues = venue.split(/\s*&\s+/);
                        individualVenues.forEach(individualVenue => {
                            venues.add(individualVenue.trim());
                        });
                    }
                }
            });
            
            // Sort venues alphabetically
            const sortedVenues = Array.from(venues).sort();
            
            // Add options to dropdown
            sortedVenues.forEach(venue => {
                const option = document.createElement('option');
                option.value = venue;
                option.textContent = venue;
                venueFilter.appendChild(option);
            });
            
            // Add venue filter event listener
            venueFilter.addEventListener('change', function() {
                const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
                const bandFilter = document.getElementById('band-filter');
                const selectedBand = bandFilter ? bandFilter.value : 'all';
                displayAlbums(collectionType, selectedYear, selectedBand, this.value);
            });
        }
    }
    
    // Add year tab filtering
    const yearTabs = document.querySelectorAll('.year-tab');
    yearTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            yearTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            // Filter albums by year and current band/venue selection
            const year = this.dataset.year;
            const bandFilter = document.getElementById('band-filter');
            const venueFilter = document.getElementById('venue-filter');
            const selectedBand = bandFilter ? bandFilter.value : 'all';
            const selectedVenue = venueFilter ? venueFilter.value : 'all';
            displayAlbums(collectionType, year, selectedBand, selectedVenue);
        });
    });
}

// ===================================
// CONTACT FORM HANDLING
// ===================================
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formMessage = document.getElementById('form-message');
        const submitButton = contactForm.querySelector('.submit-button');
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        // Simulate form submission (replace with actual backend endpoint)
        setTimeout(() => {
            formMessage.textContent = 'Thank you for your message! I\'ll get back to you soon.';
            formMessage.className = 'form-message success';
            formMessage.style.display = 'block';
            
            // Reset form
            contactForm.reset();
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';

            // Hide message after 5 seconds
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }, 1000);

        // In production, replace the above with actual form submission:
        /*
        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            formMessage.textContent = 'Thank you for your message! I\'ll get back to you soon.';
            formMessage.className = 'form-message success';
            formMessage.style.display = 'block';
            contactForm.reset();
        })
        .catch(error => {
            formMessage.textContent = 'Sorry, there was an error sending your message. Please try again.';
            formMessage.className = 'form-message error';
            formMessage.style.display = 'block';
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        });
        */
    });
}

// ===================================
// VIEW STATS - Console Helper
// ===================================
// Type viewStats() in browser console to see all view statistics
window.viewStats = function() {
    const views = ViewTracker.getViews();
    const isOwner = ViewTracker.isOwner();
    console.log('=== VIEW STATISTICS ===');
    console.log(`Owner Mode: ${isOwner ? '✓ ENABLED (your views not tracked)' : '✗ DISABLED'}`);
    console.log(`Total Album Views: ${ViewTracker.getTotalAlbumViews()}`);
    console.log(`Total Photo Views: ${ViewTracker.getTotalPhotoViews()}`);
    console.log('\n--- Album Views ---');
    Object.entries(views.albums).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
        console.log(`Album ${id}: ${count} views`);
    });
    console.log('\n--- Top 10 Photos ---');
    Object.entries(views.photos).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([id, count]) => {
        console.log(`Photo ${id}: ${count} views`);
    });
    console.log('\n--- Commands ---');
    console.log('enableOwnerMode() - Exclude your views from tracking');
    console.log('disableOwnerMode() - Include your views in tracking');
    console.log('localStorage.removeItem("photoViews") - Clear all stats');
    return views;
};

// Enable owner mode (exclude your views)
window.enableOwnerMode = function() {
    localStorage.setItem('siteOwner', 'true');
    console.log('✓ Owner mode ENABLED - Your views will not be tracked');
};

// Disable owner mode (include your views)
window.disableOwnerMode = function() {
    localStorage.removeItem('siteOwner');
    console.log('✓ Owner mode DISABLED - Your views will be tracked');
};

// ===================================
// SOCIAL MEDIA META TAGS
// ===================================

function updateSocialMetaTags(albumTitle, albumDescription, imageUrl, pageUrl) {
    // Update or create Open Graph meta tags
    const metaTags = [
        { property: 'og:title', content: albumTitle },
        { property: 'og:description', content: albumDescription },
        { property: 'og:image', content: imageUrl },
        { property: 'og:url', content: pageUrl },
        { name: 'twitter:title', content: albumTitle },
        { name: 'twitter:description', content: albumDescription },
        { name: 'twitter:image', content: imageUrl }
    ];
    
    metaTags.forEach(tag => {
        let existingTag;
        if (tag.property) {
            existingTag = document.querySelector(`meta[property="${tag.property}"]`);
        } else if (tag.name) {
            existingTag = document.querySelector(`meta[name="${tag.name}"]`);
        }
        
        if (existingTag) {
            existingTag.setAttribute('content', tag.content);
        } else {
            const newTag = document.createElement('meta');
            if (tag.property) newTag.setAttribute('property', tag.property);
            if (tag.name) newTag.setAttribute('name', tag.name);
            newTag.setAttribute('content', tag.content);
            document.head.appendChild(newTag);
        }
    });
}

function setAlbumSocialMeta(albumUrl) {
    // Find the album data
    const albumData = ALBUM_DATA.music.find(album => album.flickrUrl === albumUrl);
    if (!albumData) return;
    
    const albumTitle = albumData.title;
    const albumDescription = `Live music photography by Jayne Clamp - ${albumTitle}`;
    const pageUrl = window.location.href;
    
    // Use cover image if available, otherwise use a default
    let imageUrl = albumData.coverUrl;
    if (!imageUrl) {
        // Default to your music collection cover or a generic image
        imageUrl = 'https://live.staticflickr.com/65535/54887240071_f8ff887ce5_b.jpg'; // Baba Commandant cover
    }
    
    updateSocialMetaTags(albumTitle, albumDescription, imageUrl, pageUrl);
    
    console.log('Updated social meta tags:', {
        title: albumTitle,
        description: albumDescription,
        image: imageUrl,
        url: pageUrl
    });
}

// ===================================
// IMAGE PROTECTION
// ===================================

// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Disable common keyboard shortcuts for dev tools and saving
document.addEventListener('keydown', function(e) {
    // Disable F12 (Dev Tools)
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+I (Dev Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+S (Save Page)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
});

// Disable text selection on images
document.addEventListener('selectstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
    }
});

// ===================================
// GLOBAL HEADER SYSTEM
// ===================================

// Global header HTML template
function createGlobalHeader() {
    return `
        <header class="site-header">
            <div class="container">
                <h1 class="site-title"><a href="../index.html">Jayne Clamp</a></h1>
                <nav class="main-nav">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <ul class="nav-menu">
                        <li class="collections-dropdown">
                            <a href="../index.html#collections" class="collections-trigger">Collections <i class="fas fa-chevron-down"></i></a>
                            <ul class="collections-menu">
                                <li><a href="../collections/music.html">Music</a></li>
                                <li><a href="../collections/events.html">Events</a></li>
                                <li><a href="../collections/travel.html">Travel</a></li>
                                <li><a href="../collections/birds.html">Birds</a></li>
                                <li><a href="../collections/landscapes.html">Landscapes</a></li>
                                <li><a href="../collections/pets.html">Pets</a></li>
                                <li><a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener">Videos</a></li>
                            </ul>
                        </li>
                        <li><a href="../contact.html">Contact</a></li>
                        <li class="share-dropdown">
                            <a href="#" class="share-trigger">Share <i class="fas fa-chevron-down"></i></a>
                            <ul class="share-menu">
                                <li><a href="#" onclick="shareToInstagram(); return false;"><i class="fab fa-instagram"></i> Instagram</a></li>
                                <li><a href="#" onclick="shareToThreads(); return false;"><i class="fas fa-at"></i> Threads</a></li>
                                <li><a href="#" onclick="shareToFacebook(); return false;"><i class="fab fa-facebook"></i> Facebook</a></li>
                                <li><a href="#" onclick="shareToPinterest(); return false;"><i class="fab fa-pinterest"></i> Pinterest</a></li>
                                <li><a href="#" onclick="shareToBluesky(); return false;"><i class="fas fa-cloud"></i> Bluesky</a></li>
                            </ul>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    `;
}

// Initialize global header on all pages
function initializeGlobalHeader() {
    const existingHeader = document.querySelector('.site-header');
    if (existingHeader) {
        existingHeader.outerHTML = createGlobalHeader();
        console.log('Global header initialized');
    }
}

// GLOBAL FOOTER SYSTEM
// ===================================

// Global footer HTML template
function createGlobalFooter() {
    return `
        <footer class="site-footer">
            <div class="container">
                <div class="social-links">
                    <a href="https://instagram.com/jaynecougarmelonclamp" target="_blank" rel="noopener" aria-label="Instagram">
                        <i class="fab fa-instagram"></i>
                    </a>
                    <a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener" aria-label="YouTube">
                        <i class="fab fa-youtube"></i>
                    </a>
                    <a href="https://www.flickr.com/photos/jayneclamp" target="_blank" rel="noopener" aria-label="Flickr">
                        <i class="fab fa-flickr"></i>
                    </a>
                    <a href="https://soundcloud.com/jclamp" target="_blank" rel="noopener" aria-label="SoundCloud">
                        <i class="fab fa-soundcloud"></i>
                    </a>
                </div>
                <p class="copyright">&copy; 2025 Jayne Clamp | Photography & Website Design</p>
            </div>
        </footer>
    `;
}

// Initialize global footer on all pages
function initializeGlobalFooter() {
    const existingFooter = document.querySelector('.site-footer');
    if (existingFooter) {
        existingFooter.outerHTML = createGlobalFooter();
        console.log('Global footer initialized');
    }
}

// Initialize global header and footer when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalHeader();
    initializeGlobalFooter();
});

// Disable drag start on images
document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
    }
});

console.log('💡 Tip: Type viewStats() to see statistics | enableOwnerMode() to exclude your views');

// ===================================
// SCROLL POSITION RESTORATION
// ===================================

// Save scroll position when navigating away from collection pages
function saveScrollPosition() {
    const scrollY = window.scrollY || window.pageYOffset;
    const path = window.location.pathname;
    
    // Only save for collection pages
    if (path.includes('/collections/')) {
        sessionStorage.setItem('scrollPosition_' + path, scrollY.toString());
        console.log('Saved scroll position:', scrollY, 'for', path);
    }
}

// Restore scroll position when returning to collection pages
function restoreScrollPosition() {
    const path = window.location.pathname;
    
    // Only restore for collection pages
    if (path.includes('/collections/')) {
        const savedPosition = sessionStorage.getItem('scrollPosition_' + path);
        if (savedPosition) {
            const scrollY = parseInt(savedPosition, 10);
            
            // Wait for content to load before scrolling
            setTimeout(() => {
                window.scrollTo({
                    top: scrollY,
                    behavior: 'smooth'
                });
                console.log('Restored scroll position:', scrollY, 'for', path);
            }, 100);
        }
    }
}

// Enhanced back button functionality with scroll restoration
function enhanceBackButtons() {
    // Find all back buttons and album links
    const backButtons = document.querySelectorAll('.back-button');
    const albumLinks = document.querySelectorAll('.album-card a, .collection-card a');
    
    // Add scroll saving to album/collection links
    albumLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't interfere with external links
            if (this.hostname && this.hostname !== window.location.hostname) {
                return;
            }
            
            saveScrollPosition();
        });
    });
    
    // Add scroll restoration to back buttons
    backButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Don't interfere if it's not going to a collection page
            const href = this.getAttribute('href');
            if (href && href.includes('/collections/')) {
                // Let the navigation happen, then restore position
                setTimeout(() => {
                    restoreScrollPosition();
                }, 50);
            }
        });
    });
}

// Initialize scroll restoration system
document.addEventListener('DOMContentLoaded', function() {
    // Restore position on page load
    restoreScrollPosition();
    
    // Enhance navigation buttons
    enhanceBackButtons();
    
    // Save position before page unload
    window.addEventListener('beforeunload', saveScrollPosition);
});

// Also save position when using browser back/forward buttons
window.addEventListener('popstate', function() {
    setTimeout(restoreScrollPosition, 50);
});
