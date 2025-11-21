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
    if (!flickrUrl) return null;
    const match = flickrUrl.match(/albums\/(\d+)/);
    return match ? match[1] : null;
}

// Fetch ALL photos from a Flickr album using pagination
async function fetchFlickrAlbumPhotos(albumId, maxPhotos = 500) {
    if (!FLICKR_CONFIG.apiKey || FLICKR_CONFIG.apiKey === 'YOUR_FLICKR_API_KEY') {
        console.warn('Flickr API key not configured. Using fallback method.');
        return null;
    }

    let allPhotos = [];
    let page = 1;
    let totalPages = 1;
    const perPage = 100; // Maximum allowed by Flickr API
    
    console.log(`Fetching ALL photos from album ${albumId}...`);
    
    try {
        do {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_c,url_h,url_o,url_l,description,tags&format=json&nojsoncallback=1&per_page=${perPage}&page=${page}`;
            
            console.log(`Fetching page ${page}/${totalPages}:`, url);
            
            const response = await fetch(url);
            console.log(`Page ${page} response status:`, response.status);
            
            const data = await response.json();
            
            if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
                // Update total pages from first response
                if (page === 1) {
                    totalPages = data.photoset.pages;
                    console.log('Album info:', {
                        id: data.photoset.id,
                        total: data.photoset.total,
                        pages: data.photoset.pages,
                        perpage: data.photoset.perpage
                    });
                }
                
                const pagePhotos = data.photoset.photo.map(photo => {
                    // Debug: Log raw tag data from first photo
                    if (data.photoset.photo.indexOf(photo) === 0 && photo.tags) {
                        console.log('Raw tags from Flickr API:', photo.tags);
                        console.log('Type:', typeof photo.tags);
                    }
                    
                    return {
                        id: photo.id,
                        title: photo.title,
                        description: photo.description ? photo.description._content : '',
                        tags: photo.tags ? photo.tags.split(' ') : [],
                        thumbnail: photo.url_c || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`,
                        large: photo.url_h || photo.url_l || photo.url_o || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                        url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
                    };
                });
                
                allPhotos = allPhotos.concat(pagePhotos);
                console.log(`Page ${page}: Added ${pagePhotos.length} photos. Total so far: ${allPhotos.length}`);
                
                page++;
            } else {
                console.error('Flickr API error:', data.message || 'Unknown error');
                console.log('Trying alternative method for older album...');
                
                // Try alternative method for older albums
                return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
            }
        } while (page <= totalPages && allPhotos.length < maxPhotos);
        
        console.log(`✅ Fetched ALL ${allPhotos.length} photos from album ${albumId}`);
        return allPhotos;
        
    } catch (error) {
        console.error('Error fetching Flickr photos:', error);
        console.log('Trying alternative method for older album...');
        
        // Try alternative method for older albums
        return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
    }
}

// Alternative method for older Flickr albums with pagination
async function fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos = 500) {
    console.log('Using alternative method with pagination for album:', albumId);
    
    let allPhotos = [];
    let page = 1;
    let totalPages = 1;
    const perPage = 100;
    
    try {
        do {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_s,url_m,url_l,url_o,description,tags&format=json&nojsoncallback=1&per_page=${perPage}&page=${page}`;
            
            console.log(`Alternative method - fetching page ${page}/${totalPages}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
                if (page === 1) {
                    totalPages = data.photoset.pages;
                    console.log(`Alternative method - Album has ${data.photoset.total} photos across ${totalPages} pages`);
                }
                
                const pagePhotos = data.photoset.photo.map(photo => ({
                    id: photo.id,
                    title: photo.title,
                    description: photo.description ? photo.description._content : '',
                    tags: photo.tags ? photo.tags.split(' ') : [],
                    thumbnail: photo.url_m || photo.url_s || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`,
                    large: photo.url_l || photo.url_o || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                    url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
                }));
                
                allPhotos = allPhotos.concat(pagePhotos);
                console.log(`Alternative method - Page ${page}: Added ${pagePhotos.length} photos. Total: ${allPhotos.length}`);
                
                page++;
            } else {
                console.error('Alternative method failed:', data.message || 'Unknown error');
                return null;
            }
        } while (page <= totalPages && allPhotos.length < maxPhotos);
        
        console.log(`✅ Alternative method fetched ALL ${allPhotos.length} photos from album ${albumId}`);
        return allPhotos;
        
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
            // Show title and description in lightbox
            const hasDescription = photo.description && photo.description.trim();
            
            if (hasDescription) {
                lightboxCaption.innerHTML = `
                    <div class="lightbox-title">${photo.title}</div>
                    <div class="lightbox-description">${photo.description}</div>
                `;
            } else {
                lightboxCaption.innerHTML = `<div class="lightbox-title">${photo.title}</div>`;
            }
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

// Modern click-to-advance functionality
function initializeLightboxClickAdvance() {
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightboxImg) {
        lightboxImg.addEventListener('click', function(e) {
            // Get click position relative to image
            const rect = this.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const imageWidth = rect.width;
            
            // Left third = previous, right two-thirds = next
            if (clickX < imageWidth / 3) {
                prevLightboxImage();
            } else {
                nextLightboxImage();
            }
            
            // Add visual feedback
            this.style.cursor = 'pointer';
        });
        
        // Add hover cursor indication
        lightboxImg.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const imageWidth = rect.width;
            
            // Change cursor based on position
            if (mouseX < imageWidth / 3) {
                this.style.cursor = 'w-resize'; // Left arrow cursor
            } else {
                this.style.cursor = 'e-resize'; // Right arrow cursor
            }
        });
        
        lightboxImg.addEventListener('mouseleave', function() {
            this.style.cursor = 'default';
        });
    }
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
        case 'bluesky':
            shareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(albumTitle + ' - ' + photoUrl)}`;
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
            title: '2023-06-24 Pink Stones @ Athfest | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330439979/',
            coverUrl: 'https://live.staticflickr.com/65535/54932541592_d6f12e6bdf_c.jpg',
            albumPage: '../music/2023-06-24-pink-stones-athfest-athens-ga.html'
        },
        { 
            title: '2021-06-05 Jay Gonzalez @ Liberty Field | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330410616/',
            coverUrl: 'https://live.staticflickr.com/65535/54933682333_3f00e98099_c.jpg',
            albumPage: '../music/2021-06-05-jay-gonzalez-liberty-field-athens-ga.html'
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
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324235638/',
            albumPage: '../music/2025-02-15-drive-by-truckers-40-watt-athens-ga.html'
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
            title: '2024-04-20 Irreperable Damage @ Flicker | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330456601/',
            coverUrl: 'https://live.staticflickr.com/65535/54936449937_bd06e0ed3c_c.jpg',
            albumPage: '../music/2024-04-20-irreperable-damage-flicker-athens-ga.html'
        },
        { 
            title: '2024-03-01 Lona @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330247523/',
            albumPage: '../music/2024-03-01-lona-40-watt-athens-ga.html'
        },
        { 
            title: '2024-02-15 Vision Video @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330453075/',
            coverUrl: 'https://live.staticflickr.com/65535/54937524283_39edfc2795_c.jpg',
            albumPage: '../music/2024-02-15-vision-video-40-watt-athens-ga.html'
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
            title: '2023-11-24 TaxiCab Verses @ Flicker | Athens, GA', 
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
            title: '2023-07-18 Jay Gonzalez @ Athentic Brewery | Athens, GA', 
            photoCount: 2, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486524/',
            coverUrl: 'https://live.staticflickr.com/65535/54937568999_6fdc41bd09_c.jpg',
            albumPage: '../music/2023-07-18-jay-gonzalez-athentic-brewery-athens-ga.html'
        },
        { 
            title: '2023-09-30 Pilgrim @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329982149/',
            albumPage: '../music/2023-09-30-pilgrim-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2023-11-04 Jerry Joseph & the Jackmormons @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329992639/', 
            coverUrl: 'https://live.staticflickr.com/65535/54887676938_5139120bee_b.jpg',
            albumPage: '../music/2023-11-04-jerry-joseph-the-jackmormons-40-watt-athens-ga.html'
        },
        { 
            title: '2023-10-07 TaxiCab Verses @ 40 Watt | Athens, GA', 
            photoCount: 10, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330392902/', 
            coverUrl: 'https://live.staticflickr.com/65535/54930448852_9453baf315_b.jpg',
            albumPage: '../music/2023-10-07-taxicab-verses-40-watt-athens-ga.html'
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
            title: '2023-08-12 Drug Ducks @ Nowhere Bar | Athens, GA', 
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
            title: '2023-04-06 Will Johnson @ Living Room Show | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330408516/',
            albumPage: '../music/2023-04-06-will-johnson-living-room-show-athens-ga.html'
        },
        { 
            title: '2023-04-06 Spencer Thomas @ Living Room Show | Athens, GA', 
            photoCount: 2, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330411882/',
            albumPage: '../music/2023-04-06-spencer-thomas-living-room-show-athens-ga.html'
        },
        { 
            title: '2023-03-25 Eyelids @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329988510/',
            albumPage: '../music/2023-03-25-eyelids-flicker-athens-ga.html'
        },
        { 
            title: '2023-03-23 JD Pinkus & Daniel Mason @ Cine | Athens, GA', 
            photoCount: 5, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486594/',
            coverUrl: 'https://live.staticflickr.com/65535/54936453727_9c179be67d_c.jpg',
            albumPage: '../music/2023-03-23-jd-pinkus-daniel-mason-cine-athens-ga.html'
        },
        { 
            title: '2023-03-10 Cracker @ 40 Watt | Athens, GA', 
            photoCount: 8, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486669/',
            coverUrl: 'https://live.staticflickr.com/65535/54937643785_5dec809aef_c.jpg',
            albumPage: '../music/2023-03-10-cracker-40-watt-athens-ga.html'
        },
        { 
            title: '2023-03-25 Elf Power @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329979503/',
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
            title: '2022-12-13 Clay Leverett & John Neff @ Nuci\'s Space | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330474508/',
            coverUrl: 'https://live.staticflickr.com/65535/54936434472_98005f57b1_c.jpg',
            albumPage: '../music/2022-12-13-clay-leverett-john-neff-nucis-space-athens-ga.html'
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
            title: '2022-09-02 Don Chambers @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452850/',
            coverUrl: 'https://live.staticflickr.com/65535/54937489223_590defb396_c.jpg',
            albumPage: '../music/2022-09-02-don-chambers-40-watt-athens-ga.html'
        },
        { 
            title: '2022-09-24 A-Fest with Blunt Bangs @ Little Kings | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486349/',
            coverUrl: 'https://live.staticflickr.com/65535/54937496533_4042f9002c_c.jpg',
            albumPage: '../music/2022-09-24-a-fest-athens-ga.html'
        },
        { 
            title: '2022-07-22 Kimberly Morgan York @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330248402/',
            coverUrl: 'https://live.staticflickr.com/65535/54884346352_08513c42a3_b.jpg',
            albumPage: '../music/2022-07-22-kimberly-morgan-york-40-watt-athens-ga.html'
        },
        { 
            title: '2022-07-22 Claire Campbell @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330474313/',
            coverUrl: 'https://live.staticflickr.com/65535/54937277471_73d9f2292b_c.jpg',
            albumPage: '../music/2022-07-22-claire-campbell-40-watt-athens-ga.html'
        },
        { 
            title: '2022-06-26 Kevn Kinney Band @ AthFest | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330258602/',
            albumPage: '../music/2022-06-26-kevn-kinney-band-athfest-athens-ga.html'
        },
        { 
            title: '2022-05-22 The Wydelles @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452730/',
            coverUrl: 'https://live.staticflickr.com/65535/54936381962_1f567eec3f_c.jpg',
            albumPage: '../music/2022-05-22-the-wydelles-40-watt-athens-ga.html'
        },
        { 
            title: '2022-04-10 Patterson Hood, Claire Campbell & Jay Gonzalez @ Creature Comforts | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329983203/',
            coverUrl: 'https://live.staticflickr.com/65535/54887666343_32bb0a8754_b.jpg',
            albumPage: '../music/2022-04-10-patterson-hood-claire-campbell-jay-gonzalez-creature-comforts-athens-ga.html'
        },
        { 
            title: '2022-03-27 Bo Bedingfield @ World Famous | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452520/',
            coverUrl: 'https://live.staticflickr.com/65535/54937488894_58feba17b0_c.jpg',
            albumPage: '../music/2022-03-27-bo-bedingfield-world-famous-athens-ga.html'
        },
        { 
            title: '2022-02-27 Shotgun Shells: A Celebration of Todd McBride @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329979705/',
            albumPage: '../music/2022-02-27-shotgun-shells-celebration-todd-mcbride-athens-ga.html'
        },
        { 
            title: '2020-02-13 The Dexateens @ 40 Watt | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330387630/', 
            coverUrl: 'https://live.staticflickr.com/65535/54931548358_9c9c34f739_b.jpg',
            albumPage: '../music/2020-02-13-the-dexateens-40-watt-athens-ga.html'
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
            title: '2019-05-03 Matt Talbott @ Espresso Machine Studio | Athens, GA', 
            photoCount: 2, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330484809/',
            coverUrl: 'https://live.staticflickr.com/65535/54937376014_12f07a7797_c.jpg',
            albumPage: '../music/2019-05-03-matt-talbott-espresso-machine-studio-athens-ga.html'
        },
        { 
            title: '2019-05-30 Andrew Prater @ Flicker | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452460/',
            coverUrl: 'https://live.staticflickr.com/65535/54937477214_e10024d858_c.jpg',
            albumPage: '../music/2019-05-30-andrew-prater-flicker-athens-ga.html'
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
            title: '2019-02-01 David Barbe & the Quick Hooks @ Caledonia | Athens, GA', 
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
            title: '2018-10-31 Bloodkin @ Georgia Theatre | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330418079/',
            coverUrl: 'https://live.staticflickr.com/65535/54931383658_6af651a0c5_b.jpg',
            albumPage: '../music/2018-10-31-bloodkin-georgia-theatre-athens-ga.html'
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
    
    // Debug: Check what description data we have
    photos.forEach((photo, i) => {
        if (i < 3) { // Log first 3 photos for debugging
            console.log(`Photo ${i + 1}:`, {
                title: photo.title,
                description: photo.description,
                tags: photo.tags,
                hasDescription: !!(photo.description && photo.description.trim())
            });
        }
    });
    
    // Store photos globally for lightbox and tag filtering
    currentAlbumPhotos = photos;
    allAlbumPhotos = photos;
    
    // Display photo tags if container exists
    displayPhotoTags(photos);
    
    // Display photos in grid (descriptions will show in lightbox only)
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

    // Filter by band if specified (for music collection)
    if (filterBand !== 'all' && collectionType === 'music') {
        albums = albums.filter(album => {
            // Extract band name from title (format: "YYYY-MM-DD Band Name @ Venue" or "YYYY-MM-DD ... | Venue")
            const match = album.title.match(/\d{4}-\d{2}-\d{2}\s+(.+?)\s+(?:@|\|)/);
            if (!match) return false;
            
            let artistSection = match[1].trim();
            
            // Special handling for Porchfest artists
            if (artistSection.toLowerCase() === 'porchfest') {
                const porchfestArtists = ['David Barbe', 'T. Hardy Morris', 'Don Chambers', 'Trycoh', 'Lazy Horse', 'Infinite Favors'];
                return porchfestArtists.some(artist => 
                    artist.toLowerCase().includes(filterBand.toLowerCase())
                );
            }
            
            // Special handling for Shotgun Shells
            if (artistSection.toLowerCase().includes('shotgun shells: a celebration of todd mcbride') && 
                filterBand.toLowerCase() === 'shotgun shells') {
                return true;
            }
            
            // Special handling: if title contains "Event with", extract artists after "with"
            const withMatch = artistSection.match(/\bwith\s+(.+)$/i);
            if (withMatch && artistSection.toLowerCase().includes('event')) {
                artistSection = withMatch[1].trim();
            }
            
            return artistSection.toLowerCase().includes(filterBand.toLowerCase());
        });
    }
    
    // Filter by event type if specified (for events collection)
    // Note: filterBand parameter is reused as filterEvent for events collection
    if (filterBand !== 'all' && collectionType === 'events') {
        const filterEvent = filterBand; // Reuse the parameter
        albums = albums.filter(album => {
            // Extract event name from title
            let eventName = album.title;
            
            // Remove date prefix
            eventName = eventName.replace(/^\d{4}-\d{2}-\d{2}\s+/, '');
            
            // Remove location suffix
            eventName = eventName.split(/\s*[@|]\s*/)[0].trim();
            
            // Match against normalized event names
            if (filterEvent === 'Wild Rumpus') {
                return eventName.toLowerCase().includes('wild rumpus');
            } else if (filterEvent === 'Pride Parade') {
                return eventName.toLowerCase().includes('pride');
            } else if (filterEvent === 'No Kings') {
                return eventName.toLowerCase().includes('no kings');
            } else if (filterEvent === 'Black Lives Matter') {
                return eventName.toLowerCase().includes('black lives matter');
            } else if (filterEvent === 'March For Our Lives') {
                return eventName.toLowerCase().includes('march for our lives');
            } else if (filterEvent === 'Jon Ossoff Rally') {
                return eventName.toLowerCase().includes('ossoff');
            } else if (filterEvent === 'UCW Labor Rally') {
                return eventName.toLowerCase().includes('ucw') || eventName.toLowerCase().includes('labor rally');
            } else if (filterEvent === 'UGA Homecoming') {
                return eventName.toLowerCase().includes('homecoming');
            } else {
                return eventName.toLowerCase().includes(filterEvent.toLowerCase());
            }
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

    // If no albums configured yet, show appropriate message
    if (albums.length === 0) {
        // Detect which collection page we're on
        const currentPath = window.location.pathname;
        const isTravel = currentPath.includes('travel.html');
        const isPets = currentPath.includes('pets.html');
        
        let message = '';
        if (isTravel || isPets) {
            message = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #666;">
                    <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
                    <p style="font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 300;">Coming Soon</p>
                    <p style="font-size: 1rem; color: #999;">New ${isTravel ? 'travel adventures' : 'pet photos'} will be added here soon!</p>
                </div>
            `;
        } else {
            message = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                    <p style="font-size: 1.2rem; margin-bottom: 1rem;">No albums found</p>
                    <p style="font-size: 0.95rem;">${filterYear === 'all' ? 'Add your Flickr album links in js/main.js' : 'No albums for ' + filterYear}</p>
                </div>
            `;
        }
        
        albumsGrid.innerHTML = message;
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

// Get album URL from page script or data attributes
function getAlbumUrlFromPage() {
    // Check if there's a script tag with album URL
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
        const content = script.textContent;
        if (content && content.includes('albumUrl')) {
            const match = content.match(/albumUrl\s*=\s*['"`]([^'"`]+)['"`]/);
            if (match) {
                return match[1];
            }
        }
    }
    
    // Check for data attribute on body or main element
    const albumUrl = document.body.getAttribute('data-album-url') || 
                     document.querySelector('main')?.getAttribute('data-album-url');
    
    return albumUrl;
}

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
                
                // Special handling for Porchfest - extract individual artists from the lineup
                if (artistSection.toLowerCase() === 'porchfest') {
                    // Add individual Porchfest 2025 artists (excluding "Boo Le Bark" which is an event)
                    const porchfestArtists = ['David Barbe', 'T. Hardy Morris', 'Don Chambers', 'Trycoh', 'Lazy Horse', 'Infinite Favors'];
                    porchfestArtists.forEach(artist => artists.add(artist));
                    return; // Skip normal processing for Porchfest
                }
                
                // Special handling for Shotgun Shells - extract just the band name
                if (artistSection.toLowerCase().includes('shotgun shells: a celebration of todd mcbride')) {
                    artists.add('Shotgun Shells');
                    return; // Skip normal processing for Shotgun Shells
                }
                
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
                        cleanArtist.toLowerCase() === 'event' ||
                        cleanArtist.toLowerCase().includes('a-fest')) {
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
    
    // Initialize event filter for events collection
    if (collectionType === 'events') {
        const eventFilter = document.getElementById('event-filter');
        if (eventFilter && ALBUM_DATA.events) {
            // Clear existing options except "All Events"
            eventFilter.innerHTML = '<option value="all">All Events</option>';
            
            // Extract unique event types from album titles
            const eventTypes = new Set();
            ALBUM_DATA.events.forEach(album => {
                // Extract event name (everything after date and before location)
                let eventName = album.title;
                
                // Remove date prefix (YYYY-MM-DD format)
                eventName = eventName.replace(/^\d{4}-\d{2}-\d{2}\s+/, '');
                
                // Remove location suffix (| Location or @ Location)
                eventName = eventName.split(/\s*[@|]\s*/)[0].trim();
                
                // Normalize event names
                if (eventName.toLowerCase().includes('wild rumpus')) {
                    eventTypes.add('Wild Rumpus');
                } else if (eventName.toLowerCase().includes('pride')) {
                    eventTypes.add('Pride Parade');
                } else if (eventName.toLowerCase().includes('no kings')) {
                    eventTypes.add('No Kings');
                } else if (eventName.toLowerCase().includes('black lives matter')) {
                    eventTypes.add('Black Lives Matter');
                } else if (eventName.toLowerCase().includes('march for our lives')) {
                    eventTypes.add('March For Our Lives');
                } else if (eventName.toLowerCase().includes('ossoff')) {
                    eventTypes.add('Jon Ossoff Rally');
                } else if (eventName.toLowerCase().includes('ucw') || eventName.toLowerCase().includes('labor rally')) {
                    eventTypes.add('UCW Labor Rally');
                } else if (eventName.toLowerCase().includes('homecoming')) {
                    eventTypes.add('UGA Homecoming');
                } else {
                    // For any other events, use the cleaned name
                    eventTypes.add(eventName);
                }
            });
            
            // Sort event types alphabetically
            const sortedEventTypes = Array.from(eventTypes).sort();
            
            // Add options to dropdown
            sortedEventTypes.forEach(eventType => {
                const option = document.createElement('option');
                option.value = eventType;
                option.textContent = eventType;
                eventFilter.appendChild(option);
            });
            
            // Add event filter event listener
            eventFilter.addEventListener('change', function() {
                const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
                displayAlbums(collectionType, selectedYear, this.value);
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
            // Filter albums by year and current band/venue/event selection
            const year = this.dataset.year;
            const bandFilter = document.getElementById('band-filter');
            const venueFilter = document.getElementById('venue-filter');
            const eventFilter = document.getElementById('event-filter');
            const selectedBand = bandFilter ? bandFilter.value : 'all';
            const selectedVenue = venueFilter ? venueFilter.value : 'all';
            const selectedEvent = eventFilter ? eventFilter.value : 'all';
            
            // Call displayAlbums with appropriate parameters based on collection type
            if (collectionType === 'events') {
                displayAlbums(collectionType, year, selectedEvent);
            } else {
                displayAlbums(collectionType, year, selectedBand, selectedVenue);
            }
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
    // Determine if we're on index page or collection page for correct paths
    const isIndexPage = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
    const basePath = isIndexPage ? '' : '../';

    return `
        <header class="site-header">
            <div class="container">
                <h1 class="site-title"><a href="${basePath}index.html">Jayne Clamp</a></h1>
                <nav class="main-nav">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <ul class="nav-menu">
                        <li><a href="#" onclick="openSearchModal(); return false;" aria-label="Search"><i class="fas fa-search"></i></a></li>
                        <li class="collections-dropdown">
                            <a href="${basePath}index.html#collections" class="collections-trigger">Collections <i class="fas fa-chevron-down"></i></a>
                            <ul class="collections-menu">
                                <li><a href="${basePath}collections/music.html">Music</a></li>
                                <li><a href="${basePath}collections/events.html">Events</a></li>
                                <li><a href="${basePath}collections/travel.html">Travel</a></li>
                                <li><a href="${basePath}collections/birds.html">Birds</a></li>
                                <li><a href="${basePath}collections/landscapes.html">Landscapes</a></li>
                                <li><a href="${basePath}collections/pets.html">Pets</a></li>
                                <li><a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener">Videos</a></li>
                            </ul>
                        </li>
                        <li><a href="${basePath}collections/tags.html">Tags</a></li>
                        <li><a href="${basePath}contact.html">Contact</a></li>
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
        console.log('Found existing header:', existingHeader);
        console.log('Original header HTML:', existingHeader.outerHTML.substring(0, 200) + '...');
        existingHeader.outerHTML = createGlobalHeader();
        console.log('Global header initialized - header replaced');
        
        // Check what the new header looks like
        const newHeader = document.querySelector('.site-header');
        if (newHeader) {
            console.log('New header HTML:', newHeader.outerHTML.substring(0, 200) + '...');
        }
    } else {
        console.log('No existing header found to replace');
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
                <div class="legal-links">
                    <a href="privacy-policy.html">Privacy Policy</a>
                    <span class="separator">•</span>
                    <a href="terms-of-use.html">Terms of Use</a>
                    <span class="separator">•</span>
                    <a href="sitemap.xml">Sitemap</a>
                </div>
            </div>
        </footer>
    `;
}

// Initialize global footer on all pages
function initializeGlobalFooter() {
    const existingFooter = document.querySelector('.site-footer');
    if (existingFooter && existingFooter.parentNode) {
        try {
            existingFooter.outerHTML = createGlobalFooter();
            console.log('Global footer initialized');
        } catch (error) {
            console.log('Footer replacement failed, appending instead:', error);
            document.body.insertAdjacentHTML('beforeend', createGlobalFooter());
        }
    } else {
        // No existing footer or no parent, just append
        document.body.insertAdjacentHTML('beforeend', createGlobalFooter());
        console.log('Global footer appended');
    }
}

// Initialize global header and footer when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalHeader(); // Re-enabled for consistent navigation
    initializeGlobalFooter();
    initializeLightboxClickAdvance();
    
    // SIMPLE SOLUTION: Remove ALL camera icons completely
    const removeAllCameras = () => {
        // Remove ALL camera icons from EVERYWHERE on the page
        document.querySelectorAll('.fa-camera').forEach(icon => icon.remove());
        
        // Clean up site title to just be "Jayne Clamp"
        const siteTitleLink = document.querySelector('.site-title a');
        if (siteTitleLink) {
            siteTitleLink.innerHTML = 'Jayne Clamp';
        }
    };
    
    // Remove all cameras immediately and keep removing them
    removeAllCameras();
    
    setTimeout(() => {
        removeAllCameras();
    }, 1000);
    
    setTimeout(() => {
        removeAllCameras();
    }, 3000);
    
    // CONTINUOUS GUARDIAN: Remove ANY camera icons that appear
    setInterval(() => {
        const cameraIcons = document.querySelectorAll('.fa-camera');
        if (cameraIcons.length > 0) {
            console.log(`GUARDIAN: Found ${cameraIcons.length} camera icons - removing ALL`);
            cameraIcons.forEach(icon => icon.remove());
            
            // Clean site title
            const siteTitleLink = document.querySelector('.site-title a');
            if (siteTitleLink) {
                siteTitleLink.innerHTML = 'Jayne Clamp';
            }
        }
    }, 200); // Check every 200ms
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

// ===================================
// COOKIE NOTICE FUNCTIONALITY
// ===================================

function showCookieNotice() {
    // Check if user has already acknowledged cookies
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        return;
    }
    
    // Create cookie notice HTML
    const cookieNotice = document.createElement('div');
    cookieNotice.className = 'cookie-notice';
    cookieNotice.innerHTML = `
        <p>This site uses Google Analytics cookies to understand how visitors interact with the website. <a href="/privacy-policy.html">Learn more</a></p>
        <div class="cookie-notice-buttons">
            <button onclick="acceptCookies()">Got it</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(cookieNotice);
    
    // Show with animation
    setTimeout(() => {
        cookieNotice.classList.add('show');
    }, 500);
}

function acceptCookies() {
    // Save acceptance to localStorage
    localStorage.setItem('cookiesAccepted', 'true');
    
    // Hide notice
    const notice = document.querySelector('.cookie-notice');
    if (notice) {
        notice.classList.remove('show');
        setTimeout(() => {
            notice.remove();
        }, 300);
    }
}

// Show cookie notice on page load
document.addEventListener('DOMContentLoaded', function() {
    showCookieNotice();
    initializeMobileMenu();
});

// ===================================
// MOBILE MENU FUNCTIONALITY
// ===================================

function initializeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            
            // Toggle hamburger icon
            const icon = mobileToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                const icon = mobileToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}


// Debug function to count camera icons
function debugCameraIcons() {
    const allCameraIcons = document.querySelectorAll('.fa-camera');
    console.log(`Found ${allCameraIcons.length} camera icons:`);
    allCameraIcons.forEach((icon, index) => {
        console.log(`Camera ${index + 1}:`, icon, 'Parent:', icon.parentElement);
    });
    
    // Check for CSS-generated content
    const siteTitle = document.querySelector('.site-title');
    if (siteTitle) {
        const beforeContent = window.getComputedStyle(siteTitle, '::before').content;
        const afterContent = window.getComputedStyle(siteTitle, '::after').content;
        console.log('Site title ::before content:', beforeContent);
        console.log('Site title ::after content:', afterContent);
        
        const siteTitleLink = document.querySelector('.site-title a');
        if (siteTitleLink) {
            const linkBeforeContent = window.getComputedStyle(siteTitleLink, '::before').content;
            const linkAfterContent = window.getComputedStyle(siteTitleLink, '::after').content;
            console.log('Site title link ::before content:', linkBeforeContent);
            console.log('Site title link ::after content:', linkAfterContent);
        }
    }
}

// Simple camera icon cleanup - NO LOOPS
function ensureSingleCameraIcon() {
    // Quietly remove all camera icons from site title
    const allCamerasInTitle = document.querySelectorAll('.site-title .fa-camera');
    allCamerasInTitle.forEach(icon => icon.remove());
    
    // Add exactly one camera icon after the name
    const siteTitleLink = document.querySelector('.site-title a');
    if (siteTitleLink && !siteTitleLink.querySelector('.fa-camera')) {
        siteTitleLink.innerHTML = siteTitleLink.textContent.trim();
        const cameraIcon = document.createElement('i');
        cameraIcon.className = 'fas fa-camera';
        siteTitleLink.appendChild(cameraIcon);
    }
}

// Photo tags functionality
let allAlbumPhotos = [];
let currentTagFilter = null;

function formatTagForDisplay(tag) {
    // Return tags exactly as they are on Flickr
    return tag;
}

function displayPhotoTags(photos) {
    const tagsContainer = document.getElementById('photo-tags');
    if (!tagsContainer) return;
    
    // Collect all unique tags from all photos
    const tagSet = new Set();
    photos.forEach(photo => {
        if (photo.tags && photo.tags.length > 0) {
            photo.tags.forEach(tag => tagSet.add(tag));
        }
    });
    
    const tags = Array.from(tagSet).sort();
    
    if (tags.length === 0) {
        tagsContainer.style.display = 'none';
        return;
    }
    
    // Create tag buttons
    tagsContainer.innerHTML = '<span style="color: #ccc; font-size: 0.9rem; margin-right: 0.5rem;">Filter by tag:</span>';
    
    // Add "All" button
    const allButton = document.createElement('button');
    allButton.textContent = 'All';
    allButton.className = 'tag-button active';
    allButton.style.cssText = 'padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 0.85rem; transition: background 0.3s ease;';
    allButton.onclick = () => filterPhotosByTag(null);
    tagsContainer.appendChild(allButton);
    
    // Add individual tag buttons
    tags.forEach(tag => {
        const button = document.createElement('button');
        button.textContent = formatTagForDisplay(tag);
        button.className = 'tag-button';
        button.dataset.originalTag = tag; // Store original tag for filtering
        button.style.cssText = 'padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.1); border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 0.85rem; transition: background 0.3s ease;';
        button.onmouseover = () => button.style.background = 'rgba(255,255,255,0.2)';
        button.onmouseout = () => {
            if (currentTagFilter !== tag) {
                button.style.background = 'rgba(255,255,255,0.1)';
            }
        };
        // Link to tags page with this tag
        button.onclick = () => {
            window.location.href = `../collections/tags.html?tag=${encodeURIComponent(tag)}`;
        };
        tagsContainer.appendChild(button);
    });
}

function filterPhotosByTag(tag) {
    currentTagFilter = tag;
    
    // Update button styles
    const tagButtons = document.querySelectorAll('.tag-button');
    tagButtons.forEach(button => {
        if ((tag === null && button.textContent === 'All') || button.textContent === tag) {
            button.style.background = 'rgba(255,255,255,0.2)';
            button.classList.add('active');
        } else {
            button.style.background = 'rgba(255,255,255,0.1)';
            button.classList.remove('active');
        }
    });
    
    // Filter photos
    const filteredPhotos = tag === null 
        ? allAlbumPhotos 
        : allAlbumPhotos.filter(photo => photo.tags && photo.tags.includes(tag));
    
    // Re-render photo grid
    const photosGrid = document.getElementById('photos-grid');
    if (photosGrid) {
        photosGrid.innerHTML = '';
        filteredPhotos.forEach((photo, index) => {
            const photoCard = document.createElement('div');
            photoCard.className = 'photo-card';
            photoCard.onclick = () => openLightbox(index, filteredPhotos);
            
            const img = document.createElement('img');
            img.src = photo.thumbnail;
            img.alt = photo.title || 'Photo';
            img.loading = 'lazy';
            
            photoCard.appendChild(img);
            photosGrid.appendChild(photoCard);
        });
        
        // Update photo count
        const subtitle = document.querySelector('.page-subtitle');
        if (subtitle) {
            subtitle.textContent = `${filteredPhotos.length} photo${filteredPhotos.length !== 1 ? 's' : ''}${tag ? ` tagged "${tag}"` : ''}`;
        }
    }
}

// Tags page functionality
let allPhotosWithTags = []; // Store all photos globally for filtering

async function initializeTagsPage() {
    console.log('Initializing tags page...');
    
    const tagsContainer = document.getElementById('tags-container');
    const searchInput = document.getElementById('tag-search');
    if (!tagsContainer) return;
    
    // Disable search until loaded
    if (searchInput) {
        searchInput.disabled = true;
        searchInput.placeholder = 'Loading tags...';
        searchInput.style.opacity = '0.5';
        searchInput.style.cursor = 'not-allowed';
    }
    
    // Check if there's a tag parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get('tag');
    
    // Show loading with progress
    if (tagParam) {
        tagsContainer.innerHTML = `<p style="color: #999; width: 100%; text-align: center;">Loading photos tagged "${formatTagForDisplay(tagParam)}"... <span id="tags-progress">0</span> albums processed</p>`;
    } else {
        tagsContainer.innerHTML = '<p style="color: #999; width: 100%; text-align: center;">Loading photos and tags... <span id="tags-progress">0</span> albums processed</p>';
    }
    
    // Fetch all photos with tags from all albums
    const allTags = new Map(); // Map of tag -> array of photos
    const allCollections = ['music', 'events', 'landscapes'];
    let processedCount = 0;
    let totalAlbums = 0;
    
    // Count total albums
    allCollections.forEach(collectionType => {
        totalAlbums += (ALBUM_DATA[collectionType] || []).length;
    });
    
    // If filtering by tag, show results progressively
    let progressivePhotos = [];
    
    // PARALLEL PROCESSING: Fetch multiple albums at once
    const PARALLEL_LIMIT = 5; // Fetch 5 albums simultaneously
    
    for (const collectionType of allCollections) {
        const albums = ALBUM_DATA[collectionType] || [];
        
        // Process albums in batches
        for (let i = 0; i < albums.length; i += PARALLEL_LIMIT) {
            const batch = albums.slice(i, i + PARALLEL_LIMIT);
            
            // Fetch this batch in parallel
            await Promise.all(batch.map(async (album) => {
                // Skip albums without flickrUrl
                if (!album.flickrUrl) {
                    processedCount++;
                    return;
                }
                
                // Fetch album photos to get tags
                const albumId = extractAlbumId(album.flickrUrl);
                if (!albumId) {
                    processedCount++;
                    console.warn(`Could not extract album ID from: ${album.flickrUrl}`);
                    return;
                }
                
                try {
                    const photos = await fetchFlickrAlbumPhotos(albumId);
                    processedCount++;
                    
                    // Update progress
                    const progressEl = document.getElementById('tags-progress');
                    if (progressEl) {
                        progressEl.textContent = `${processedCount}/${totalAlbums}`;
                    }
                    
                    if (!photos || photos.length === 0) return;
                
                // Process each photo with tags
                photos.forEach(photo => {
                    if (photo.tags && photo.tags.length > 0) {
                        // Add album info to photo
                        const photoWithAlbum = {
                            ...photo,
                            albumTitle: album.title,
                            albumPage: album.albumPage,
                            collection: collectionType
                        };
                        
                        // Store photo globally
                        allPhotosWithTags.push(photoWithAlbum);
                        
                        // Add photo to each of its tags
                        photo.tags.forEach(tag => {
                            if (!allTags.has(tag)) {
                                allTags.set(tag, []);
                            }
                            allTags.get(tag).push(photoWithAlbum);
                            
                            // If we're filtering by this tag, add to progressive display
                            if (tagParam && tag === tagParam) {
                                progressivePhotos.push(photoWithAlbum);
                            }
                        });
                    }
                });
                
                // Update progressive display if filtering by tag
                if (tagParam && progressivePhotos.length > 0) {
                    const resultsTitle = document.getElementById('results-title');
                    const photosGrid = document.getElementById('photos-grid');
                    resultsTitle.textContent = `Photos tagged "${formatTagForDisplay(tagParam)}" (${progressivePhotos.length} found so far...)`;
                    resultsTitle.style.display = 'block';
                    console.log(`Displaying ${progressivePhotos.length} photos for tag "${tagParam}"`);
                    displayPhotosGrid([...progressivePhotos], photosGrid);
                }
                } catch (error) {
                    console.error(`Error fetching tags for album ${albumId}:`, error);
                    processedCount++;
                }
            }));
        }
    }
    
    console.log(`Found ${allTags.size} unique tags across ${allPhotosWithTags.length} photos`);
    
    // Note: Caching disabled - dataset too large for localStorage
    // With 77 albums and 1000+ photos, the data exceeds browser storage limits
    
    // Display all tags
    displayAllTags(allTags);
    
    // Setup search functionality
    setupTagSearch(allTags);
    
    // Re-enable search input
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = 'Search tags, artists, venues...';
        searchInput.style.opacity = '1';
        searchInput.style.cursor = 'text';
    }
    
    // Handle URL parameters
    handleTagPageParameters(urlParams, allTags, tagParam);
}

// Helper function to handle tag page URL parameters
function handleTagPageParameters(urlParams, allTags, tagParam) {
    // Check for search parameter from search modal
    const searchParam = urlParams.get('search');
    if (searchParam) {
        // Trigger search with the query
        const searchInput = document.getElementById('tag-search');
        if (searchInput) {
            searchInput.value = searchParam;
            searchInput.dispatchEvent(new Event('input'));
        }
    }
    
    // If we were filtering by tag, show final results
    if (tagParam && allTags.has(tagParam)) {
        const photos = allTags.get(tagParam);
        const resultsTitle = document.getElementById('results-title');
        resultsTitle.textContent = `Photos tagged "${formatTagForDisplay(tagParam)}" (${photos.length})`;
        
        // Highlight the tag in sidebar
        const tagLinks = document.querySelectorAll('.tag-link');
        tagLinks.forEach(link => {
            if (link.dataset.tag === tagParam) {
                link.style.background = 'rgba(255,255,255,0.3)';
            }
        });
    }
}

function displayAllTags(allTags) {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;
    
    // Sort tags alphabetically for sidebar
    const sortedTags = Array.from(allTags.entries())
        .sort((a, b) => formatTagForDisplay(a[0]).localeCompare(formatTagForDisplay(b[0])));
    
    tagsContainer.innerHTML = '';
    
    sortedTags.forEach(([tag, photos]) => {
        const tagLink = document.createElement('div');
        tagLink.className = 'tag-link';
        tagLink.dataset.tag = tag;
        tagLink.style.cssText = 'padding: 0.6rem 0.8rem; margin-bottom: 0.25rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center;';
        
        const tagName = document.createElement('span');
        tagName.textContent = formatTagForDisplay(tag);
        tagName.style.cssText = 'color: #fff; font-size: 0.9rem;';
        
        const tagCount = document.createElement('span');
        tagCount.textContent = photos.length;
        tagCount.style.cssText = 'color: #999; font-size: 0.85rem; font-weight: 500;';
        
        tagLink.appendChild(tagName);
        tagLink.appendChild(tagCount);
        
        tagLink.onmouseover = () => tagLink.style.background = 'rgba(255,255,255,0.15)';
        tagLink.onmouseout = () => tagLink.style.background = 'rgba(255,255,255,0.05)';
        tagLink.onclick = () => showPhotosForTag(tag, photos);
        
        tagsContainer.appendChild(tagLink);
    });
}

function setupTagSearch(allTags) {
    const searchInput = document.getElementById('tag-search');
    if (!searchInput) return;
    
    // Prepare data for Fuse.js
    const tagsArray = Array.from(allTags.entries()).map(([tag, photos]) => ({
        tag: tag,
        displayTag: formatTagForDisplay(tag),
        normalizedTag: tag.toLowerCase().replace(/\s+/g, ''),
        photos: photos
    }));
    
    // Configure Fuse.js for fuzzy tag search
    const fuseTags = new Fuse(tagsArray, {
        keys: ['tag', 'displayTag', 'normalizedTag'],
        threshold: 0.3, // 0 = exact match, 1 = match anything
        distance: 100,
        minMatchCharLength: 2,
        includeScore: true
    });
    
    // Configure Fuse.js for photo/album search
    const fusePhotos = new Fuse(allPhotosWithTags, {
        keys: ['title', 'albumTitle', 'description'],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
        includeScore: true
    });
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (query === '') {
            // Clear results
            document.getElementById('results-title').style.display = 'none';
            document.getElementById('photos-grid').innerHTML = '';
            return;
        }
        
        const matchingPhotos = [];
        
        // Fuzzy search through tags
        const tagResults = fuseTags.search(query);
        tagResults.forEach(result => {
            matchingPhotos.push(...result.item.photos);
        });
        
        // Fuzzy search through photo titles and descriptions
        const photoResults = fusePhotos.search(query);
        photoResults.forEach(result => {
            matchingPhotos.push(result.item);
        });
        
        // Remove duplicates
        const uniquePhotos = Array.from(new Map(matchingPhotos.map(p => [p.id, p])).values());
        
        // Display results
        showSearchResults(query, uniquePhotos);
    });
}

function showPhotosForTag(tag, photos) {
    const resultsTitle = document.getElementById('results-title');
    const photosGrid = document.getElementById('photos-grid');
    
    resultsTitle.textContent = `Photos tagged "${formatTagForDisplay(tag)}" (${photos.length})`;
    resultsTitle.style.display = 'block';
    
    displayPhotosGrid(photos, photosGrid);
    
    // Scroll to results
    resultsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showSearchResults(query, photos) {
    const resultsTitle = document.getElementById('results-title');
    const photosGrid = document.getElementById('photos-grid');
    
    resultsTitle.textContent = `Search results for "${query}" (${photos.length})`;
    resultsTitle.style.display = 'block';
    
    if (photos.length === 0) {
        photosGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No photos found</p>';
        return;
    }
    
    displayPhotosGrid(photos, photosGrid);
}

// Store current filtered photos for lightbox
let currentFilteredPhotos = [];

function displayPhotosGrid(photos, container) {
    // Store photos globally for lightbox access
    currentFilteredPhotos = photos;
    
    container.innerHTML = photos.map((photo, index) => {
        let description = photo.description ? photo.description.trim() : '';
        
        // Decode HTML entities
        if (description) {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = description;
            description = textarea.value;
        }
        
        return `
            <div class="photo-card" style="cursor: pointer; overflow: visible; height: auto;">
                <div style="position: relative; overflow: hidden; border-radius: 4px; aspect-ratio: 1;" onclick="openTagsLightbox(${index})">
                    <img src="${photo.thumbnail}" alt="${photo.title || 'Photo'}" loading="lazy">
                    <div class="photo-overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                </div>
                ${description ? `<p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ccc; line-height: 1.4; text-align: left; padding: 0 0.25rem;">${description}</p>` : ''}
            </div>
        `;
    }).join('');
}

// Lightbox for tags page
function openTagsLightbox(index) {
    currentAlbumPhotos = currentFilteredPhotos;
    openAlbumLightbox(index);
}

// Search Modal Functions
function openSearchModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('search-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.innerHTML = `
            <div class="search-modal-overlay" onclick="closeSearchModal()"></div>
            <div class="search-modal-content">
                <button class="search-modal-close" onclick="closeSearchModal()">&times;</button>
                <h3 style="color: #fff; margin-bottom: 1rem; font-size: 1.2rem;">Search Photos</h3>
                <form onsubmit="performSearch(event)">
                    <input 
                        type="text" 
                        id="search-modal-input" 
                        placeholder="Search by tag, artist, venue, event..." 
                        style="width: 100%; padding: 1rem; font-size: 1.1rem; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; margin-bottom: 1rem;"
                        autofocus
                    >
                    <button type="submit" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.2); border: none; border-radius: 8px; color: #fff; font-size: 1rem; cursor: pointer; transition: background 0.3s ease;">
                        <i class="fas fa-search"></i> Search
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #search-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            #search-modal.active {
                display: block;
            }
            .search-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(5px);
            }
            .search-modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(20,20,20,0.95);
                padding: 2rem;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            .search-modal-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                color: #fff;
                font-size: 2rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            .search-modal-close:hover {
                opacity: 1;
            }
            #search-modal button[type="submit"]:hover {
                background: rgba(255,255,255,0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    modal.classList.add('active');
    setTimeout(() => {
        document.getElementById('search-modal-input').focus();
    }, 100);
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function performSearch(event) {
    event.preventDefault();
    const query = document.getElementById('search-modal-input').value.trim();
    if (query) {
        // Get base path
        const path = window.location.pathname;
        const basePath = path.includes('/collections/') || path.includes('/music/') || path.includes('/events/') || path.includes('/landscapes/') ? '../' : '';
        
        // Redirect to tags page with search query
        window.location.href = `${basePath}collections/tags.html?search=${encodeURIComponent(query)}`;
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearchModal();
    }
});

// Refresh tags - reloads page to fetch fresh data from Flickr
function refreshTagsCache() {
    console.log('Reloading fresh data from Flickr...');
    window.location.reload();
}

