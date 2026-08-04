// Early theme application (prevents flash)
(function() {
    try {
        var saved = localStorage.getItem('theme');
        var theme;
        if (saved) {
            theme = saved;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme = 'light';
        } else {
            theme = 'dark';
        }
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    } catch (e) {}
})();

// Hi-res token system
const HIRES_TOKEN = '1013';
let hiresMode = false;

function checkHiresAccess() {
    const params = new URLSearchParams(window.location.search);
    hiresMode = params.get('hires') === HIRES_TOKEN;
    return hiresMode;
}

// View tracking
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

// Flickr API configuration
const FLICKR_CONFIG = {
    apiKey: '7d9678338d941743b7b6d33d3559cc30', // Your Flickr API key
    userId: '198613393@N03', // Your Flickr user ID
    // Using public feed (no API key required) or REST API (requires key)
    usePublicFeed: false // Set to false to use REST API with API key
};

// Flickr API helpers

// Extract album ID from Flickr URL
function extractAlbumId(flickrUrl) {
    if (!flickrUrl) return null;
    const match = flickrUrl.match(/albums\/(\d+)/);
    return match ? match[1] : null;
}

// Fetch ALL photos from a Flickr album using pagination
async function fetchFlickrAlbumPhotos(albumId, maxPhotos = 500) {
    if (!FLICKR_CONFIG.apiKey || FLICKR_CONFIG.apiKey === 'YOUR_FLICKR_API_KEY') {
        return null;
    }

    let allPhotos = [];
    let page = 1;
    let totalPages = 1;
    const perPage = 100; // Maximum allowed by Flickr API
    
    
    try {
        do {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_c,url_h,url_o,url_l,url_k,description,tags&format=json&nojsoncallback=1&per_page=${perPage}&page=${page}`;
            
            
            const response = await fetch(url);
            
            const data = await response.json();
            
            if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
                // Update total pages from first response
                if (page === 1) {
                    totalPages = data.photoset.pages;
                }
                
                const pagePhotos = data.photoset.photo.map(photo => {
                    // Debug: Log raw tag data from first photo
                    if (data.photoset.photo.indexOf(photo) === 0 && photo.tags) {
                    }
                    
                    return {
                        id: photo.id,
                        title: photo.title,
                        description: photo.description ? photo.description._content : '',
                        tags: photo.tags ? photo.tags.split(' ') : [],
                        thumbnail: photo.url_c || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`,
                        large: photo.url_k || photo.url_h || photo.url_l || photo.url_o || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                        original: photo.url_o || photo.url_k || null,
                        url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
                    };
                });
                
                allPhotos = allPhotos.concat(pagePhotos);
                
                page++;
            } else {
                console.error('Flickr API error:', data.message || 'Unknown error');
                
                // Try alternative method for older albums
                return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
            }
        } while (page <= totalPages && allPhotos.length < maxPhotos);
        
        return allPhotos;
        
    } catch (error) {
        console.error('Error fetching Flickr photos:', error);
        
        // Try alternative method for older albums
        return await fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos);
    }
}

// Alternative method for older Flickr albums with pagination
async function fetchFlickrAlbumPhotosAlternative(albumId, maxPhotos = 500) {
    
    let allPhotos = [];
    let page = 1;
    let totalPages = 1;
    const perPage = 100;
    
    try {
        do {
            const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_s,url_m,url_l,url_o,description,tags&format=json&nojsoncallback=1&per_page=${perPage}&page=${page}`;
            
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.stat === 'ok' && data.photoset && data.photoset.photo) {
                if (page === 1) {
                    totalPages = data.photoset.pages;
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
                
                page++;
            } else {
                console.error('Alternative method failed:', data.message || 'Unknown error');
                return null;
            }
        } while (page <= totalPages && allPhotos.length < maxPhotos);
        
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
    const url = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${FLICKR_CONFIG.apiKey}&photoset_id=${albumId}&extras=url_z,url_c&format=json&nojsoncallback=1&per_page=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.stat === 'ok' && data.photoset.photo.length > 0) {
            const photo = data.photoset.photo[0];
            // Prefer url_z (640px) - plenty for a grid thumbnail, much lighter than url_b/url_c
            return photo.url_z || photo.url_c || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_z.jpg`;
        }
        return null;
    } catch (error) {
        console.error('Error fetching album cover:', error);
        return null;
    }
}

// Lightbox
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
        document.body.classList.add('lightbox-open');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const shareMenu = document.getElementById('lightbox-share-menu');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.body.classList.remove('lightbox-open');
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
        
        // Track photo view in Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'photo_view', {
                'photo_id': photo.id,
                'photo_title': photo.title,
                'photo_position': currentLightboxIndex + 1
            });
        }
        
        // Determine image quality based on hires mode
        const imageUrl = hiresMode ? (photo.original || photo.large) : (photo.thumbnail || photo.large);
        lightboxImg.src = imageUrl;
        
        // Inject watermark and download link into share menu
        const lightboxContent = lightboxImg.closest('.lightbox-content');
        if (lightboxContent) {
            // Inject watermark if not present
            let watermark = lightboxContent.querySelector('.lightbox-watermark');
            if (!watermark) {
                watermark = document.createElement('div');
                watermark.className = 'lightbox-watermark';
                watermark.textContent = 'Jayne Clamp';
                lightboxContent.appendChild(watermark);
            }
            watermark.style.display = hiresMode ? 'none' : 'block';
            
            // Inject download link into share menu if not present
            const shareMenu = document.getElementById('lightbox-share-menu');
            if (shareMenu) {
                let downloadLink = shareMenu.querySelector('.lightbox-download-link');
                if (!downloadLink) {
                    downloadLink = document.createElement('a');
                    downloadLink.className = 'lightbox-download-link';
                    downloadLink.href = '#';
                    downloadLink.innerHTML = '<i class="fas fa-download"></i>';
                    downloadLink.title = 'Download';
                    shareMenu.appendChild(downloadLink);
                }
                // Store current photo URL for download handler
                downloadLink.dataset.downloadUrl = imageUrl;
                downloadLink.dataset.downloadName = photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_') + '.jpg' : 'photo.jpg';
                // Remove old handler and add new one with current URL
                const newLink = downloadLink.cloneNode(true);
                newLink.dataset.downloadUrl = imageUrl;
                newLink.dataset.downloadName = photo.title ? photo.title.replace(/[^a-z0-9]/gi, '_') + '.jpg' : 'photo.jpg';
                downloadLink.parentNode.replaceChild(newLink, downloadLink);
                newLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = this.dataset.downloadUrl;
                    const filename = this.dataset.downloadName;
                    // Fetch the image as a blob and trigger download
                    fetch(url)
                        .then(response => response.blob())
                        .then(blob => {
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                        })
                        .catch(err => {
                            // Fallback: open in new tab
                            window.open(url, '_blank');
                        });
                });
            }
        }
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

let lightboxNavigationThrottle = false;
const LIGHTBOX_THROTTLE_DELAY = 300; // 300ms delay to prevent rapid clicking

function nextLightboxImage() {
    if (lightboxNavigationThrottle) return;
    
    lightboxNavigationThrottle = true;
    currentLightboxIndex = (currentLightboxIndex + 1) % lightboxPhotos.length;
    showLightboxImage();
    
    setTimeout(() => {
        lightboxNavigationThrottle = false;
    }, LIGHTBOX_THROTTLE_DELAY);
}

function prevLightboxImage() {
    if (lightboxNavigationThrottle) return;
    
    lightboxNavigationThrottle = true;
    currentLightboxIndex = (currentLightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    showLightboxImage();
    
    setTimeout(() => {
        lightboxNavigationThrottle = false;
    }, LIGHTBOX_THROTTLE_DELAY);
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
    
    // Use jayneclamp.com domain with current path + photo index
    const pagePath = window.location.pathname;
    const baseUrl = `https://jayneclamp.com${pagePath}`;
    const pageUrl = baseUrl;
    const photoUrl = `${baseUrl}#photo-${currentLightboxIndex}`;
    
    const photoTitle = currentPhoto.title || 'Photo';
    const albumTitle = document.querySelector('.page-title')?.textContent || 'Photo Album';
    
    let shareUrl = '';
    
    switch(platform) {
        case 'instagram':
            // Instagram doesn't support direct URL sharing, copy link instead
            copyToClipboard(photoUrl);
            break;
        case 'threads':
            shareUrl = `https://threads.net/intent/post?text=${encodeURIComponent(albumTitle + ' - ' + photoUrl)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}`;
            break;
        case 'bluesky':
            shareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(albumTitle + ' - ' + photoUrl)}`;
            break;
        case 'copy':
            copyToClipboard(photoUrl);
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
    
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
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

// Right-click protection (public mode)
document.addEventListener('contextmenu', function(e) {
    if (!hiresMode) {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.style.display === 'flex') {
            if (e.target.id === 'lightbox-img' || e.target.closest('.lightbox-content')) {
                e.preventDefault();
            }
        }
    }
});

document.addEventListener('dragstart', function(e) {
    if (!hiresMode) {
        if (e.target.id === 'lightbox-img') {
            e.preventDefault();
        }
    }
});

// Check for hires access on page load
checkHiresAccess();

// Mobile menu toggle
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

// Social sharing
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

function shareToBluesky() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out Jayne Clamp Photography');
    window.open(`https://bsky.app/intent/compose?text=${text}%20${url}`, '_blank', 'width=600,height=400');
}

// Manual album configuration
// Simply add your Flickr album URLs and info here
const ALBUM_DATA = {
    music: [
        // Add your music albums here - example format:
        // { title: 'Concert Name', photoCount: 24, flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/ALBUM_ID' }
        {
            title: '2026-07-17 Cinemechanica @ 40 Watt | Athens, GA',
            photoCount: 20,
            coverUrl: 'https://live.staticflickr.com/65535/55417140995_6ef73db582_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334844213/',
            albumPage: '../music/2026-07-17-cinemechanica-40-watt-athens-ga.html',
            filterNames: ['Cinemechanica'],
            videos: [
                {
                    title: 'Get Out of Here Hitler',
                    youtubeId: '_cnSf8OnY4E',
                    tags: ['cinemechanica', '40watt', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2026-07-17 Tiger Bear Wolf @ 40 Watt | Athens, GA',
            photoCount: 20,
            coverUrl: 'https://live.staticflickr.com/65535/55415732952_fd036d8f91_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334852879/',
            albumPage: '../music/2026-07-17-tiger-bear-wolf-40-watt-athens-ga.html',
            filterNames: ['Tiger Bear Wolf'],
        },
        {
            title: '2026-07-17 Real Wow @ 40 Watt | Athens, GA',
            photoCount: 14,
            coverUrl: 'https://live.staticflickr.com/65535/55415722222_ddf0ca8c5b_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334823075/',
            albumPage: '../music/2026-07-17-real-wow-40-watt-athens-ga.html',
            filterNames: ['Real Wow'],
        },
        {
            title: '2026-06-16 Hayride @ Nowhere Bar | Athens, GA',
            photoCount: 30,
            coverUrl: 'https://live.staticflickr.com/65535/55436683308_73d3ae13f5_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334944977/',
            albumPage: '../music/2026-06-16-hayride-nowhere-bar-athens-ga.html',
        },
        {
            title: '2026-06-06 Patterson Hood @ Amplify Decatur | Decatur, GA',
            photoCount: 15,
            coverUrl: 'https://live.staticflickr.com/65535/55436988935_06347d9090_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334949651/',
            albumPage: '../music/2026-06-06-patterson-hood-amplify-decatur-decatur-ga.html',
            filterNames: ['Patterson Hood'],
        },
        {
            title: '2026-06-28 Carl Broemel & Tyler Ramsey @ Hull St Stage | AthFest',
            photoCount: 14,
            coverUrl: 'https://live.staticflickr.com/65535/55417136675_4b49a179ef_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334844203/',
            albumPage: '../music/2026-06-28-carl-broemel-tyler-ramsey-athfest-athens-ga.html',
            filterNames: ['Carl Broemel', 'Tyler Ramsey', 'AthFest'],
            manualTags: ['Carl Broemel', 'Tyler Ramsey', 'AthFest'],
        },
        {
            title: '2026-05-11 Steve Wynn & Peter Buck @ Rialto Room | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55293605061_6a145cae72_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333846615/',
            albumPage: '../music/2026-05-11-steve-wynn-peter-buck-rialto-room-athens-ga.html',
            filterNames: ['Steve Wynn', 'Peter Buck'],
        },
        {
            title: '2026-06-27 Slightly Famous Somebodies @ 40 Watt | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55374382355_a2de9ba8bf_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334541834/',
            albumPage: '../music/2026-06-27-slightly-famous-somebodies-40-watt-athfest-night-2-athens-ga.html',
            filterNames: ['Slightly Famous Somebodies', '40 Watt', 'AthFest'],
        },
        {
            title: '2026-06-27 Kevn Kinney & Peter Buck @ 40 Watt | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55374151249_3905f364c4_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334514935/',
            albumPage: '../music/2026-06-27-kevn-kinney-peter-buck-40-watt-athfest-night-2-athens-ga.html',
            filterNames: ['Kevn Kinney', 'Peter Buck', '40 Watt', 'AthFest'],
        },
        {
            title: '2026-06-27 Bloodkin @ Georgia Theatre | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55373009402_b2bf894401_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334514775/',
            albumPage: '../music/2026-06-27-bloodkin-georgia-theatre-athfest-night-2-athens-ga.html',
            filterNames: ['Bloodkin', 'Georgia Theatre', 'AthFest'],
        },
        {
            title: '2026-06-27 Bland Halen @ Nowhere Bar | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55374004796_4e834b3a4a_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334534283/',
            albumPage: '../music/2026-06-27-bland-halen-nowhere-bar-athfest-night-2-athens-ga.html',
            filterNames: ['Bland Halen', 'Nowhere Bar', 'AthFest'],
        },
        {
            title: '2026-06-27 The Arcs @ Nowhere Bar | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55374237519_d917e28f98_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334516992/',
            albumPage: '../music/2026-06-27-the-arcs-nowhere-bar-athfest-night-2-athens-ga.html',
            filterNames: ['The Arcs', 'Nowhere Bar', 'AthFest'],
        },
        {
            title: '2026-06-27 Wieuca @ Nowhere Bar | AthFest',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334844283/',
            coverUrl: 'https://live.staticflickr.com/65535/55417157470_dc41d15c10_z.jpg',
            albumPage: '../music/2026-06-27-wieuca-nowhere-bar-athfest-night-2-athens-ga.html',
            filterNames: ['Wieuca', 'Nowhere Bar', 'AthFest'],
        },
        {
            title: '2026-06-26 Scattrbrain @ 40 Watt | AthFest',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334819695/',
            albumPage: '../music/2026-06-26-scattrbrain-40-watt-athfest-athens-ga.html',
            filterNames: ['Scattrbrain', '40 Watt', 'AthFest'],
        },
        {
            title: '2026-06-26 Heffner @ 40 Watt | AthFest',
            photoCount: 15,
            coverUrl: 'https://live.staticflickr.com/65535/55415812882_c1a08f1d0f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334823565/',
            albumPage: '../music/2026-06-26-heffner-40-watt-athfest-athens-ga.html',
            filterNames: ['Heffner', '40 Watt', 'AthFest'],
        },
        {
            title: '2026-06-26 Mountain of Youth @ Georgia Theatre Rooftop | AthFest',
            photoCount: 19,
            coverUrl: 'https://live.staticflickr.com/65535/55417188550_a27b1f16bb_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334828347/',
            albumPage: '../music/2026-06-26-mountain-of-youth-georgia-theatre-rooftop-athfest-athens-ga.html',
            filterNames: ['Mountain of Youth', 'Georgia Theatre Rooftop', 'AthFest'],
        },
        {
            title: '2026-06-26 Lilly Hiatt @ Georgia Theatre | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55373144512_c774ff7b9c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334517262/',
            albumPage: '../music/2026-06-27-lilly-hiatt-georgia-theatre-athfest-night-1-athens-ga.html',
            filterNames: ['Lilly Hiatt', 'Georgia Theatre', 'AthFest'],
        },
        {
            title: '2026-06-26 Spencer Thomas @ Georgia Theatre Rooftop | AthFest',
            coverUrl: 'https://live.staticflickr.com/65535/55374441678_7de0d28f68_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334519187/',
            albumPage: '../music/2026-06-27-spencer-thomas-ga-theatre-rooftop-athfest-night-1-athens-ga.html',
            filterNames: ['Spencer Thomas', 'Georgia Theatre Rooftop', 'AthFest'],
        },
        {
            title: '2026-05-10 Red Dwarf Star @ World Famous | Athens, GA!',
            coverUrl: 'https://live.staticflickr.com/65535/55293776164_1997dd8cfa_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333846185/',
            albumPage: '../music/2026-05-10-red-dwarf-star-world-famous-athens-ga.html',
            filterNames: ['Red Dwarf Star'],
        },
        {
            title: '2026-05-10 Real Wow @ World Famous | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55293698008_d8c4682866_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333844332/',
            albumPage: '../music/2026-05-10-real-wow-world-famous-athens-ga.html',
            filterNames: ['Real Wow'],
        },
        {
            title: '2026-05-09 Kindercore 30 Expo Night 3 @ 40 Watt | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55293808561_d35908a526_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333875019/',
            albumPage: '../music/2026-05-09-kindercore-30-expo-night-3-40-watt-athens-ga.html',
            filterNames: ['Kindercore 30', 'Maserati', 'Shehehe', 'Vincas', 'Gentleman Jesse', 'Black Nerd Ninja', 'Big Trouble', "Molly's Lips"],
        },
        {
            title: '2026-05-07 Kindercore 30 Expo Night 1 @ 40 Watt | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55295391375_2fc5b491a6_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333856975/',
            albumPage: '../music/2026-05-07-kindercore-30-expo-night-1-40-watt-athens-ga.html',
            filterNames: ['The Pink Stones', 'Dog Person', 'Japancakes', 'Grape Soda', 'Man or Astro-Man?', 'Peter Buck'],
        },
        {
            title: '2026-04-24 Robyn Hitchcock & Emma Swift @ 40 Watt | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55236454222_b264ce1de1_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333365621/',
            albumPage: '../music/2026-04-24-robyn-hitchcock-emma-swift-40-watt-athens-ga.html',
            filterNames: ['Robyn Hitchcock', 'Emma Swift'],
        },
        {
            title: '2026-04-11 Drivin N Cryin @ 40 Watt | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55216349343_e96e54fe75_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333192494/',
            albumPage: '../music/2026-04-11-drivin-n-cryin-40-watt-athens-ga.html',
            filterNames: ['Drivin N Cryin', 'Kevn Kinney', 'Tim Nielsen', 'R.S. Field'],
            manualTags: ['drivinncryin', 'kevnkinney', '40wattclub', 'athensga', 'athensgamusic', 'livemusic', 'southernrock'],
            videos: [
                {
                    title: 'Crazy Train & Fly Me Courageous',
                    youtubeId: 'dOsZnWTenDk',
                    tags: ['drivinncryin', 'kevnkinney', '40wattclub', 'athensga', 'athensgamusic', 'livemusic', 'southernrock']
                }
            ],
        },
        {
            title: '2026-03-21 Don Chambers & Julia Barfield @ Dead Beat Club | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55179206795_eeb8624a3a_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332815161/', 
            albumPage: '../music/2026-03-21-don-chambers-julia-barfield-dead-beat-club-athens-ga.html', 
            filterNames: ['Don Chambers', 'Julia Barfield'] 
        },
        { 
            title: '2026-03-13 Bloodkin @ Holly Theatre | Dahlonega', 
            coverUrl: 'https://live.staticflickr.com/65535/55152604660_df16339702_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332563345/', 
            albumPage: '../music/2026-03-13-bloodkin-holly-theatre-dahlonega-ga.html' 
        },
        { 
            title: '2026-03-11 Gary Numan @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55156289332_b6e63eea51_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332613305/', 
            albumPage: '../music/2026-03-11-gary-numan-40-watt-athens-ga.html' 
        },
        { 
            title: '2026-03-07 Infinite Favors @ Dead Beat Club | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55157804249_bcebf05b10_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332616190/', 
            albumPage: '../music/2026-03-07-infinite-favors-dead-beat-club-athens-ga.html', 
            filterNames: ['Andrew Prater'] 
        },
        { 
            title: '2026-03-07 Bursters @ Dead Beat Club | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55157904590_039305dd24_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332649564/', 
            albumPage: '../music/2026-03-07-bursters-dead-beat-club-athens-ga.html' 
        },
        { 
            title: '2026-03-07 Johann Greco @ Dead Beat Club | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55157514161_8317d696e8_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332649474/', 
            albumPage: '../music/2026-03-07-johann-greco-dead-beat-club-athens-ga.html' 
        },
        { 
            title: '2026-02-26 Michael Shannon, Jason Narducy & Friends @ 40 Watt | Athens, GA',
            photoCount: 23,
            coverUrl: 'https://live.staticflickr.com/65535/55131421835_a8a27c4b56_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332369426/',
            albumPage: '../music/2026-02-26-michael-shannon-jason-narducy-friends-40-watt-athens-ga.html',
            filterNames: ['Michael Shannon', 'Jason Narducy', 'REM', 'Peter Buck', 'Bill Berry', 'Scott McCaughey', 'Vanessa Briscoe Hay', 'Linda Hopper', 'Bobcat Goldthwait'],
            videos: [
                {
                    title: 'Nightswimming (R.E.M.)',
                    youtubeId: 'PWfJojzOEcQ',
                    tags: ['michaelshannon', 'jasonnarducy', 'rem', 'peterbuck', '40watt', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2026-02-25 Kevn Kinney & Peter Buck @ Rialto Room | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55116883952_54ea7b58e6_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332257799/',
            albumPage: '../music/2026-02-25-kevn-kinney-peter-buck-rialto-room-athens-ga.html',
            filterNames: ['Kevn Kinney', 'Peter Buck', 'Scott McCaughey', 'Elizabeth Cook', 'Jason Narducy'],
        },
        { 
            title: '2026-02-16 Drink the Sea @ 40 Watt | Athens, GA', 
            photoCount: 25,
            coverUrl: 'https://live.staticflickr.com/65535/55131608744_423b7d251f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332367660/',
            albumPage: '../music/2026-02-16-drink-the-sea-40-watt-athens-ga.html',
            filterNames: ['Drink the Sea']
        },
        { 
            title: '2026-02-14 Florry @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55138490577_1c0a22249c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332461018/', 
            albumPage: '../music/2026-02-14-florry-40-watt-athens-ga.html' 
        },
        { 
            title: '2026-02-13 The Lanes @ 40 Watt | Athens GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55157889885_9c3cbe93fa_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332622026/', 
            albumPage: '../music/2026-02-13-the-lanes-40-watt-athens-ga.html' 
        },
        { 
            title: '2026-02-13 Camp Amped Band @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55159380930_9845a286ec_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332630290/', 
            albumPage: '../music/2026-02-13-camp-amped-band-40-watt-athens-ga.html' 
        },
        { 
            title: '2026-02-11 MJ Lenderman @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55159643860_706230d80d_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332632425/', 
            albumPage: '../music/2026-02-11-mj-lenderman-40-watt-athens-ga.html' 
        },
        { 
            title: '2026-01-17 Bit Brigade @ Georgia Theatre | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55051103586_3630ed24e3_z.jpg',
            flickrUrl: 'https://flickr.com/photos/jayneclamp/albums/72177720331551762/',
            albumPage: '../music/2026-01-17-bit-brigade-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2026-01-12 Kevn Kinney & Peter Buck @ Rialto Room | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55051084731_676e94a58c_z.jpg',
            flickrUrl: 'https://flickr.com/photos/jayneclamp/albums/72177720331551582',
            albumPage: '../music/2026-01-12-kevn-kinney-peter-buck-rialto-room-athens-ga.html'
        },
        { 
            title: '2025-12-19 Bloodkin & Friends @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55050217367_32065cb1dd_z.jpg',
            flickrUrl: 'https://flickr.com/photos/jayneclamp/albums/72177720331586579/',
            albumPage: '../music/2025-12-19-bloodkin-friends-40-watt-athens-ga.html'
        },
        { 
            title: '2025-12-19 Kevn Kinney @ 40 Watt | Athens, GA', 
            coverUrl: 'https://live.staticflickr.com/65535/55051366749_419ef77a87_z.jpg',
            flickrUrl: 'https://flickr.com/photos/jayneclamp/albums/72177720331551807/',
            albumPage: '../music/2025-12-19-kevn-kinney-40-watt-athens-ga.html'
        },
        { 
            title: '2025-12-12 Nuci’s Space 25th Anniversary @ Georgia Theatre | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55051739731_c6285abdec_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720331578173/',
            albumPage: '../music/2025-12-12-nucis-space-25th-anniversary-georgia-theatre-athens-ga.html',
            filterNames: ['Claire Campbell', 'Patterson Hood', 'Jay Gonzalez', 'David Barbe', 'Julia Barfield', 'Kevn Kinney', 'Women in STEM', 'Annie Leeth', 'Faye Webster', 'Modern Skirts', 'Willow Avalon', 'Betsy Franck', 'Kyshona Armstrong', 'Elf Power'],
            relateOnAnyArtist: true
        },
        { 
            title: '2025-11-11 Jerry Joseph & the Jackmormons @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330299990/',
            coverUrl: 'https://live.staticflickr.com/65535/54922647191_6b0fe32e37_z.jpg',
            albumPage: '../music/2025-11-11-jerry-joseph-jackmormons-nowhere-bar-athens-ga.html'
        },
        {
            title: '2025-12-12 Heartbreakers @ Nowhere Bar | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55140694366_cbc8dcf19b_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332485984/',
            albumPage: '../music/2025-12-12-heartbreakers-nowhere-bar-athens-ga.html',
            filterNames: ['Heartbreakers'],
        },
        { 
            title: '2025-11-02 Paul McCartney @ State Farm Arena | Atlanta, GA', 
            photoCount: 16, 
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/BTMsMZICnNQ/oar2.jpg?sqp=-oaymwEoCJUDENAFSFqQAgHyq4qpAxcIARUAAIhC2AEB4gEKCBgQAhgGOAFAAQ==&rs=AOn4CLCd17tCVjHmnICrdwhh_aNE1TIFZw',
            albumPage: '../music/2025-11-02-paul-mccartney-state-farm-arena-videos.html',
            manualTags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts'],
            videos: [
                {
                    title: 'Let Me Roll It',
                    youtubeId: 'QPijHe46C-U',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Live and Let Die',
                    youtubeId: '10tI_Kgb3HE',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Ob-La-Di, Ob-La-Da',
                    youtubeId: 'aBBR-O-DlIs',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'The End (Partial Song)',
                    youtubeId: 'HDexMvOO2Jo',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Love Me Do (Partial Song)',
                    youtubeId: 'iPZFpEtpfNA',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Lady Madonna II',
                    youtubeId: 'TiRLWf5z2b4',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Helter Skelter (Partial Song)',
                    youtubeId: 'DEwqv66d1Cg',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Band On The Run (Partial Song)',
                    youtubeId: 'dI43f6O6pPI',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Entrance',
                    youtubeId: 'RQatK1gFMpo',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'In Spite Of All The Danger (Partial)',
                    youtubeId: '1AxUHooisg8',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Here Today (Partial Song)',
                    youtubeId: 'n5U4x9AjckI',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Paul McCartney & band @ State Farm Arena',
                    youtubeId: 'BTMsMZICnNQ',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'First Exit',
                    youtubeId: 'xZZVPWeV6mM',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                },
                {
                    title: 'Final Exit',
                    youtubeId: 'IjAUBDnzUUU',
                    tags: ['atlanta', 'paulmccartney', 'statefarmarena', 'thebeatles', 'livemusic', 'atlantaconcerts']
                }
            ]
        },
        { 
            title: '2025-10-19 Porchfest | Athens, GA',
            photoCount: 12, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/',
            coverUrl: 'https://live.staticflickr.com/65535/54876264980_887cfb1a8e_z.jpg',
            albumPage: '../music/2025-10-19-porchfest-athens-ga.html'
        },
        { 
            title: '2025-09-21 Vincas @ Hendershots | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'https://live.staticflickr.com/65535/54876776442_e83e6eea26_z.jpg',
            albumPage: '../music/2025-09-21-vincas-hendershots-athens-ga.html'
        },
        { 
            title: '2025-09-27 The Pink Stones @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330721156/',
            coverUrl: 'https://live.staticflickr.com/65535/54964574971_37c1c3ac60_z.jpg',
            albumPage: '../music/2025-09-27-the-pink-stones-flicker-athens-ga.html'
        }, 
        { 
            title: '2025-09-12 The Minus 5 & The Baseball Project @ 40 Watt | Athens, GA', 
            photoCount: 18, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329875831/',
            coverUrl: 'https://live.staticflickr.com/65535/54876815267_9522dcb508_z.jpg',
            albumPage: '../music/2025-09-12-the-minus-5-the-baseball-project-40-watt-athens-ga.html'
        },
        { 
            title: '2025-09-10 Hayride @ Cine | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54947420774_059b0ffca9_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330564193/',
            albumPage: '../music/2025-09-10-hayride-cine-athens-ga.html'
        },
        { 
            title: '2025-09-07 Kevn Kinney & Peter Buck w Mike Mills @ Rialto Room | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329937140/',
            coverUrl: 'https://live.staticflickr.com/65535/54884771341_77e9aab1de_z.jpg',
            albumPage: '../music/2025-09-07-kevn-kinney-peter-buck-w-mike-mills-rialto-room-athens-ga.html'
        },
        { 
            title: '2025-09-06 James McMurtry @ 40 Watt | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329884840/',
            coverUrl: 'https://live.staticflickr.com/65535/54879107350_abf530c13c_z.jpg',
            albumPage: '../music/2025-09-06-james-mcmurtry-40-watt-athens-ga.html'
        }, 
        { 
            title: '2025-09-06 Bonnie Whitmore @ 40 Watt | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329939306/',
            coverUrl: 'https://live.staticflickr.com/65535/54879063564_ddbc9002e1_z.jpg',
            albumPage: '../music/2025-09-06-bonnie-whitmore-40-watt-athens-ga.html'
        }, 
        { 
            title: '2025-08-30 Sam Holt Band "Remembering Mikey & Todd" @ Live Wire | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329945912/',
            coverUrl: 'https://live.staticflickr.com/65535/54884859086_7ab1e2877e_z.jpg',
            filterNames: ['Sam Holt Band', 'Sunny Ortiz'],
            albumPage: '../music/2025-08-30-sam-holt-band-remembering-mikey-todd-live-wire-athens-ga.html'
        },
        { 
            title: '2025-08-29 Pull Chains @ Ideal Bagels | Athens, GA', 
            photoCount: 13, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330722597/',
            coverUrl: 'https://live.staticflickr.com/65535/54964943969_726bbedd7e_z.jpg',
            albumPage: '../music/2025-08-29-pull-chains-ideal-bagels-athens-ga.html'
        },
        { 
            title: '2025-08-29 Infinite Favors @ Ideal | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54953586548_9545345316_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330612052/',
            albumPage: '../music/2025-08-29-infinite-favors-ideal-athens-ga.html', 
            filterNames: ['Andrew Prater']
        },
        { 
            title: '2025-08-29 Honeypuppy @ Ideal | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54956484694_919333ea09_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330652593/',
            albumPage: '../music/2025-08-29-honeypuppy-ideal-athens-ga.html'
        },
        { 
            title: '2025-05-31 Vincas @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329969689/',
            coverUrl: 'https://live.staticflickr.com/65535/54885354709_e2e51bf9a2_z.jpg',
            albumPage: '../music/2025-05-31-vincas-nowhere-bar-athens-ga.html'
        },
         { 
            title: '2025-05-31 Johnny Falloon @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329948432/',
            coverUrl: 'https://live.staticflickr.com/65535/54885173011_ee959a91b3_z.jpg',
            albumPage: '../music/2025-05-31-johnny-falloon-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2025-05-29 Abe Partridge @ Rialto Room | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54954749934_a9ab1bb9e3_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330621212/',
            filterNames: ['Abe Partridge', 'David Barbe', 'Steve Shelley'],
            albumPage: '../music/2025-05-29-abe-partridge-rialto-room-athens-ga.html'
        },
        { 
            title: '2025-05-21 Tommy Stinson & Karla Rose @ Cine | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54960790421_d1dcc2d7f6_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330675235/',
            albumPage: '../music/2025-05-21-tommy-stinson-karla-rose-cine-athens-ga.html'
        },
        { 
            title: '2025-05-26 Patterson Hood @ Lakeside Jam | Milledgeville, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54956121983_2b5bf7b687_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330649268/',
            albumPage: '../music/2025-05-26-patterson-hood-lakeside-jam-milledgeville-ga.html'
        },
        { 
            title: '2025-05-31 Rauncher @ Nowhere Bar | Athens, GA', 
            photoCount: 1, 
            coverUrl: 'https://live.staticflickr.com/65535/54885443589_d64f40f294_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/54885443589/'
        },
        { 
            title: '2023-06-24 The Pink Stones @ Athfest | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330439979/',
            coverUrl: 'https://live.staticflickr.com/65535/54932541592_d6f12e6bdf_z.jpg',
            albumPage: '../music/2023-06-24-pink-stones-athfest-athens-ga.html'
        },
        { 
            title: '2021-06-05 Jay Gonzalez @ Liberty Field | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330410616/',
            coverUrl: 'https://live.staticflickr.com/65535/54933682333_3f00e98099_z.jpg',
            albumPage: '../music/2021-06-05-jay-gonzalez-liberty-field-athens-ga.html'
        },
        {
            title: '2021-09-16 Addie Tonic @ Southern Brewing Co | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54915085775_242f7af6fe_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330244008/',
            albumPage: '../music/2021-09-16-addie-tonic-southern-brewing-co-athens-ga.html',
            filterNames: ['Addie Tonic'],
        },
        { 
            title: '2025-02-27 Kevn Kinney, Lenny Kaye, Peter Buck, Mike Mills @ Rialto Room | Athens, GA',
            photoCount: 3,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205156/',
            coverUrl: 'https://live.staticflickr.com/65535/54364334221_4a08118231_z.jpg',
            albumPage: '../music/2025-02-27-kevn-kinney-lenny-hayes-peter-buck-mike-mills-rialto-room-athens-ga.html',
            videos: [
                {
                    title: 'Honeysuckle Blue',
                    youtubeId: '34LFotDbyFA',
                    tags: ['kevnkinney', 'lennykaye', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    title: 'Ghost Dance',
                    youtubeId: 'mAPQsLxZt7Q',
                    tags: ['kevnkinney', 'lennykaye', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2025-07-07 Kevn Kinney, Peter Buck & David Barbe @ Rialto Room | Athens, GA',
            photoCount: 1,
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/mX6wkiLh_-Y/maxresdefault.jpg',
            albumPage: '../music/2025-07-07-kevn-kinney-peter-buck-david-barbe-rialtoroom-athens-ga.html',
            filterNames: ['Kevn Kinney', 'Peter Buck', 'David Barbe'],
            manualTags: ['kevnkinney', 'peterbuck', 'davidbarbe', 'rialto', 'athensga', 'athensgamusic', 'livemusic', 'driventruckers'],
            videos: [
                {
                    youtubeId: 'mX6wkiLh_-Y',
                    title: 'Kevn Kinney, Peter Buck & David Barbe @ Rialto Room 2025-07-07',
                    tags: ['kevnkinney', 'peterbuck', 'davidbarbe', 'rialto', 'athensga', 'athensgamusic', 'livemusic', 'driventruckers']
                }
            ],
        },
        { 
            title: '2025-02-17 Classic City Wrestling w Drive By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324198785/',
            coverUrl: 'https://live.staticflickr.com/65535/54363416132_5f542d9cae_z.jpg',
            albumPage: '../music/2025-02-17-classic-city-wrestling-w-drive-by-truckers-athens-ga.html'
        }, 
        { 
            title: '2025-02-15 Drive By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54363516592_1689c9d9ef_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324235638/',
            albumPage: '../music/2025-02-15-drive-by-truckers-40-watt-homecoming-athens-ga.html'
        },
        { 
            title: '2025-02-27 Michael Shannon, Jason Narducy & Friends @ 40 Watt | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54364546979_4b18efdd91_z.jpg', 
            photoCount: 22,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205246/',
            albumPage: '../music/2025-02-27-michael-shannon-jason-narducy-friends-rem-tribute-40-watt-athens-ga.html',
            filterNames: ['Michael Shannon', 'Jason Narducy', 'REM']
        },
        { 
            title: '2025-03-29 A Celebration of the Joyful Life of W. Cullen Hart @ 40 Watt | Athens, GA', 
            photoCount: 24, 
            coverUrl: 'https://live.staticflickr.com/65535/54941997732_6716282897_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330509701/',
            albumPage: '../music/2025-03-29-w-cullen-hart-celebration-40-watt-athens-ga.html',
            filterNames: ['Elf Power', 'Giant Day', 'Marshmallow Coast', 'Heather McIntosh', 'Scott Spillane', 'Robert Schneider', 'Max Schneider', 'The Apples in Stereo', 'The Rishis', 'Jason NeSmith', 'John Kiran Fernandes', 'Robbee Cucchiaro', 'John Ferguson', 'Laura Carter', 'Peter Erchick', 'Franklin Russell', 'Peter Alvanos', 'Derek Almstead', 'Emily Growden', 'Ryan Bousqet', 'Eric Allen', 'John Hill', 'Gary Olsen', 'Kris Deason']
        },
        { 
            title: '2025-03-26 Patterson Hood & the Sensurrounders @ Terminal West | Atlanta, GA', 
            photoCount: 25, 
            coverUrl: 'https://live.staticflickr.com/65535/54940218808_f74ca2168f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330484627/',
            albumPage: '../music/2025-03-26-patterson-hood-sensurrounders-terminal-west-atlanta-ga.html'
        },
        { 
            title: '2025-03-05 Eric Carter & Scotty Nicholson @ Nowhere Bar | Athens, GA', 
            photoCount: 8, 
            coverUrl: 'https://live.staticflickr.com/65535/54940841323_cc6a7dd82c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330505783/',
            albumPage: '../music/2025-03-05-eric-carter-scotty-nicholson-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2025-03-15 Thick Lizzy @ The The Foundry | Athens, GA', 
            photoCount: 17, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330715001/',
            coverUrl: 'https://live.staticflickr.com/65535/54964190490_7402f5bdf8_z.jpg',
            albumPage: '../music/2025-03-15-thick-lizzy-foundry-athens-ga.html'
        },
        { 
            title: '2025-04-04 David Lowery @ Cobham Triangle Park | Athens, GA', 
            photoCount: 5, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330474041/',
            coverUrl: 'https://live.staticflickr.com/65535/54938296652_1fdd68fb7f_z.jpg',
            albumPage: '../music/2025-04-04-david-lowery-cobham-triangle-park-athens-ga.html'
        },
        { 
            title: '2025-04-04 Kit @ Cobham Triangle Park | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330469810/',
            coverUrl: 'https://live.staticflickr.com/65535/54939458499_fdae0da7fa_z.jpg',
            albumPage: '../music/2025-04-04-kit-cobham-triangle-park-athens-ga.html'
        },
        { 
            title: '2025-04-03 Gillian Welch & David Rawlings @ Classic Center | Athens, GA', 
            photoCount: 3, 
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/Qg47lp6AHws/maxresdefault.jpg',
            albumPage: '../music/2025-04-03-gillian-welch-david-rawlings-classic-center-athens-ga.html',
            manualTags: ['gillianwelch', 'davidrawlings', 'classiccenter', 'athens', 'livemusic', 'sixwhitehorses', 'thatsthewayitgoes', 'waysidebackintime'],
            videos: [
                {
                    title: 'Wayside / Back in Time',
                    youtubeId: 'Qg47lp6AHws',
                    tags: ['waysidebackintime', 'gillianwelch', 'davidrawlings', 'classiccenter', 'athens', 'livemusic']
                },
                {
                    title: "That's the Way It Goes",
                    youtubeId: 'aRFz1bChgkA',
                    tags: ['thatsthewayitgoes', 'gillianwelch', 'davidrawlings', 'classiccenter', 'athens', 'livemusic']
                },
                {
                    title: 'Six White Horses',
                    youtubeId: 'u9w-jkqych4',
                    tags: ['sixwhitehorses', 'gillianwelch', 'davidrawlings', 'classiccenter', 'athens', 'livemusic']
                }
            ]
        },
        { 
            title: '2025-04-11 Steeple Benefit @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54959945072_95bdbb451f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330709474/',
            filterNames: ['Steeple Benefit', 'Granfalloons', 'The Bad Ends', 'Five Eight', 'Sunny Ortiz'],
            albumPage: '../music/2025-04-11-steeple-benefit-40-watt-athens-ga.html'
        },
        { 
            title: '2025-04-11 Lee Bains @ Flicker | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54962023655_14fa63a92f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330685535/',
            albumPage: '../music/2025-04-11-lee-bains-flicker-athens-ga.html'
        },
        { 
            title: '2025-04-11 Jay Gonzalez & Sloan Brothers 7" Split Release Party @ Flicker | Athens, GA', 
            photoCount: 4, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330469965/',
            coverUrl: 'https://live.staticflickr.com/65535/54939476809_f3752d5884_z.jpg',
            albumPage: '../music/2025-04-11-jay-gonzalez-sloan-brothers-flicker-athens-ga.html'
        },
        { 
            title: '2025-04-25 Cicada Rhythm @ Cobham Triangle Park | Athens, GA', 
            photoCount: 6, 
            coverUrl: 'https://live.staticflickr.com/65535/54941003840_e7a1917e56_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330518389/',
            albumPage: '../music/2025-04-25-cicada-rhythm-cobham-triangle-park-athens-ga.html'
        },
        { 
            title: '2025-05-09 Rose Hotel @ Cobham Triangle Park | Athens, GA', 
            photoCount: 14, 
            coverUrl: 'https://live.staticflickr.com/65535/54940963019_bc3a32441f_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330485070/',
            albumPage: '../music/2025-05-09-rose-hotel-cobham-triangle-park-athens-ga.html'
        },
        { 
            title: '2025-05-09 Lazy Horse @ Cobham Triangle Park | Athens, GA', 
            photoCount: 9, 
            coverUrl: 'https://live.staticflickr.com/65535/54939889787_5a4dd3e319_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330518974/',
            albumPage: '../music/2025-05-09-lazy-horse-cobham-triangle-park-athens-ga.html'
        },
        { 
            title: '2024-10-11 Kimberly Morgan York @ Terrapin Beer Co. | Athens, GA',
            photoCount: 17,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321185180/',
            coverUrl: 'https://live.staticflickr.com/65535/54064499342_4f0005cfa4_z.jpg',
            albumPage: '../music/2024-10-11-kimberly-morgan-york-terrapin-beer-co-athens-ga.html'
        }, 
        { 
            title: '2024-10-04 Jerry Joseph & the Jackmormons @ Nowhere Bar | Athens, GA', 
            photoCount: 14, 
            coverUrl: 'https://live.staticflickr.com/65535/54943491400_532f1bc134_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330529218/',
            albumPage: '../music/2024-10-04-jerry-joseph-jackmormons-nowhere-bar-athens-ga.html'
        }, 
        { 
            title: '2024-10-10 Doug Emhoff Event with Michael Stipe | Athens, GA',
            photoCount: 11,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321198241/',
            coverUrl: 'https://live.staticflickr.com/65535/54067165798_b819722fc9_z.jpg',
            albumPage: '../music/2024-10-10-doug-emhoff-event-with-michael-stipe-athens-ga.html',
            filterNames: ['Michael Stipe', 'Andy LeMaster', 'David Barbe'],
            manualTags: ['rem', 'davidbarbe', 'andylemaster', 'dougemhoff', 'michaelstipe', 'wendellgee', 'driver8', 'athensclarkecountydemocrats', 'athensmusic', 'politics', 'kamalaharris', 'democrats', 'presidentialcampaign'],
            videos: [
                {
                    title: 'Wendell Gee',
                    youtubeId: 'iEzos4yZNRg',
                    tags: ['wendellgee', 'michaelstipe', 'davidbarbe', 'andylemaster', 'dougemhoff', 'kamalaharris', 'democrats', 'athensclarkecountydemocrats', 'politics', 'rem', 'presidentialcampaign']
                },
                {
                    title: 'Story',
                    youtubeId: 'YCGqsU8YHg4',
                    tags: ['story', 'michaelstipe', 'davidbarbe', 'andylemaster', 'dougemhoff', 'kamalaharris', 'democrats', 'athensclarkecountydemocrats', 'politics', 'rem', 'presidentialcampaign']
                },
                {
                    title: 'Driver 8',
                    youtubeId: 'GEfZU9giVug',
                    tags: ['driver8', 'michaelstipe', 'davidbarbe', 'andylemaster', 'dougemhoff', 'kamalaharris', 'democrats', 'athensclarkecountydemocrats', 'politics', 'rem', 'presidentialcampaign']
                }
            ]
        }, 
        { 
            title: '2024-09-30  David Barbe Bday Show @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321185275/',
            coverUrl: 'https://live.staticflickr.com/65535/54065843540_822872b94c_z.jpg',
            albumPage: '../music/2024-09-30-david-barbe-bday-show-flicker-athens-ga.html'
        },
        { 
            title: '2024-09-07 The Bad Ends @ 40 Watt | Athens, GA', 
            photoCount: 27, 
            coverUrl: 'https://live.staticflickr.com/65535/54939998232_42de63d001_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330492587/',
            albumPage: '../music/2024-09-07-the-bad-ends-40-watt-athens-ga.html'
        },
        { 
            title: '2024-05-24 Hayride @ Roadhouse | Athens, GA', 
            photoCount: 16, 
            coverUrl: 'https://live.staticflickr.com/65535/54941114218_5b2efbc770_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330493037/',
            albumPage: '../music/2024-05-24-hayride-roadhouse-athens-ga.html'
        }, 
        { 
            title: '2024-04-26 Five Eight @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54918040659_af9e2b2db2_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330251330/',
            albumPage: '../music/2024-04-26-five-eight-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2024-04-04 Alejandro Escovedo @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54915305274_38ef59a4f6_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330247733/',
            albumPage: '../music/2024-04-04-alejandro-escovedo-40-watt-athens-ga.html'
        },
        { 
            title: '2024-04-13 Pilgrim @ Little Kings | Athens, GA', 
            photoCount: 5, 
            coverUrl: 'https://live.staticflickr.com/65535/54940928031_68ed2e124c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330493222/',
            albumPage: '../music/2024-04-13-pilgrim-little-kings-athens-ga.html'
        },
        { 
            title: '2024-04-11 Kimberly Morgan York @ House Party | Athens, GA', 
            photoCount: 9, 
            coverUrl: 'https://live.staticflickr.com/65535/54941194494_e70a488c74_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330487035/',
            albumPage: '../music/2024-04-11-kimberly-morgan-york-band-house-party-athens-ga.html'
        },
        { 
            title: '2024-04-20 Irreperable Damage @ Flicker | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330456601/',
            coverUrl: 'https://live.staticflickr.com/65535/54936449937_bd06e0ed3c_z.jpg',
            albumPage: '../music/2024-04-20-irreperable-damage-flicker-athens-ga.html'
        },
        { 
            title: '2024-03-01 Lona @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54915343105_0e505f503b_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330247523/',
            albumPage: '../music/2024-03-01-lona-40-watt-athens-ga.html'
        },
        { 
            title: '2024-02-15 Vision Video @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330453075/',
            coverUrl: 'https://live.staticflickr.com/65535/54937524283_39edfc2795_z.jpg',
            albumPage: '../music/2024-02-15-vision-video-40-watt-athens-ga.html'
        },
        { 
            title: '2024-02-15 Drive By Truckers @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54925322792_50ec14ecf0_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330343237/',
            albumPage: '../music/2024-02-15-drive-by-truckers-40-watt-athens-ga.html'
        },
        { 
            title: '2024-02-14 Dimmer Twins & Friends @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330493457/',
            coverUrl: 'https://live.staticflickr.com/65535/54940085012_5d951ecdaf_z.jpg',
            albumPage: '../music/2024-02-14-dimmer-twins-friends-40-watt-athens-ga.html',
            filterNames: ['Dimmer Twins', 'Don Chambers', 'Dave Marr', 'Claire Campbell', 'Jay Gonzalez']
        },
        { 
            title: '2024-01-26 Bit Brigade @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329982768/with/54887654154',
            coverUrl: 'https://live.staticflickr.com/65535/54887654154_1a2bbe03b2_z.jpg',
            albumPage: '../music/2024-01-26-bit-brigade-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2024-01-26 Lazer/Wulf @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54916895602_172af7eb5d_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330282554/',
            albumPage: '../music/2024-01-26-lazer-wulf-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2023-12-16 Vincas @ 40 Watt | Athens, GA', 
            photoCount: 22, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330244243/',
            coverUrl: 'https://live.staticflickr.com/65535/54913923967_88d498ed7a_z.jpg',
            albumPage: '../music/2023-12-16-vincas-40-watt-athens-ga.html'
        },
        { 
            title: '2023-11-24 Taxicab Verses @ Flicker | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909326078_b63c4ebffb_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330192738/',
            albumPage: '../music/2023-11-24-taxicab-verses-flicker-athens-ga.html'
        },
        { 
            title: '2023-11-24 Jacob Morris @ Flicker | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909524315_15e97a2607_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330193693/',
            albumPage: '../music/2023-11-24-jacob-morris-flicker-athens-ga.html'
        },
        { 
            title: '2023-07-18 Jay Gonzalez @ Athentic Brewery | Athens, GA', 
            photoCount: 2, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486524/',
            coverUrl: 'https://live.staticflickr.com/65535/54937568999_6fdc41bd09_z.jpg',
            albumPage: '../music/2023-07-18-jay-gonzalez-athentic-brewery-athens-ga.html'
        },
        { 
            title: '2023-07-15 Kimberly Morgan York @ Nowhere Bar | Athens, GA', 
            photoCount: 19, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330531729/',
            coverUrl: 'https://live.staticflickr.com/65535/54942426625_804ced667a_z.jpg',
            albumPage: '../music/2023-07-15-kimberly-morgan-york-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2023-11-04 Jerry Joseph & the Jackmormons @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329992639/', 
            coverUrl: 'https://live.staticflickr.com/65535/54887676938_5139120bee_z.jpg',
            albumPage: '../music/2023-11-04-jerry-joseph-the-jackmormons-40-watt-athens-ga.html'
        },
        { 
            title: '2023-10-07 TaxiCab Verses @ 40 Watt | Athens, GA', 
            photoCount: 10, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330392902/', 
            coverUrl: 'https://live.staticflickr.com/65535/54930448852_9453baf315_z.jpg',
            albumPage: '../music/2023-10-07-taxicab-verses-40-watt-athens-ga.html'
        },
        { 
            title: '2023-10-07 Baba Commandant & the Mandingo Band @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329968407/', 
            coverUrl: 'https://live.staticflickr.com/65535/54887240071_f8ff887ce5_z.jpg',
            albumPage: '../music/2023-10-07-baba-commandant-the-mandingo-band-40-watt-athens-ga.html'
        },
        { 
            title: '2023-10-12 Kimberly Morgan York @ Nowhere Bar | Athens, GA', 
            photoCount: 13, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330487975/',
            coverUrl: 'https://live.staticflickr.com/65535/54941356620_3d47a70241_z.jpg',
            albumPage: '../music/2023-10-12-kimberly-morgan-york-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2023-09-30 David Barbe\'s 60th Bday @ 40 Watt | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329958795/with/54887353605/',
            coverUrl: 'https://live.staticflickr.com/65535/54887353605_67e82e3d0c_z.jpg',
            albumPage: '../music/2023-09-30-david-barbe-60th-bday-40-watt-athens-ga.html'
        },
        { 
            title: '2023-09-30 Pilgrim @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330357813/',
            coverUrl: 'https://live.staticflickr.com/65535/54926455050_25d957e129_z.jpg',
            albumPage: '../music/2023-09-30-pilgrim-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2023-09-10 Jackmormons @ Heist Brewery | Charlotte, NC', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54924912294_fb04420a39_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330324995/',
            albumPage: '../music/2023-09-10-jackmormons-heist-brewery-athens-ga.html'
        },
        { 
            title: '2023-08-26 Telemarket @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54926297153_2b4ccca0b8_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330342632/',
            albumPage: '../music/2023-08-26-telemarket-40-watt-athens-ga.html'
        },
        { 
            title: '2023-08-12 Drug Ducks @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909410185_359f81a775_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330172460/',
            albumPage: '../music/2023-08-12-drug-ducks-nowhere-athens-ga.html'
        },
        { 
            title: '2023-06-24 Lona @ AthFest | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54922586906_ba88587b18_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330330794/',
            albumPage: '../music/2023-06-24-lona-athfest-athens-ga.html'
        },
        { 
            title: '2023-04-06 Will Johnson @ Living Room Show | Athens, GA', 
            photoCount: 7, 
            coverUrl: 'https://live.staticflickr.com/65535/54933201596_aa7764b17e_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330408516/',
            albumPage: '../music/2023-04-06-will-johnson-living-room-show-athens-ga.html'
        },
        { 
            title: '2023-04-06 Spencer Thomas @ Living Room Show | Athens, GA', 
            photoCount: 2, 
            coverUrl: 'https://live.staticflickr.com/65535/54933476769_4d0c877631_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330411882/',
            albumPage: '../music/2023-04-06-spencer-thomas-living-room-show-athens-ga.html'
        },
        { 
            title: '2023-03-25 Eyelids @ Flicker | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54908216232_01d6dc0be0_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330204479/',
            albumPage: '../music/2023-03-25-eyelids-flicker-athens-ga.html'
        },
        { 
            title: '2023-03-23 JD Pinkus & Daniel Mason @ Cine | Athens, GA', 
            photoCount: 5, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486594/',
            coverUrl: 'https://live.staticflickr.com/65535/54936453727_9c179be67d_z.jpg',
            albumPage: '../music/2023-03-23-jd-pinkus-daniel-mason-cine-athens-ga.html'
        },
        { 
            title: '2023-03-10 Cracker @ 40 Watt | Athens, GA', 
            photoCount: 8, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486669/',
            coverUrl: 'https://live.staticflickr.com/65535/54937643785_5dec809aef_z.jpg',
            albumPage: '../music/2023-03-10-cracker-40-watt-athens-ga.html'
        },
        { 
            title: '2023-03-04 Bloodkin @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54943193631_97ee675877_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330541379/',
            albumPage: '../music/2023-03-04-bloodkin-nowhere-bar-athens-ga.html'
        },
        {
            title: '2023-02-09 Weaponized Flesh @ Georgia Theatre | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54936478462_f868957720_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330453275/',
            albumPage: '../music/2023-02-09-weaponized-flesh-georgia-theatre-athens-ga.html',
            filterNames: ['Weaponized Flesh'],
        },
        { 
            title: '2023-03-25 Elf Power @ Flicker | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330258537/',
            coverUrl: 'https://live.staticflickr.com/65535/54916983482_fc96063e12_z.jpg',
            albumPage: '../music/2023-03-25-elf-power-flicker-athens-ga.html'
        },
        { 
            title: '2023-02-10 Shotgun Shells: A Celebration of Todd McBride @ Various | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330208208/',
            coverUrl: 'https://live.staticflickr.com/65535/54911043681_22eee3c521_z.jpg',
            filterNames: ['Classic City Jukebox', 'Shehehe', 'Mercyland', 'AD Blanco', 'Royal Velvet', 'Shotgun Saviors', 'The Arcs'],
            albumPage: '../music/2023-02-10-shotgun-shells-celebration-todd-mcbride-athens-ga.html'
        },
        { 
            title: '2023-03-10 Kimberly Morgan York @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329963911/',
            coverUrl: 'https://live.staticflickr.com/65535/54886514342_342d0e0b2b_z.jpg',
            albumPage: '../music/2023-03-10-kimberly-morgan-york-40-watt-athens-ga.html'
        },
        { 
            title: '2022-12-13 Supernova Rainbow of Fun @ Nuci\'s Space | Athens, GA',
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909309683_47e3fe91ec_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330172345/',
            albumPage: '../music/2022-12-13-supernova-rainbow-of-fun-nucis-space.html'
        },
        { 
            title: '2022-12-13 Clay Leverett & John Neff @ Nuci\'s Space | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330474508/',
            coverUrl: 'https://live.staticflickr.com/65535/54936434472_98005f57b1_z.jpg',
            albumPage: '../music/2022-12-13-clay-leverett-john-neff-nucis-space-athens-ga.html'
        },
        { 
            title: '2022-11-27 Bloodkin @ Nuci\'s Space | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54945680355_e1fbbd7492_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330534192/',
            albumPage: '../music/2022-11-27-bloodkin-nucis-space-athens-ga.html'
        },
        { 
            title: '2022-10-02 Hunter Morris @ Porchfest | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54926776968_fb15ea5d51_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330346052/',
            albumPage: '../music/2022-10-02-hunter-morris-porchfest-athens-ga.html'
        },
        {
            title: '2022-10-02 Tom Hiel @ Porchfest | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54937504668_82f518e27c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486389/',
            albumPage: '../music/2022-10-02-tom-hiel-porchfest-athens-ga.html',
            filterNames: ['Tom Hiel'],
        },
        { 
            title: '2022-09-15 Brown Dwarf @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54917678081_76a2549449_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330252736/',
            albumPage: '../music/2022-09-15-brown-dwarf-40-watt-athens-ga.html'
        },
        { 
            title: '2022-09-02 Infinite Favors @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54925470172_5ba96d31cc_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330369904/',
            albumPage: '../music/2022-09-02-infinite-favors-40-watt-athens-ga.html', 
            filterNames: ['Andrew Prater']
        },
        { 
            title: '2022-09-02 Don Chambers @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452850/',
            coverUrl: 'https://live.staticflickr.com/65535/54937489223_590defb396_z.jpg',
            albumPage: '../music/2022-09-02-don-chambers-40-watt-athens-ga.html'
        },
        { 
            title: '2022-09-24 Blunt Bangs @ A-Fest Music & Food Festival for Reproductive Justice | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330486349/',
            coverUrl: 'https://live.staticflickr.com/65535/54937496533_4042f9002c_z.jpg',
            albumPage: '../music/2022-09-24-a-fest-athens-ga.html'
        },
        { 
            title: '2022-07-22 Kimberly Morgan York @ 40 Watt | Athens, GA',
            photoCount: 50,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329941170/',
            coverUrl: 'https://live.staticflickr.com/65535/54885463234_aca2d49159_z.jpg',
            albumPage: '../music/2022-07-22-kimberly-morgan-york-40-watt-athens-ga.html'
        },
        { 
            title: '2022-07-22 Claire Campbell @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330474313/',
            coverUrl: 'https://live.staticflickr.com/65535/54937277471_73d9f2292b_z.jpg',
            albumPage: '../music/2022-07-22-claire-campbell-40-watt-athens-ga.html'
        },
        { 
            title: '2022-06-26 Kevn Kinney Band @ AthFest | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54916993407_a5dbc5c5da_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330258602/',
            albumPage: '../music/2022-06-26-kevn-kinney-band-athfest-athens-ga.html'
        },
        { 
            title: '2022-05-22 The Wydelles @ 40 Watt | Athens, GA', 
            photoCount: 6, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452730/',
            coverUrl: 'https://live.staticflickr.com/65535/54936381962_1f567eec3f_z.jpg',
            albumPage: '../music/2022-05-22-the-wydelles-40-watt-athens-ga.html'
        },
        { 
            title: '2022-04-10 Patterson Hood & Friends @ Creature Comforts | Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329983203/',
            coverUrl: 'https://live.staticflickr.com/65535/54887666343_32bb0a8754_z.jpg',
            albumPage: '../music/2022-04-10-patterson-hood-claire-campbell-jay-gonzalez-creature-comforts-athens-ga.html'
        },
        { 
            title: '2022-03-27 Bo Bedingfield @ World Famous | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452520/',
            coverUrl: 'https://live.staticflickr.com/65535/54937488894_58feba17b0_z.jpg',
            albumPage: '../music/2022-03-27-bo-bedingfield-world-famous-athens-ga.html'
        },
        { 
            title: '2022-02-26 Kimberly Morgan York @ The Root | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54945675825_8b1d4c77e1_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330527475/',
            albumPage: '../music/2022-02-26-kimberly-morgan-york-the-root-athens-ga.html'
        },
        { 
            title: '2020-02-13 The Dexateens @ 40 Watt | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330387630/', 
            coverUrl: 'https://live.staticflickr.com/65535/54931548358_9c9c34f739_z.jpg',
            albumPage: '../music/2020-02-13-the-dexateens-40-watt-athens-ga.html'
        },
        { 
            title: '2019-12-31 Five Eight @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909533495_9659552f43_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330193758/',
            albumPage: '../music/2019-12-31-five-eight-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-10-21 Steel Pulse @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329982229/',
            coverUrl: 'https://live.staticflickr.com/65535/54886596559_161315c87d_z.jpg',
            albumPage: '../music/2019-10-21-steel-pulse-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2019-09-12 Bloodkin @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54924886149_bfcf9d0139_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330330327/',
            albumPage: '../music/2019-09-12-bloodkin-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-05-03 Matt Talbott @ Espresso Machine Studio | Athens, GA', 
            photoCount: 2, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330484809/',
            coverUrl: 'https://live.staticflickr.com/65535/54937376014_12f07a7797_z.jpg',
            albumPage: '../music/2019-05-03-matt-talbott-espresso-machine-studio-athens-ga.html'
        },
        { 
            title: '2019-05-30 Andrew Prater @ Flicker | Athens, GA', 
            photoCount: 7, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330452460/',
            coverUrl: 'https://live.staticflickr.com/65535/54937477214_e10024d858_z.jpg',
            albumPage: '../music/2019-05-30-andrew-prater-flicker-athens-ga.html'
        },
        { 
            title: '2019-03-30 Hayride @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54922851519_3b81b8f43d_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330305987/',
            albumPage: '../music/2019-03-30-hayride-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-03-22 The Rock*A*Teens @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54926603725_d3b8dbf6ab_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330338565/',
            albumPage: '../music/2019-03-22-rock-a-teens-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2019-02-01 David Barbe & the Quick Hooks @ Caledonia | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54926524124_f6ecf053a4_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330358648/',
            albumPage: '../music/2019-02-01-david-barbe-quick-hooks-athens-ga.html'
        },
        {
            title: '2019-02-01 The Wydelles @ Caledonia | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54924884828_126f9990f6_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330345488/',
            albumPage: '../music/2019-02-01-the-wydelles-caledonia-athens-ga.html',
            filterNames: ['The Wydelles'],
        },
        { 
            title: '2018-12-29 Lona @ Caledonia | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54915396460_1ea5fc0dd4_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330229651/',
            albumPage: '../music/2018-12-29-lona-caledonia-athens-ga.html'
        },
        { 
            title: '2018-11-08 Robyn Hitchcock @ 40 Watt | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54923749097_77bfe5bc68_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330345098/',
            albumPage: '../music/2018-11-08-robyn-hitchcock-40-watt-athens-ga.html'
        },
        { 
            title: '2018-10-31 Bloodkin @ Georgia Theatre | Athens, GA', 
            photoCount: 9, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330418079/',
            coverUrl: 'https://live.staticflickr.com/65535/54931383658_6af651a0c5_z.jpg',
            albumPage: '../music/2018-10-31-bloodkin-georgia-theatre-athens-ga.html'
        },
        { 
            title: '2018-10-31 Jerry Joseph & the Jackmormons @ Georgia Theatre | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54915381534_34ae6a3d08_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330228355/',
            albumPage: '../music/2018-10-31-jerry-joseph-jackmormons-athens-ga.html'
        },
        { 
            title: '2018-07-14 Cinemechanica @ Caledonia | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54924813388_76d314616c_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330324630/',
            albumPage: '../music/2018-07-14-cinemechanica-caledonia-athens-ga.html'
        },
        { 
            title: '2018-07-06 Daniel Hutchens, Eric Carter & Todd Nance @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54945415971_50f151d6f2_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330534587/',
            albumPage: '../music/2018-07-06-daniel-hutchens-eric-carter-todd-nance-nowhere-bar-athens-ga.html'
        },
        { 
            title: '2018-06-04 Daniel Hutchens & David Barbe @ Georgia Theatre Rooftop | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54922946845_bb7774df40_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330320628/',
            albumPage: '../music/2018-06-04-daniel-hutchens-david-barbe-georgia-theatre-rooftop-athens-ga.html'
        },
        { 
            title: '2017-12-14 5000 @ Caledonia | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54909332968_99ef23f946_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330204669/',
            albumPage: '../music/2017-12-14-5000-caledonia-athens-ga.html'
        },
        { 
            title: '2017-07-27 Jerry Joseph, Todd Nance & John Neff @ The Foundry | Athens, GA', 
            photoCount: 11, 
            coverUrl: 'https://live.staticflickr.com/65535/54914785638_d2962168ec_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330222401/',
            albumPage: '../music/2017-07-27-jerry-joseph-todd-nance-john-neff-the-foundry-athens-ga.html'
        },
        { 
            title: '2011-06-02 Jerry Joseph, Bloodkin & Todd Nance @ 40 Watt | Athens, GA',
            photoCount: 11,
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72157626752915571/',
            coverUrl: 'https://live.staticflickr.com/2567/5794530220_411f84cb92_z.jpg',
            albumPage: '../music/2011-06-02-jerry-joseph-bloodkin-todd-nance-40-watt-athens-ga.html',
            filterNames: ['Jerry Joseph', 'Daniel Hutchens', 'Eric Carter', 'William Tonks', 'Todd Nance'],
            videos: [
                {
                    title: 'White Freightliner Blues',
                    youtubeId: '_wef1DXNzXM',
                    tags: ['jerryjoseph', 'bloodkin', 'toddnance', '40watt', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    title: 'Yellow Ribbons (partial)',
                    youtubeId: 'OGUPIeyiPpg',
                    tags: ['jerryjoseph', 'danielhutchens', 'ericcarter', 'williamtonks', 'bloodkin', 'toddnance', '40watt', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2006-03-02 Patterson Hood & Friends @ 40 Watt | Athens, GA',
            isVideoCollection: true,
            albumPage: '../music/2006-03-02-patterson-hood-friends-40-watt-athens-ga.html',
            coverUrl: 'https://jayneclamp.com/images/PHoodFriends2006.png',
            filterNames: ['Patterson Hood', 'John Neff', 'Brad Morgan', 'Dave Schools', 'Mike Cooley'],
            manualTags: ['athensga', 'athensgamusic', 'pattersonhood', 'johnneff', 'bradmorgan', 'daveschools', 'mikecooley', '40watt', 'drivebytruckers', 'widespreadpanic', 'benefit', 'livemusic', 'gimmeshelter'],
            videos: [
                {
                    youtubeId: '3Cg35r227NY',
                    title: 'Patterson Hood & Friends @ 40 Watt - Gimme Shelter Benefit 2006-03-02',
                    tags: ['athensga', 'athensgamusic', 'pattersonhood', 'johnneff', 'bradmorgan', 'daveschools', 'mikecooley', '40watt', 'drivebytruckers', 'widespreadpanic', 'benefit', 'livemusic', 'gimmeshelter']
                }
            ],
        },
        {
            title: '2025-02-21 Robyn Hitchcock @ 40 Watt | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/7fOuPrB8HoE/maxresdefault.jpg',
            albumPage: '../music/2025-02-21-robyn-hitchcock-40-watt-athens-ga.html',
            manualTags: ['robynhitchcock', '40watt', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: '7fOuPrB8HoE',
                    title: 'Robyn Hitchcock "I\'m Falling" 2025-02-21 @ 40 Watt Club | Athens, GA',
                    tags: ['robynhitchcock', '40watt', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2016-02-12 Bit Brigade @ Caledonia Lounge | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/TeOOMlv4oMU/maxresdefault.jpg',
            albumPage: '../music/2016-02-12-bit-brigade-caledonia-lounge-athens-ga.html',
            manualTags: ['bitbrigade', 'caledonialounge', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: 'TeOOMlv4oMU',
                    title: 'Bit Brigade 2016-02-12 @ Caledonia Lounge | Athens, GA',
                    tags: ['bitbrigade', 'caledonialounge', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2011-09-25 Meat Puppets @ Melting Point | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/QqVeUE5ulP8/maxresdefault.jpg',
            albumPage: '../music/2011-09-25-meat-puppets-melting-point-athens-ga.html',
            manualTags: ['meatpuppets', 'meltingpoint', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: 'QqVeUE5ulP8',
                    title: 'Meat Puppets "Touchdown King" 2011-09-25 @ Melting Point | Athens, GA',
                    tags: ['meatpuppets', 'meltingpoint', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2001-12-14 Mike Houser with Barbara Cue @ Georgia Theatre | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/lmcvF_rxKN8/hqdefault.jpg',
            albumPage: '../music/2001-12-14-mike-houser-barbara-cue-georgia-theatre-athens-ga.html',
            filterNames: ['Mike Houser', 'Barbara Cue'],
            manualTags: ['mikehouser', 'barbaracue', 'georgiatheatre', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: 'lmcvF_rxKN8',
                    title: '2001-12-14 Mike Houser with Barbara Cue (Can\'t Change the Past, She Drives Me To Drink)',
                    tags: ['mikehouser', 'barbaracue', 'georgiatheatre', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2026-05-02 Bruce Springsteen & the E Street Band @ State Farm Arena | Atlanta, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/wrpjAK2VquQ/maxresdefault.jpg',
            albumPage: '../music/2026-05-02-bruce-springsteen-e-street-band-state-farm-arena-atlanta-ga.html',
            manualTags: ['brucespringsteen', 'estreetband', 'tommorello', 'statefarmarena', 'atlanta', 'livemusic'],
            videos: [
                {
                    youtubeId: 'wrpjAK2VquQ',
                    title: 'Bruce Springsteen & the E Street Band "Long Walk Home" @ State Farm Arena, Atlanta 2026-05-02',
                    tags: ['brucespringsteen', 'estreetband', 'statefarmarena', 'atlanta', 'livemusic']
                },
                {
                    youtubeId: 'tcHZLl_l9Sk',
                    title: 'Bruce Springsteen & the E Street Band w Tom Morello (1) @ State Farm Arena, Atlanta 2026-05-02',
                    tags: ['brucespringsteen', 'estreetband', 'tommorello', 'statefarmarena', 'atlanta', 'livemusic']
                },
                {
                    youtubeId: 'vjvvFjdi38E',
                    title: 'Bruce Springsteen & the E Street Band w Tom Morello (2) @ State Farm Arena, Atlanta 2026-05-02',
                    tags: ['brucespringsteen', 'estreetband', 'tommorello', 'statefarmarena', 'atlanta', 'livemusic']
                },
                {
                    youtubeId: '2_friFOosX0',
                    title: 'Bruce Springsteen & the E Street Band w Tom Morello (3) @ State Farm Arena, Atlanta 2026-05-02',
                    tags: ['brucespringsteen', 'estreetband', 'tommorello', 'statefarmarena', 'atlanta', 'livemusic']
                },
                {
                    youtubeId: 'nzjVzv2CiXY',
                    title: 'Bruce Springsteen & the E Street Band @ State Farm Arena, Atlanta 2026-05-02',
                    tags: ['brucespringsteen', 'estreetband', 'statefarmarena', 'atlanta', 'livemusic']
                }
            ],
        },
        {
            title: '2025-04-20 Kevn Kinney, Peter Buck & Mike Mills @ Rialto Room | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/rtLa40tRXWk/maxresdefault.jpg',
            albumPage: '../music/2025-04-20-kevn-kinney-peter-buck-mike-mills-rialto-room-athens-ga.html',
            manualTags: ['kevnkinney', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: 'rtLa40tRXWk',
                    title: 'Kevn Kinney, Peter Buck & Mike Mills "Honeysuckle Blue" 2025-04-20 @ Rialto Room | Athens, GA',
                    tags: ['kevnkinney', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    youtubeId: 'ySAl7iV-HaI',
                    title: 'Mike Mills, Kevn Kinney & Peter Buck "Apartment #9" 2025-04-20 @ Rialto Room | Athens, GA',
                    tags: ['kevnkinney', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    youtubeId: 'ooXYAl6K_TY',
                    title: 'Mike Mills, Peter Buck & Kevn Kinney "Don\'t Go Back to Rockville" 2025-04-20 Rialto Room | Athens, GA',
                    tags: ['kevnkinney', 'peterbuck', 'mikemills', 'rialtoroom', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2011-01-19 Neal Fountain & Dan Nettles @ Hendershot\'s | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/GPyp1tPS82w/hqdefault.jpg',
            albumPage: '../music/2011-01-19-neal-fountain-dan-nettles-hendershots-athens-ga.html',
            filterNames: ['Neal Fountain', 'Dan Nettles'],
            manualTags: ['nealfountain', 'dannettles', 'hendershots', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                {
                    youtubeId: 'GPyp1tPS82w',
                    title: 'Neal Fountain & Dan Nettles - Hendershot\'s - Athens, GA - 1/19/11',
                    tags: ['nealfountain', 'dannettles', 'hendershots', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    youtubeId: 'VUi7N0q4bMA',
                    title: 'Neal Fountain & Dan Nettles (2) - Hendershot\'s - Athens, GA - 1/19/11',
                    tags: ['nealfountain', 'dannettles', 'hendershots', 'athensga', 'athensgamusic', 'livemusic']
                },
                {
                    youtubeId: 'wrVdLuo6Onc',
                    title: 'Neal Fountain & Dan Nettles (3) - Hendershot\'s - Athens, GA - 1/19/11',
                    tags: ['nealfountain', 'dannettles', 'hendershots', 'athensga', 'athensgamusic', 'livemusic']
                }
            ],
        },
        {
            title: '2010-06-19 Bloodkin @ Seabreeze Deck | Charleston, SC',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/Nd8fDZ5uqGA/hqdefault.jpg',
            albumPage: '../music/2010-06-19-bloodkin-seabreeze-deck-charleston-sc.html',
            filterNames: ['Bloodkin', 'Daniel Hutchens', 'Eric Carter', 'William Tonks'],
            manualTags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'],
            videos: [
                { youtubeId: 'Nd8fDZ5uqGA', title: 'Bloodkin1_Jack Nicholson Grin (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'p01s1qYWpo8', title: 'Bloodkin2_Calling Back (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'vAITDbR_Oak', title: 'Bloodkin3_Lost Highway (Hank Williams) (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: '88AuyTCKHuE', title: 'Bloodkin4_You Ain\'t Goin Nowhere (Bob Dylan) (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'iirRs6VncaI', title: 'Bloodkin5_Tennessee Williams (Set 1) (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'lTQ9D_ge_X8', title: 'Bloodkin6_Last Dance With Mary Jane (Tom Petty) (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'pAf3snBAe9Q', title: 'Bloodkin7_Quarter Tank of Gasoline (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: '3M2bQDynphA', title: 'Bloodkin8_Can\'t Get High (Charleston Set 1)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: '7zjBDaYgtKI', title: 'Bloodkin9_White Freightliner Blues (Townes Van Zandt) (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: '2nA7lfeDNRU', title: 'Bloodkin10_Blue Skies Above America (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'qc4rs4COe9U', title: 'Bloodkin11_Who Do You Belong To? (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'SDkUwE6yZzU', title: 'Bloodkin12_Success Yourself (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'vIqOVG0C3nY', title: 'Bloodkin13_Makes Sense To Me (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'Ek6rFAO6tkg', title: 'Bloodkin14_End of the Show (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'JLXxcd5EPHA', title: 'Bloodkin15_Ghostrunner (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'qD7ez6-PVSg', title: 'Bloodkin16_Hickory Wind (Gram Parsons, Bob Buchanan) (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] },
                { youtubeId: 'M99LytB5rQQ', title: 'Bloodkin17_You Better Pray (Charleston Set 2)', tags: ['bloodkin', 'danielhutchens', 'ericcarter', 'williamtonks', 'charleston', 'seabreezedeck', 'livemusic'] }
            ],
        },
        {
            title: '2011-02-12 Futurebirds @ Seney-Stovall Chapel | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/L1-zfAbZRFE/hqdefault.jpg',
            albumPage: '../music/2011-02-12-futurebirds-seney-stovall-chapel-athens-ga.html',
            filterNames: ['Futurebirds'],
            manualTags: ['futurebirds', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                { youtubeId: 'L1-zfAbZRFE', title: 'Futurebirds - "Wild Heart" (Stevie Nicks)', tags: ['futurebirds', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'DvvzgIyzrBk', title: 'Futurebirds - "Johnny Utah"', tags: ['futurebirds', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'iUk6PdmWq3w', title: 'Futurebirds - "Dirty D" (partial)', tags: ['futurebirds', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'] }
            ],
        },
        {
            title: '2011-02-12 Dave Marr & Friends @ Seney-Stovall Chapel | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/Cee3uYgqkyM/hqdefault.jpg',
            albumPage: '../music/2011-02-12-dave-marr-friends-seney-stovall-chapel-athens-ga.html',
            filterNames: ['Dave Marr'],
            manualTags: ['davemarr', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                { youtubeId: 'Cee3uYgqkyM', title: 'Dave Marr & Friends', tags: ['davemarr', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'C3Kn2jVMijM', title: 'Dave Marr & Friends - "Whiskey & You"', tags: ['davemarr', 'seneystovallchapel', 'athensga', 'athensgamusic', 'livemusic'] }
            ],
        },
        {
            title: '2011-02-03 Athens Business Rocks @ 40 Watt | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/3qLQbk7tkb0/hqdefault.jpg',
            albumPage: '../music/2011-02-03-athens-business-rocks-40-watt-athens-ga.html',
            filterNames: ['Boy George Clinton', 'The Fret Dressers', 'Clusterphunk', '80 Cougar'],
            manualTags: ['boygeorgeclinton', 'thefretdressers', 'baxendaleguitar', 'clusterphunk', '80cougar', 'athensbusinessrocks', 'nucisspace', '40watt', 'athensga', 'athensgamusic', 'livemusic', 'benefit'],
            videos: [
                { youtubeId: '3qLQbk7tkb0', title: 'Boy George Clinton - "Maggot Brain / Crying Game" (Funkadelic / Boy George)', tags: ['boygeorgeclinton', 'athensbusinessrocks', 'nucisspace', '40watt', 'athensga', 'athensgamusic', 'livemusic', 'benefit'] },
                { youtubeId: 'GWyHqHUtMd8', title: 'The Fret Dressers (Baxendale Guitar) - "Trying To Get To You" (Elvis Presley)', tags: ['thefretdressers', 'baxendaleguitar', 'athensbusinessrocks', 'nucisspace', '40watt', 'athensga', 'athensgamusic', 'livemusic', 'benefit'] },
                { youtubeId: 'CfEWLmt7WPg', title: 'Clusterphunk - "Bennie & the Jets" (Elton John / Bernie Taupin)', tags: ['clusterphunk', 'athensbusinessrocks', 'nucisspace', '40watt', 'athensga', 'athensgamusic', 'livemusic', 'benefit'] },
                { youtubeId: 'YikNe3rGaMU', title: '80# Cougar - "Bang a Gong" (T-Rex)', tags: ['80cougar', 'athensbusinessrocks', 'nucisspace', '40watt', 'athensga', 'athensgamusic', 'livemusic', 'benefit'] }
            ],
        },
        {
            title: '2012-10-26 Hayride @ Melting Point | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/qodpTnJbTf0/hqdefault.jpg',
            albumPage: '../music/2012-10-26-hayride-melting-point-athens-ga.html',
            filterNames: ['Hayride', 'Matt Joiner', 'Emily McCannon'],
            manualTags: ['hayride', 'mattjoiner', 'emilymccannon', 'meltingpoint', 'athensga', 'athensgamusic', 'livemusic'],
            videos: [
                { youtubeId: 'qodpTnJbTf0', title: 'Whole Lotta Love (partial) - Hayride with special guests Matt Joiner & Emily McCannon', tags: ['hayride', 'mattjoiner', 'emilymccannon', 'meltingpoint', 'athensga', 'athensgamusic', 'livemusic'] }
            ],
        },
        {
            title: '2011-05-06 The Cottage Benefit | Athens, GA',
            isVideoCollection: true,
            coverUrl: 'https://i.ytimg.com/vi/F7raASzmRgo/hqdefault.jpg',
            albumPage: '../music/2011-05-06-cottage-benefit-athens-ga.html',
            filterNames: ['Betsy Franck', 'Kimberly Morgan', 'Pamela Baxendale', 'Scott Baxendale', 'Matt Hudgins'],
            manualTags: ['betsyfranck', 'kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'matthudgins', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic', 'benefit'],
            videos: [
                { youtubeId: 'QqqRcRE0mvY', title: 'Betsy Franck with Kimberly Morgan & Friends - "City of Gold"', tags: ['betsyfranck', 'kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'ctkoZ_CDlJU', title: 'Betsy Franck with Kimberly Morgan & Friends', tags: ['betsyfranck', 'kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: '3d4YT8zqLLE', title: 'Betsy Franck with Kimberly Morgan & Friends', tags: ['betsyfranck', 'kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'F7raASzmRgo', title: 'Kimberly Morgan & Friends - "Don\'t Cry to Me"', tags: ['kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'jMeqorshaWw', title: 'Kimberly Morgan & Friends', tags: ['kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'O-IPHYzm0jg', title: 'Kimberly Morgan & Friends - "Falling"', tags: ['kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'xWt8BUk2asw', title: 'Kimberly Morgan & Friends - "Lady"', tags: ['kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'eMOlllcabmQ', title: 'Kimberly Morgan & Friends - "Joshua"', tags: ['kimberlymorgan', 'pamelabaxendale', 'scottbaxendale', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] },
                { youtubeId: 'nBLW6ivpsf8', title: 'Matt Hudgins', tags: ['matthudgins', 'cottagebenefit', 'athensga', 'athensgamusic', 'livemusic'] }
            ],
        },
    ],
    events: [
        {
            title: '2026-07-15 World Cup England vs Argentina | Atlanta, GA',
            photoCount: 22,
            coverUrl: 'https://live.staticflickr.com/65535/55417113120_e70f082376_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720334823270/',
            albumPage: '../events/2026-07-15-world-cup-england-argentina-atlanta-stadium-atlanta-ga.html',
            filterNames: ['World Cup'],
        },
        {
            // Same show/page as the music-collection entry - it's listed in both
            // collections since it's both a Michael Stipe/Andy LeMaster/David Barbe
            // performance and a Doug Emhoff campaign event. Music dropdown shows the
            // musicians; this entry is what makes it findable under "Doug Emhoff" too.
            title: '2024-10-10 Doug Emhoff Event with Michael Stipe | Athens, GA',
            photoCount: 11,
            coverUrl: 'https://live.staticflickr.com/65535/54067165798_b819722fc9_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321198241/',
            albumPage: '../music/2024-10-10-doug-emhoff-event-with-michael-stipe-athens-ga.html',
            filterNames: ['Doug Emhoff'],
        },
        {
            title: '2026-04-14 Protest Against JD Vance Turning Point Rally @ Akins Ford Arena | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/55216651940_3fc39a2fbf_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720333183378/',
            albumPage: '../events/2026-04-14-protest-jd-vance-turning-point-rally-athens-ga.html',
            filterNames: ['Protest', 'JD Vance', 'Turning Point', 'Young Dems UGA', 'UGA YDSA'],
        },
        {
            title: '2026-03-08 Detention Center Not Welcome Here Rally @ Courthouse | Monroe, GA',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332470464/',
            coverUrl: 'https://live.staticflickr.com/65535/55139670970_24281808f3_z.jpg',
            albumPage: '../events/2026-03-08-detention-center-not-welcome-here-rally-courthouse-monroe-ga.html',
            filterNames: ['Detention Center'],
        },
        { 
            title: '2026-02-15 Corey Forrester & Drew Morgan @ Hendershots | Athens, GA', 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332417129',
            coverUrl: 'https://live.staticflickr.com/65535/55133360718_2809c9d469_z.jpg',
            albumPage: '../events/2026-02-15-corey-forrester-drew-morgan-hendershots-athens-ga.html'
        },
        { 
            title: '2026-03-28 No Kings #3 @ Athens, GA',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720332808125/',
            coverUrl: 'https://live.staticflickr.com/65535/55177881242_0049a4b7da_z.jpg',
            albumPage: '../events/2026-03-28-no-kings-3-athens-ga.html'
        },
        {
            title: '2026-01-13 Get Ice Out for Good Protest | Athens, GA',
            flickrUrl: 'https://flickr.com/photos/jayneclamp/albums/72177720331571028',
            coverUrl: 'https://live.staticflickr.com/65535/55051286788_9dbb79239e_z.jpg',
            albumPage: '../events/2026-01-13-get-ice-out-for-good-protest-athens-ga.html'
        },
         { 
            title: '2025-10-25 Wild Rumpus Halloween | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329935603/',
            coverUrl: 'https://live.staticflickr.com/65535/54882711328_8efe955dea_z.jpg',
            albumPage: '../events/2025-10-25-wild-rumpus-athens-ga.html'
        }, 
        { 
            title: '2025-10-18 No Kings #2 | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329866562/',
            coverUrl: 'https://live.staticflickr.com/65535/54875117537_93e96d972a_z.jpg',
            albumPage: '../events/2025-10-18-no-kings-athens-ga.html'
        },  
        { 
            title: '2025-06-14 No Kings #1  | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329940176/',
            coverUrl: 'https://live.staticflickr.com/65535/54885223885_8a11e33546_z.jpg',
            albumPage: '../events/2025-06-14-no-kings-downtown-athens.html'
        },  
        { 
            title: '2024-10-26 Wild Rumpus Halloween | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321549494/',
            coverUrl: 'https://live.staticflickr.com/65535/54098561188_ce988963fc_z.jpg',
            albumPage: '../events/2024-10-26-wild-rumpus-athens-ga.html'
        },
        { 
            title: '2022-10-14 UGA Homecoming Parade | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330192248/',
            albumPage: '../events/2022-10-14-uga-homecoming-parade-athens-ga.html'
        },
        { 
            title: '2022-09-17 UCW Labor Rally w Stacey Abrams | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329962161/with/54887201501',
            coverUrl: 'https://live.staticflickr.com/65535/54886322487_2b2240f709_z.jpg',
            albumPage: '../events/2022-09-17-ucw-labor-rally-w-stacey-abrams-athens-ga.html'
        },
        {
            title: '2022-10-19 Stacey Abrams Bus Tour @ College Square | Athens, GA',
            coverUrl: 'https://live.staticflickr.com/65535/54937360076_cd5f977eec_z.jpg',
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720330456911/',
            albumPage: '../events/2022-10-19-stacey-abrams-bus-tour-college-square-athens-ga.html',
        },
        { 
            title: '2022-06-12 Pride Parade @ Athens, GA',
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329972373/',
            coverUrl: 'https://live.staticflickr.com/65535/54886560369_27df1d1567_z.jpg',
            albumPage: '../events/2022-06-12-pride-parade-athens-ga.html'
        },
        { 
            title: '2021-10-31 Wild Rumpus Halloween | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329961440/',
            coverUrl: 'https://live.staticflickr.com/65535/54886500317_39f45f57ac_z.jpg',
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
            coverUrl: 'https://live.staticflickr.com/65535/54887679959_4cc6bae0aa_z.jpg',
            albumPage: '../events/2020-06-06-black-lives-matter-protest-athens-ga.html'
        },
        { 
            title: '2018-03-24 March for Our Lives Rally @ UGA Arch | Athens, GA', 
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
            title: 'Winter 2025 @ Cobham | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720323325987/',
            coverUrl: 'https://live.staticflickr.com/65535/54279614662_ccb9db86a6_z.jpg',
            albumPage: '../landscapes/2025-winter-athens-ga.html'
        }, 
    ],
    pets: [
        // Add your pet photography albums here
    ]
};

// Display album photos in grid
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

// Display single photo function (for albums with just one photo)
async function displaySinglePhoto(photoUrl) {
    const loading = document.getElementById('photo-count');
    if (loading) loading.textContent = 'Loading photo...';

    // Extract photo ID from URL
    const photoId = photoUrl.match(/\/(\d+)\/?$/)?.[1];
    if (!photoId) {
        console.error('Could not extract photo ID from URL:', photoUrl);
        return;
    }

    try {
        // Get photo info from Flickr API
        const url = `https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=${FLICKR_CONFIG.apiKey}&photo_id=${photoId}&format=json&nojsoncallback=1`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.stat === 'ok') {
            const photo = data.photo;

            // Create photo object
            const photoObj = {
                id: photo.id,
                title: photo.title._content,
                description: photo.description._content || '',
                thumbnail: `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`,
                large: `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
                url: photoUrl
            };

            // Update photo count
            if (loading) loading.textContent = '1 photo';

            // Display the photo
            const photoGrid = document.getElementById('photo-grid');
            if (photoGrid) {
                photoGrid.innerHTML = `
                    <div class="photo-item" onclick="openLightbox(0)">
                        <img src="${photoObj.thumbnail}" alt="${photoObj.title}" loading="lazy">
                    </div>
                `;
            }

            // Store for lightbox
            window.currentPhotos = [photoObj];

        } else {
            console.error('Flickr API error:', data.message);
            if (loading) loading.textContent = 'Error loading photo';
        }
    } catch (error) {
        console.error('Error fetching photo:', error);
        if (loading) loading.textContent = 'Error loading photo';
    }
}

// Display album photos function
async function displayAlbumPhotos(albumUrl, photoLimit = null) {
    const photosGrid = document.getElementById('photo-grid') || document.getElementById('photos-grid');
    const loading = document.getElementById('loading');

    if (!photosGrid) {
        console.error('photo-grid or photos-grid element not found');
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
    
    
    // Check if this album has manual photos defined (for legacy albums with API issues)
    const albumData = findAlbumByUrl(albumUrl);
    
    // Check if album is marked as not API accessible
    if (albumData && albumData.apiAccessible === false) {
        photosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ccc;">
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">Photos from this album are available on Flickr</p>
                <a href="${albumUrl}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold; font-size: 1.1rem;">
                    View Album on Flickr →
                </a>
            </div>
        `;
        if (loading) loading.style.display = 'none';
        return;
    }
    
    if (albumData && albumData.manualPhotos) {
        let photos = albumData.manualPhotos.map(photo => ({
            id: photo.id,
            title: photo.title,
            thumbnail: `https://live.staticflickr.com/2567/${photo.id}_411f84cb92_c.jpg`,
            large: `https://live.staticflickr.com/2567/${photo.id}_411f84cb92_b.jpg`,
            url: `https://www.flickr.com/photos/${FLICKR_CONFIG.userId}/${photo.id}/`
        }));
        
        // Apply photo limit if specified
        if (photoLimit && photos.length > photoLimit) {
            photos = photos.slice(0, photoLimit);
        }
        
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
        
        return;
    }
    
    // Track album view (private - logged to console only)
    const viewCount = ViewTracker.trackAlbumView(albumId);
    
    // Track album view in Google Analytics
    if (typeof gtag !== 'undefined') {
        const albumTitle = document.querySelector('.page-title')?.textContent || 'Unknown Album';
        gtag('event', 'album_view', {
            'album_id': albumId,
            'album_title': albumTitle
        });
    }
    
    // Fetch photos from Flickr
    let photos = await fetchFlickrAlbumPhotos(albumId);
    
    // Apply photo limit if specified
    if (photoLimit && photos && photos.length > photoLimit) {
        photos = photos.slice(0, photoLimit);
    }
    
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
    
    
    // Apply manual tags if specified (for albums where we limited photos but need to preserve tags)
    if (albumData && albumData.manualTags) {
        photos.forEach(photo => {
            // Merge existing tags with manual tags, removing duplicates
            const existingTags = photo.tags || [];
            photo.tags = [...new Set([...existingTags, ...albumData.manualTags])];
        });
    }
    
    // Debug: Check what description data we have
    photos.forEach((photo, i) => {
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

// Normalize venue names so dropdown/filter show one canonical entry per venue.
// Consolidates all "Georgia Theatre" spellings/suffixes into "Georgia Theatre"
// (and "Georgia Theatre Rooftop" for rooftop shows), and strips "- AthFest Night X" suffixes.
function normalizeVenueName(venue) {
    if (!venue) return venue;
    let v = venue.trim();
    // Strip trailing event-night suffixes like " - AthFest Night 2"
    v = v.replace(/\s*[-–—]\s*AthFest.*$/i, '').trim();
    // Georgia Theatre variations
    if (/theat(?:re|er)/i.test(v) && /\b(?:georgia|ga)\b/i.test(v)) {
        return /rooftop/i.test(v) ? 'Georgia Theatre Rooftop' : 'Georgia Theatre';
    }
    return v;
}

// Display albums from manual configuration
function displayAlbums(collectionType, filterYear = 'all', filterBand = 'all', filterVenue = 'all', append = false) {
    const albumsGrid = document.getElementById('albums-grid');
    const loading = document.getElementById('loading');

    if (!albumsGrid) {
        return;
    }

    // Get albums for this collection
    let albums = ALBUM_DATA[collectionType] || [];

    // Sort albums by date (newest to oldest) - titles start with YYYY-MM-DD
    albums.sort((a, b) => {
        const dateA = a.title.substring(0, 10); // Extract YYYY-MM-DD
        const dateB = b.title.substring(0, 10);
        return dateB.localeCompare(dateA); // Sort descending (newest first)
    });

    // Filter by year if specified
    if (filterYear !== 'all') {
        albums = albums.filter(album => album.title.startsWith(filterYear));
    }

    // Filter by band if specified (for music collection)
    if (filterBand !== 'all' && collectionType === 'music') {
        albums = albums.filter(album => {
            // Check if album has custom filterNames array (for albums with multiple artists)
            if (album.filterNames && Array.isArray(album.filterNames)) {
                return album.filterNames.some(name => 
                    name.toLowerCase().includes(filterBand.toLowerCase())
                );
            }
            
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
            
            // Normalize artist names for filtering
            let normalizedArtistSection = artistSection;
            if (normalizedArtistSection.toLowerCase() === 'kevn kinney band') {
                normalizedArtistSection = 'Kevn Kinney';
            }
            
            // Normalize Jerry Joseph variations to just "Jerry Joseph"
            if (normalizedArtistSection.toLowerCase() === 'jerry joseph & the jackmormons' || 
                normalizedArtistSection.toLowerCase() === 'jerry joseph and the jackmormons' ||
                normalizedArtistSection.toLowerCase() === 'jackmormons' ||
                normalizedArtistSection.toLowerCase() === 'the jackmormons') {
                normalizedArtistSection = 'Jerry Joseph';
            }
            
            return normalizedArtistSection.toLowerCase().includes(filterBand.toLowerCase());
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
            
            // Special handling for AthFest events
            if (album.title.toLowerCase().includes('athfest') && filterVenue.toLowerCase() === 'athfest') {
                return true;
            }
            
            // Check if the selected venue matches any of the venues in this album
            // Handle combined venues like "40 Watt & Nowhere Bar"
            // Compare on normalized names so Georgia Theatre variations collapse to one
            // while keeping "Georgia Theatre Rooftop" distinct.
            const normalizedFilter = normalizeVenueName(filterVenue).toLowerCase();
            const individualVenues = venue.split(/\s*&\s+/);
            return individualVenues.some(individualVenue =>
                normalizeVenueName(individualVenue.trim()).toLowerCase() === normalizedFilter
            );
        });
    }

    // Store filtered albums globally for load more functionality
    // (must happen after year/band/venue filtering so "Load More" only
    // ever pulls from within the currently active filter)
    window.currentFilteredAlbums = albums;

    // Initial load: only show first batch for performance (Instagram browser optimization)
    const INITIAL_ALBUM_COUNT = 18;
    if (!append && albums.length > INITIAL_ALBUM_COUNT) {
        albums = albums.slice(0, INITIAL_ALBUM_COUNT);
        window.hasMoreAlbums = true;
        window.currentAlbumIndex = INITIAL_ALBUM_COUNT;
    } else {
        window.hasMoreAlbums = false;
        window.currentAlbumIndex = albums.length;
    }

    // Hide loading
    if (loading) loading.style.display = 'none';

    // If no albums configured yet, show appropriate message
    if (albums.length === 0) {
        // Detect which collection page we're on
        const currentPath = window.location.pathname;
        const isTravel = currentPath.includes('travel.html') || currentPath.endsWith('/travel');
        const isPets = currentPath.includes('pets.html') || currentPath.endsWith('/pets');
        
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
        const albumId = `album-${collectionType}-${index}-${Date.now()}`;

        // If no coverUrl but we have a Flickr album, mark for lazy cover fetch (on scroll into view)
        let lazyAttr = '';
        if (!album.coverUrl && album.flickrUrl) {
            const flickrAlbumId = extractAlbumId(album.flickrUrl);
            if (flickrAlbumId) {
                lazyAttr = ` data-lazy-cover="${flickrAlbumId}"`;
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
                         style=""${lazyAttr}
                         onerror="this.src='https://via.placeholder.com/800x600/000000/FFFFFF?text=${encodeURIComponent(album.title)}'">
                    <div class="album-overlay">
                        <h3>${album.displayTitle || album.title}</h3>
                        <p class="album-info">${album.photoCount || '?'} photos</p>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    // Lazy-fetch Flickr covers only when their card scrolls into view (fallback for albums without a baked-in coverUrl)
    lazyLoadAlbumCovers(albumsGrid);

    // Show/hide load more button
    updateLoadMoreButton();
}

// Videos page: video-only albums live scattered across ALBUM_DATA's
// collections (isVideoCollection: true), rather than in a collection of
// their own, so this collects them across all of ALBUM_DATA instead of
// reading a single ALBUM_DATA[collectionType] array like displayAlbums does.
function displayVideoAlbums() {
    const videosGrid = document.getElementById('videos-grid');
    const loading = document.getElementById('loading');
    if (!videosGrid) return;

    let videoAlbums = [];
    Object.keys(ALBUM_DATA).forEach(collectionType => {
        ALBUM_DATA[collectionType].forEach(album => {
            if (album.isVideoCollection) {
                videoAlbums.push(album);
            }
        });
    });

    videoAlbums.sort((a, b) => b.title.substring(0, 10).localeCompare(a.title.substring(0, 10)));

    if (loading) loading.style.display = 'none';

    if (videoAlbums.length === 0) {
        videosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No videos yet.</p>';
        return;
    }

    videosGrid.innerHTML = videoAlbums.map((album, index) => {
        const videoCount = (album.videos || []).length;
        return `
            <a href="${album.albumPage}" class="album-card" id="video-album-${index}">
                <div class="album-image">
                    <img src="${album.coverUrl}" alt="${album.title}" loading="lazy">
                    <div class="album-overlay">
                        <h3>${album.title}</h3>
                        <p class="album-info"><i class="fas fa-play-circle"></i> ${videoCount} video${videoCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

// Load more albums when "Load More" button is clicked
function loadMoreAlbums() {
    const albumsGrid = document.getElementById('albums-grid');
    const collectionType = getCollectionTypeFromPath();

    if (!albumsGrid || !window.currentFilteredAlbums || !collectionType) {
        return;
    }

    const INITIAL_ALBUM_COUNT = 18;
    const LOAD_MORE_COUNT = 18;
    const currentIndex = window.currentAlbumIndex || INITIAL_ALBUM_COUNT;
    const nextBatch = window.currentFilteredAlbums.slice(currentIndex, currentIndex + LOAD_MORE_COUNT);

    if (nextBatch.length === 0) {
        window.hasMoreAlbums = false;
        updateLoadMoreButton();
        return;
    }

    // Append new albums to the grid
    const albumCards = nextBatch.map((album, index) => {
        const albumId = `album-${collectionType}-${currentIndex + index}-${Date.now()}`;

        let lazyAttr = '';
        if (!album.coverUrl && album.flickrUrl) {
            const flickrAlbumId = extractAlbumId(album.flickrUrl);
            if (flickrAlbumId) {
                lazyAttr = ` data-lazy-cover="${flickrAlbumId}"`;
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
                         style=""${lazyAttr}
                         onerror="this.src='https://via.placeholder.com/800x600/000000/FFFFFF?text=${encodeURIComponent(album.title)}'">
                    <div class="album-overlay">
                        <h3>${album.displayTitle || album.title}</h3>
                        <p class="album-info">${album.photoCount || '?'} photos</p>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    albumsGrid.insertAdjacentHTML('beforeend', albumCards);

    // Update current index
    window.currentAlbumIndex = currentIndex + LOAD_MORE_COUNT;

    // Check if there are more albums to load
    if (window.currentAlbumIndex >= window.currentFilteredAlbums.length) {
        window.hasMoreAlbums = false;
    }

    // Lazy-load covers for new cards
    lazyLoadAlbumCovers(albumsGrid);

    // Update button visibility
    updateLoadMoreButton();
}

// Update the load more button visibility
function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) return;

    if (window.hasMoreAlbums && window.currentFilteredAlbums && window.currentAlbumIndex < window.currentFilteredAlbums.length) {
        loadMoreBtn.style.display = 'block';
        const remaining = window.currentFilteredAlbums.length - window.currentAlbumIndex;
        loadMoreBtn.textContent = `Load More (${remaining} remaining)`;
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Fetch Flickr album covers on demand as cards enter the viewport
function lazyLoadAlbumCovers(container) {
    const lazyImgs = container.querySelectorAll('img[data-lazy-cover]');
    if (lazyImgs.length === 0) return;

    const loadCover = (img) => {
        const flickrAlbumId = img.getAttribute('data-lazy-cover');
        if (!flickrAlbumId) return;
        img.removeAttribute('data-lazy-cover');
        fetchFlickrAlbumCover(flickrAlbumId).then(coverUrl => {
            if (coverUrl) img.src = coverUrl;
        });
    };

    if (!('IntersectionObserver' in window)) {
        // Fallback: no observer support, just load them all
        lazyImgs.forEach(loadCover);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadCover(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '300px' });

    lazyImgs.forEach(img => observer.observe(img));
}

// Collection page init

// Initialize collections when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize collections if on a collection page
    // Handle both .html and non-.html URLs (Netlify Pretty URLs may strip .html)
    const pagePath = window.location.pathname;
    if (pagePath.includes('/collections/') || 
        pagePath.includes('music.html') || pagePath.endsWith('/music') ||
        pagePath.includes('events.html') || pagePath.endsWith('/events') ||
        pagePath.includes('travel.html') || pagePath.endsWith('/travel') ||
        pagePath.includes('birds.html') || pagePath.endsWith('/birds') ||
        pagePath.includes('landscapes.html') || pagePath.endsWith('/landscapes') ||
        pagePath.includes('pets.html') || pagePath.endsWith('/pets')) {
        const collectionType = getCollectionTypeFromPath();
        
        if (collectionType && ALBUM_DATA[collectionType]) {
            displayAlbums(collectionType);
            initializeFilters(collectionType);
        } else {
            console.error('Collection type or data not found:', collectionType, ALBUM_DATA);
        }
    }

    // Videos page
    if (document.getElementById('videos-grid')) {
        displayVideoAlbums();
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
    
    // Handle both /collections/music and music.html formats
    if (path.includes('music.html') || path.includes('/music')) return 'music';
    if (path.includes('events.html') || path.includes('/events')) return 'events';
    if (path.includes('travel.html') || path.includes('/travel')) return 'travel';
    if (path.includes('birds.html') || path.includes('/birds')) return 'birds';
    if (path.includes('landscapes.html') || path.includes('/landscapes')) return 'landscapes';
    if (path.includes('pets.html') || path.includes('/pets')) return 'pets';
    
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
                // Check if album has custom filterNames array (for albums with multiple artists)
                if (album.filterNames && Array.isArray(album.filterNames)) {
                    album.filterNames.forEach(name => {
                        // Don't add event names like AthFest, Porchfest to band filter
                        if (name.toLowerCase() !== 'athfest' && name.toLowerCase() !== 'porchfest') {
                            artists.add(name);
                        }
                    });
                    return; // Skip normal processing if filterNames exist
                }
                
                // Always use the original title for extracting artist names for the dropdown
                // This ensures individual artists like "Dave Marr" appear in the filter
                
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
                    
                    // Normalize "Kevn Kinney Band" to just "Kevn Kinney" for dropdown filtering
                    if (cleanArtist.toLowerCase() === 'kevn kinney band') {
                        cleanArtist = 'Kevn Kinney';
                    }
                    
                    // Normalize Jerry Joseph variations to just "Jerry Joseph"
                    if (cleanArtist.toLowerCase() === 'jerry joseph & the jackmormons' || 
                        cleanArtist.toLowerCase() === 'jerry joseph and the jackmormons' ||
                        cleanArtist.toLowerCase() === 'jackmormons' ||
                        cleanArtist.toLowerCase() === 'the jackmormons') {
                        cleanArtist = 'Jerry Joseph';
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
                updateClearButtonVisibility();
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
                // Special handling for AthFest events - add as 'AthFest' and skip venue extraction
                if (album.title.toLowerCase().includes('athfest')) {
                    venues.add('AthFest');
                    return; // Skip venue extraction for AthFest albums
                }

                // Special handling for Porchfest events
                if (album.title.toLowerCase().includes('porchfest')) {
                    venues.add('Porchfest');
                    return; // Skip venue extraction for Porchfest albums
                }

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
                    // Split venues that are combined with & (e.g., "40 Watt & Nowhere Bar")
                    const individualVenues = venue.split(/\s*&\s+/);
                    individualVenues.forEach(individualVenue => {
                        venues.add(normalizeVenueName(individualVenue.trim()));
                    });
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
                updateClearButtonVisibility();
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
                } else if (eventName.toLowerCase().includes('world cup')) {
                    eventTypes.add('World Cup');
                } else if (eventName.toLowerCase().includes('doug emhoff')) {
                    eventTypes.add('Doug Emhoff');
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
                updateClearButtonVisibility();
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
            
            // Update clear button visibility after year change
            updateClearButtonVisibility();
        });
    });
    
    // Initialize clear button visibility on page load
    setTimeout(() => {
        updateClearButtonVisibility();
    }, 100);
}

// Album navigation

// Get album navigation data for previous/next functionality
function getAlbumNavigation(currentAlbumPath, collectionType) {
    if (!ALBUM_DATA[collectionType]) return { prev: null, next: null };
    
    // Sort albums by date (newest first, same as collection page)
    const albums = [...ALBUM_DATA[collectionType]].sort((a, b) => {
        const dateA = a.title.substring(0, 10);
        const dateB = b.title.substring(0, 10);
        return dateB.localeCompare(dateA);
    });
    
    // Find current album index
    const currentIndex = albums.findIndex(album => 
        album.albumPage && currentAlbumPath.includes(album.albumPage.split('/').pop())
    );
    
    if (currentIndex === -1) return { prev: null, next: null };
    
    return {
        prev: currentIndex < albums.length - 1 ? albums[currentIndex + 1] : null,
        next: currentIndex > 0 ? albums[currentIndex - 1] : null
    };
}

// Initialize album navigation arrows
function initializeAlbumNavigation() {
    const prevBtn = document.getElementById('prev-album');
    const nextBtn = document.getElementById('next-album');
    
    if (!prevBtn || !nextBtn) return;
    
    const currentPath = window.location.pathname;
    const collectionType = currentPath.includes('/music/') ? 'music' : 
                          currentPath.includes('/events/') ? 'events' : null;
    
    if (!collectionType) return;
    
    const navigation = getAlbumNavigation(currentPath, collectionType);
    
    // Set up previous album button
    if (navigation.prev) {
        prevBtn.onclick = () => {
            window.location.href = navigation.prev.albumPage;
        };
        prevBtn.title = `Previous: ${navigation.prev.title}`;
    } else {
        prevBtn.disabled = true;
        prevBtn.title = 'No previous album';
    }
    
    // Set up next album button
    if (navigation.next) {
        nextBtn.onclick = () => {
            window.location.href = navigation.next.albumPage;
        };
        nextBtn.title = `Next: ${navigation.next.title}`;
    } else {
        nextBtn.disabled = true;
        nextBtn.title = 'No next album';
    }

    const currentAlbum = findCurrentAlbum(currentPath, collectionType);
    if (currentAlbum) {
        displayRelatedAlbums(currentAlbum, collectionType);
    }
}

// ===================================
// Related albums (More from this artist / More at this venue)
// ===================================

// filterNames arrays often mix in venue/event names (e.g. ['Bloodkin', 'Georgia
// Theatre', 'AthFest']) so they're also browsable from the artist-filter
// dropdown. That's fine for filtering, but for "related albums" it produces
// nonsense like "More from Bloodkin" linking to unrelated AthFest shows.
// Build a set of every real venue name in ALBUM_DATA so those tokens (plus a
// couple of known event-series labels) can be excluded from artist matching.
function getKnownVenueAndEventNames() {
    if (window._knownVenueNames) return window._knownVenueNames;
    const names = new Set(['athfest', 'porchfest']);
    for (const coll in ALBUM_DATA) {
        ALBUM_DATA[coll].forEach(a => {
            const atMatch = a.title.match(/\s+@\s+(.+?)(?:\s*\|\s*|$)/);
            const pipeMatch = a.title.match(/\s+\|\s+(.+?)$/);
            const venue = atMatch ? atMatch[1].trim() : (pipeMatch ? pipeMatch[1].trim() : '');
            if (venue) {
                venue.split(/\s*&\s+/).forEach(v => names.add(v.trim().toLowerCase()));
            }
        });
    }
    window._knownVenueNames = names;
    return names;
}

// Extract artist name(s) for an album. Mirrors the artist-filter logic in
// displayAlbums() so "related" always agrees with what the artist dropdown
// considers the same act.
function getAlbumArtists(album) {
    if (album.filterNames && Array.isArray(album.filterNames)) {
        const knownVenues = getKnownVenueAndEventNames();
        const realArtists = album.filterNames.filter(name => !knownVenues.has(name.toLowerCase()));
        return realArtists.length ? realArtists : album.filterNames;
    }

    const match = album.title.match(/\d{4}-\d{2}-\d{2}\s+(.+?)\s+(?:@|\|)/);
    if (!match) return [];
    let artistSection = match[1].trim();

    if (artistSection.toLowerCase() === 'porchfest') {
        return ['David Barbe', 'T. Hardy Morris', 'Don Chambers', 'Trycoh', 'Lazy Horse', 'Infinite Favors'];
    }

    const withMatch = artistSection.match(/\bwith\s+(.+)$/i);
    if (withMatch && artistSection.toLowerCase().includes('event')) {
        artistSection = withMatch[1].trim();
    }

    if (artistSection.toLowerCase() === 'kevn kinney band') {
        artistSection = 'Kevn Kinney';
    }
    if (['jerry joseph & the jackmormons', 'jerry joseph and the jackmormons', 'jackmormons', 'the jackmormons'].includes(artistSection.toLowerCase())) {
        artistSection = 'Jerry Joseph';
    }

    return [artistSection];
}

// Find the ALBUM_DATA entry matching the currently-loaded page.
function findCurrentAlbum(currentAlbumPath, collectionType) {
    const albums = ALBUM_DATA[collectionType] || [];
    return albums.find(album =>
        album.albumPage && currentAlbumPath.includes(album.albumPage.split('/').pop())
    ) || null;
}

// Build the "more from this artist" list for the current album.
// Political rallies/protests/campaign events - grouped together regardless of
// collection (some live under "events", some like the Doug Emhoff show live
// under "music") and regardless of recurring-series numbering ("No Kings #1",
// "#2", "#3" are all the same thing for relating purposes).
const POLITICAL_KEYWORDS = [
    'no kings', 'jon ossoff', 'turning point', 'jd vance', 'detention center',
    'get ice out', 'ucw labor rally', 'stacey abrams', 'black lives matter',
    'march for our lives', 'doug emhoff'
];

function isPoliticalAlbum(album) {
    const t = album.title.toLowerCase();
    return POLITICAL_KEYWORDS.some(k => t.includes(k));
}

function getRelatedAlbums(currentAlbum, collectionType) {
    const sortByDateDesc = (a, b) => b.title.substring(0, 10).localeCompare(a.title.substring(0, 10));

    if (isPoliticalAlbum(currentAlbum)) {
        const byArtist = [];
        ['music', 'events'].forEach(coll => {
            (ALBUM_DATA[coll] || []).forEach(a => {
                if (a.albumPage !== currentAlbum.albumPage && isPoliticalAlbum(a)) byArtist.push(a);
            });
        });
        byArtist.sort(sortByDateDesc);
        return { byArtist: byArtist.slice(0, 6), artistName: 'Politics' };
    }

    const albums = (ALBUM_DATA[collectionType] || []).filter(a => a.albumPage !== currentAlbum.albumPage);

    let byArtist = albums.filter(a => albumsAreRelated(currentAlbum, a)).sort(sortByDateDesc);

    // Drive-By Truckers members who are usually credited as a guest rather
    // than the headliner - surface the band (and, for Jay Gonzalez, his own
    // solo billings) as related too, even though a guest spot wouldn't
    // normally count via the primary-artist match above.
    const DBT_MEMBERS = ['patterson hood', 'mike cooley', 'jay gonzalez', 'brad morgan', 'matt patton'];
    const currentArtistsLower = getAlbumArtists(currentAlbum).map(n => n.toLowerCase());
    const matchedDBTMember = DBT_MEMBERS.find(m => currentArtistsLower.includes(m));
    if (matchedDBTMember) {
        const seenPages = new Set(byArtist.map(a => a.albumPage));
        const extra = [];
        if (matchedDBTMember === 'jay gonzalez') {
            albums.forEach(a => {
                if (!seenPages.has(a.albumPage) && isSameArtist(getAlbumArtists(a)[0], 'Jay Gonzalez')) {
                    extra.push(a);
                    seenPages.add(a.albumPage);
                }
            });
        }
        albums.forEach(a => {
            const primary = (getAlbumArtists(a)[0] || '').toLowerCase();
            const isDriveByTruckers = primary === 'drive by truckers' || primary === 'drive-by truckers';
            if (isDriveByTruckers && !seenPages.has(a.albumPage)) {
                extra.push(a);
                seenPages.add(a.albumPage);
            }
        });
        extra.sort(sortByDateDesc);
        byArtist = byArtist.concat(extra);
    }

    return { byArtist: byArtist.slice(0, 8), artistName: getAlbumArtists(currentAlbum)[0] || '' };
}

// Two names count as "the same artist" if they're identical, or one is the
// other plus a backing-band suffix ("Patterson Hood" vs "Patterson Hood &
// Friends" / "& the Sensurrounders").
function isSameArtist(nameA, nameB) {
    if (!nameA || !nameB) return false;
    const a = nameA.toLowerCase();
    const b = nameB.toLowerCase();
    if (a === b) return true;
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    if (!longer.startsWith(shorter)) return false;
    const nextChar = longer[shorter.length];
    return !nextChar || /[\s,&]/.test(nextChar);
}

// Two albums are related if their primary artists match, or - for
// multi-artist bill/benefit pages explicitly opted in via
// `relateOnAnyArtist` - if either album's primary artist matches ANY name
// on the other's bill. (Not the default, since matching on any shared name
// is how an incidental guest musician used to wrongly relate two otherwise
// unconnected headline acts.)
function albumsAreRelated(albumA, albumB) {
    const primaryA = getAlbumArtists(albumA)[0] || '';
    const primaryB = getAlbumArtists(albumB)[0] || '';
    if (isSameArtist(primaryA, primaryB)) return true;

    if (albumB.relateOnAnyArtist && getAlbumArtists(albumB).some(name => isSameArtist(primaryA, name))) {
        return true;
    }
    if (albumA.relateOnAnyArtist && getAlbumArtists(albumA).some(name => isSameArtist(primaryB, name))) {
        return true;
    }
    return false;
}

function renderRelatedAlbumCard(album) {
    const cover = album.coverUrl || '';
    return `
        <a href="${album.albumPage}" class="related-album-card">
            <div class="related-album-cover"><img src="${cover}" alt="" loading="lazy"></div>
            <span class="related-album-title">${album.title}</span>
        </a>
    `;
}

// Inject a "related albums" section right above the prev/next nav bar.
// Renders as a horizontally-scrolling rail (Netflix/Spotify-style) with
// arrow controls on desktop; on touch devices the arrows are hidden via CSS
// and the row is just swiped/scrolled natively.
function displayRelatedAlbums(currentAlbum, collectionType) {
    const bottomNav = document.querySelector('.album-bottom-navigation');
    if (!bottomNav) return;

    const related = getRelatedAlbums(currentAlbum, collectionType);
    if (!related.byArtist.length) return;

    let html = '<section class="related-albums-section"><div class="container">';
    const heading = related.artistName === 'Politics' ? 'More Political Events'
        : currentAlbum.relateOnAnyArtist ? 'More From These Artists'
        : `More from ${related.artistName}`;
    html += `<h3 class="related-albums-heading">${heading}</h3>`;
    html += '<div class="related-albums-rail">';
    html += '<button class="related-albums-arrow related-albums-arrow-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>';
    html += '<div class="related-albums-track">' + related.byArtist.map(renderRelatedAlbumCard).join('') + '</div>';
    html += '<button class="related-albums-arrow related-albums-arrow-right" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>';
    html += '</div>';
    html += '</div></section>';

    bottomNav.insertAdjacentHTML('beforebegin', html);

    const track = bottomNav.previousElementSibling.querySelector('.related-albums-track');
    const leftArrow = bottomNav.previousElementSibling.querySelector('.related-albums-arrow-left');
    const rightArrow = bottomNav.previousElementSibling.querySelector('.related-albums-arrow-right');
    const scrollByCard = () => track.clientWidth * 0.8;
    leftArrow.addEventListener('click', () => track.scrollBy({ left: -scrollByCard(), behavior: 'smooth' }));
    rightArrow.addEventListener('click', () => track.scrollBy({ left: scrollByCard(), behavior: 'smooth' }));
}

// Clear filter helpers

// Clear artist filter on music page
function clearArtistFilter() {
    const bandFilter = document.getElementById('band-filter');
    const clearBtn = document.getElementById('clear-artist-filter');
    
    if (bandFilter) {
        bandFilter.value = 'all';
        clearBtn.style.display = 'none';
        
        // Trigger change event to update display
        const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
        const venueFilter = document.getElementById('venue-filter');
        const selectedVenue = venueFilter ? venueFilter.value : 'all';
        displayAlbums('music', selectedYear, 'all', selectedVenue);
    }
}

// Clear venue filter on music page
function clearVenueFilter() {
    const venueFilter = document.getElementById('venue-filter');
    const clearBtn = document.getElementById('clear-venue-filter');
    
    if (venueFilter) {
        venueFilter.value = 'all';
        clearBtn.style.display = 'none';
        
        // Trigger change event to update display
        const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
        const bandFilter = document.getElementById('band-filter');
        const selectedBand = bandFilter ? bandFilter.value : 'all';
        displayAlbums('music', selectedYear, selectedBand, 'all');
    }
}

// Clear event filter on events page
function clearEventFilter() {
    const eventFilter = document.getElementById('event-filter');
    const clearBtn = document.getElementById('clear-event-filter');
    
    if (eventFilter) {
        eventFilter.value = 'all';
        clearBtn.style.display = 'none';
        
        // Trigger change event to update display
        const selectedYear = document.querySelector('.year-tab.active')?.dataset.year || 'all';
        displayAlbums('events', selectedYear, 'all');
    }
}

// Show/hide clear buttons based on filter selection
function updateClearButtonVisibility() {
    // Artist filter clear button
    const bandFilter = document.getElementById('band-filter');
    const clearArtistBtn = document.getElementById('clear-artist-filter');
    if (bandFilter && clearArtistBtn) {
        clearArtistBtn.style.display = bandFilter.value !== 'all' ? 'block' : 'none';
    }
    
    // Venue filter clear button
    const venueFilter = document.getElementById('venue-filter');
    const clearVenueBtn = document.getElementById('clear-venue-filter');
    if (venueFilter && clearVenueBtn) {
        clearVenueBtn.style.display = venueFilter.value !== 'all' ? 'block' : 'none';
    }
    
    // Event filter clear button
    const eventFilter = document.getElementById('event-filter');
    const clearEventBtn = document.getElementById('clear-event-filter');
    if (eventFilter && clearEventBtn) {
        clearEventBtn.style.display = eventFilter.value !== 'all' ? 'block' : 'none';
    }
}

// Contact form
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formMessage = document.getElementById('form-message');
        const submitButton = contactForm.querySelector('.submit-button');

        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        const body = new URLSearchParams(new FormData(contactForm)).toString();

        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        })
        .then(response => {
            if (!response.ok) throw new Error('Submission failed');
            formMessage.textContent = 'Thank you for your message! I\'ll get back to you soon.';
            formMessage.className = 'form-message success';
            formMessage.style.display = 'block';
            contactForm.reset();
        })
        .catch(() => {
            formMessage.textContent = 'Sorry, there was an error sending your message. Please try again.';
            formMessage.className = 'form-message error';
            formMessage.style.display = 'block';
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
        });
    });
}

// View stats (console helper)
// Type viewStats() in browser console to see all view statistics
window.viewStats = function() {
    const views = ViewTracker.getViews();
    const isOwner = ViewTracker.isOwner();
    Object.entries(views.albums).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
    });
    Object.entries(views.photos).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([id, count]) => {
    });
    return views;
};

// Enable owner mode (exclude your views)
window.enableOwnerMode = function() {
    localStorage.setItem('siteOwner', 'true');
};

// Disable owner mode (include your views)
window.disableOwnerMode = function() {
    localStorage.removeItem('siteOwner');
};

// Social meta tags

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
}

// Image downloads

// Allow right-click and downloads for user convenience

// Global header

// Global header HTML template
function createGlobalHeader() {
    // Determine if we're on index page or collection page for correct paths
    const isIndexPage = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
    const isRootPage = isIndexPage ||
        /^\/(music|events|travel|birds|landscapes|pets|misc|videos|tags|contact|about)(\.html)?$/.test(window.location.pathname);
    const basePath = isRootPage ? '' : '../';

    return `
        <header class="site-header">
            <div class="container">
                <h1 class="site-title"><a href="${basePath}index.html"><img id="site-logo" src="${basePath}images/JayneClampLogoTrans.png?v=1" alt="Jayne Clamp Photography" style="height: 85px; width: auto; vertical-align: middle;"></a></h1>
                <nav class="main-nav">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <ul class="nav-menu">
                        <li class="nav-utility">
                            <button class="theme-toggle" onclick="toggleTheme(); return false;" aria-label="Toggle light/dark mode"><i class="fas fa-moon"></i></button>
                            <a href="#" onclick="openSearchModal(); return false;" aria-label="Search"><i class="fas fa-search"></i></a>
                        </li>
                        <li class="collections-dropdown">
                            <a href="${basePath}index.html#collections" class="collections-trigger">Collections <i class="fas fa-chevron-down"></i></a>
                            <ul class="collections-menu">
                                <li><a href="${basePath}music.html">Music</a></li>
                                <li><a href="${basePath}events.html">Events</a></li>
                                <li><a href="${basePath}misc.html">Other</a></li>
                                <li><a href="${basePath}videos.html">Videos</a></li>
                            </ul>
                        </li>
                        <li><a href="${basePath}tags.html">Tags</a></li>
                        <li class="share-dropdown">
                            <a href="${basePath}contact.html" class="share-trigger">Contact <i class="fas fa-chevron-down"></i></a>
                            <ul class="share-menu">
                                <li><a href="https://instagram.com/jaynecougarmelonclamp" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a></li>
                                <li><a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> YouTube</a></li>
                                <li><a href="https://www.flickr.com/photos/jayneclamp" target="_blank" rel="noopener"><i class="fab fa-flickr"></i> Flickr</a></li>
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
        
        // Initialize mobile menu after header is replaced
        setTimeout(() => {
            initializeMobileMenu();
        }, 100);
        
        // Check what the new header looks like
        const newHeader = document.querySelector('.site-header');
        if (newHeader) {
        }
    } else {
    }
}

// Global footer

// Global footer HTML template
function createGlobalFooter() {
    // Determine the correct path prefix based on current page location
    const pathPrefix = window.location.pathname.includes('/music/') || 
                      window.location.pathname.includes('/events/') || 
                      window.location.pathname.includes('/landscapes/') ? '../' : '';
    
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
                <div class="footer-nav">
                    <a href="${pathPrefix}index.html">Home</a>
                    <div class="footer-dropdown">
                        <a href="${pathPrefix}index.html#collections" class="footer-dropdown-trigger"><span>Collections</span><i class="fas fa-chevron-down"></i></a>
                        <ul class="footer-dropdown-menu">
                            <li><a href="${pathPrefix}music.html">Music</a></li>
                            <li><a href="${pathPrefix}events.html">Events</a></li>
                            <li><a href="${pathPrefix}misc.html">Other</a></li>
                            <li><a href="${pathPrefix}videos.html">Videos</a></li>
                        </ul>
                    </div>
                    <a href="${pathPrefix}tags.html">Tags</a>
                    <div class="footer-dropdown">
                        <a href="${pathPrefix}contact.html" class="footer-dropdown-trigger"><span>Contact</span><i class="fas fa-chevron-down"></i></a>
                        <ul class="footer-dropdown-menu">
                            <li><a href="https://instagram.com/jaynecougarmelonclamp" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a></li>
                            <li><a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> YouTube</a></li>
                            <li><a href="https://www.flickr.com/photos/jayneclamp" target="_blank" rel="noopener"><i class="fab fa-flickr"></i> Flickr</a></li>
                            <li><a href="https://soundcloud.com/jclamp" target="_blank" rel="noopener"><i class="fab fa-soundcloud"></i> SoundCloud</a></li>
                        </ul>
                    </div>
                </div>
                <p class="copyright">&copy; ${new Date().getFullYear()} Jayne Clamp</p>
                <div class="legal-links">
                    <a href="${pathPrefix}privacy-policy.html">Privacy Policy</a>
                    <span class="separator">•</span>
                    <a href="${pathPrefix}terms-of-use.html">Terms of Use</a>
                    <span class="separator">•</span>
                    <a href="${pathPrefix}sitemap.html">Sitemap</a>
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
        } catch (error) {
            document.body.insertAdjacentHTML('beforeend', createGlobalFooter());
        }
    } else {
        // No existing footer or no parent, just append
        document.body.insertAdjacentHTML('beforeend', createGlobalFooter());
    }
}

// Theme toggle (light/dark mode)
// Default theme is dark. User can toggle to light; choice persists in localStorage.
function getStoredTheme() {
    try {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        // No saved preference - respect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    } catch (e) {
        return 'dark';
    }
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    updateThemeIcon(theme);
    updateLogoForTheme(theme);
}

function updateLogoForTheme(theme) {
    const logo = document.getElementById('site-logo');
    if (!logo) return;
    const newFile = theme === 'light' ? 'JayneClampLogoTrans.png' : 'JayneClampLogoTransInvert.png';
    logo.src = logo.src.replace(/JayneClampLogoTrans(Invert)?\.(png|jpg)/, newFile);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    const heroIcon = document.querySelector('.hero-theme-toggle i');
    if (!icon && !heroIcon) return;
    // Show a sun in light mode (click to go dark), a moon in dark mode (click to go light)
    const iconClass = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    if (icon) icon.className = iconClass;
    if (heroIcon) heroIcon.className = iconClass;
}

function toggleTheme() {
    const next = getStoredTheme() === 'light' ? 'dark' : 'light';
    try {
        localStorage.setItem('theme', next);
    } catch (e) {}
    applyTheme(next);
}

// Initialize global header and footer when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalHeader(); // Re-enabled for consistent navigation
    initializeGlobalFooter();
    initializeLightboxClickAdvance();
    injectStructuredData();

    // Apply saved theme and sync the toggle icon (header is built above)
    applyTheme(getStoredTheme());

    // Camera icon code removed - using logo image instead
});

// Structured data (JSON-LD) for search engines.
// Individual show/album pages live under /music/, /events/, /landscapes/,
// /birds/, /travel/, /pets/ - everything else (collection hubs, home, etc.)
// is treated as a regular page. Album pages already carry correct
// og:title/og:description/og:image/og:url meta tags, so reuse those rather
// than duplicating the same data a second time per page.
function injectStructuredData() {
    const isAlbumPage = /\/(music|events|landscapes|birds|travel|pets)\//.test(window.location.pathname);
    if (!isAlbumPage) return;

    const getMeta = (prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        return el ? el.getAttribute('content') : null;
    };

    const name = getMeta('og:title');
    const description = getMeta('og:description');
    const image = getMeta('og:image');
    const url = getMeta('og:url');
    if (!name || !url) return;

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name,
        url,
        author: { '@type': 'Person', name: 'Jayne Clamp' }
    };
    if (description) schema.description = description;
    if (image) schema.image = image;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// Scroll position restoration

// Save scroll position when navigating away from collection pages
function saveScrollPosition() {
    const scrollY = window.scrollY || window.pageYOffset;
    const path = window.location.pathname;
    
    // Only save for collection pages
    if (path.includes('/collections/')) {
        sessionStorage.setItem('scrollPosition_' + path, scrollY.toString());
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

// Cookie notice

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
});

// Mobile menu

function initializeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    
    if (mobileToggle && navMenu) {
        // Check if already initialized to prevent duplicate listeners
        if (mobileToggle.hasAttribute('data-initialized')) {
            return;
        }
        
        mobileToggle.setAttribute('data-initialized', 'true');
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
    allCameraIcons.forEach((icon, index) => {
    });
    
    // Check for CSS-generated content
    const siteTitle = document.querySelector('.site-title');
    if (siteTitle) {
        const beforeContent = window.getComputedStyle(siteTitle, '::before').content;
        const afterContent = window.getComputedStyle(siteTitle, '::after').content;
        
        const siteTitleLink = document.querySelector('.site-title a');
        if (siteTitleLink) {
            const linkBeforeContent = window.getComputedStyle(siteTitleLink, '::before').content;
            const linkAfterContent = window.getComputedStyle(siteTitleLink, '::after').content;
        }
    }
}

// Camera icon disabled - using logo image instead
function ensureSingleCameraIcon() {
    return;
}

// Photo tags functionality
let allAlbumPhotos = [];
let currentTagFilter = null;

function formatTagForDisplay(tag) {
    // Clean up tag display for better readability
    let displayTag = tag;
    
    // Add spaces before capital letters in camelCase (e.g., "johnDoe" -> "john Doe")
    displayTag = displayTag.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Add spaces before numbers (e.g., "johndoe22" -> "johndoe 22")
    displayTag = displayTag.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    
    // Convert to title case for better readability
    displayTag = displayTag.replace(/\b\w/g, l => l.toUpperCase());
    
    return displayTag;
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
            window.location.href = `../tags.html?tag=${encodeURIComponent(tag)}`;
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
    
    // Filter videos if they exist on the page
    const videoItems = document.querySelectorAll('.video-item');
    if (videoItems.length > 0) {
        videoItems.forEach(video => {
            const videoTags = video.getAttribute('data-tags');
            if (tag === null || (videoTags && videoTags.split(',').includes(tag))) {
                video.style.display = 'block';
            } else {
                video.style.display = 'none';
            }
        });
    }
}

// Tags page functionality
let allPhotosWithTags = []; // Store all photos globally for filtering
let allVideosWithTags = []; // Store all videos globally for filtering

// IndexedDB helper functions for tags caching
const TAGS_CACHE_DB = 'tags-cache';
const TAGS_CACHE_STORE = 'tags-data';
const TAGS_CACHE_KEY = 'all-tags-data';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

async function openTagsCacheDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(TAGS_CACHE_DB, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(TAGS_CACHE_STORE)) {
                db.createObjectStore(TAGS_CACHE_STORE);
            }
        };
    });
}

async function saveTagsToCache(tagsData, albumCount) {
    try {
        const db = await openTagsCacheDB();
        const transaction = db.transaction([TAGS_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(TAGS_CACHE_STORE);
        
        const cacheData = {
            tags: Array.from(tagsData.entries()),
            timestamp: Date.now(),
            albumCount: albumCount
        };
        
        store.put(cacheData, TAGS_CACHE_KEY);
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Error saving tags to cache:', error);
        return false;
    }
}

async function loadTagsFromCache() {
    try {
        const db = await openTagsCacheDB();
        const transaction = db.transaction([TAGS_CACHE_STORE], 'readonly');
        const store = transaction.objectStore(TAGS_CACHE_STORE);
        const request = store.get(TAGS_CACHE_KEY);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const cacheData = request.result;
                if (!cacheData) {
                    resolve(null);
                    return;
                }
                
                // Check if cache is expired
                const age = Date.now() - cacheData.timestamp;
                if (age > CACHE_EXPIRY_MS) {
                    console.log('Tags cache expired, age:', age, 'ms');
                    resolve(null);
                    return;
                }
                
                // Convert array back to Map
                const tagsMap = new Map(cacheData.tags);
                resolve({
                    tags: tagsMap,
                    timestamp: cacheData.timestamp,
                    albumCount: cacheData.albumCount
                });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading tags from cache:', error);
        return null;
    }
}

async function clearTagsCache() {
    try {
        const db = await openTagsCacheDB();
        const transaction = db.transaction([TAGS_CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(TAGS_CACHE_STORE);
        store.delete(TAGS_CACHE_KEY);
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Error clearing tags cache:', error);
        return false;
    }
}

async function initializeTagsPage() {
    
    const tagsContainer = document.getElementById('tags-container');
    const loadingMessage = document.getElementById('tags-loading-message');
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
    
    // Show loading message in main body area
    if (loadingMessage) {
        if (tagParam) {
            loadingMessage.innerHTML = `<p style="color: #999 !important; width: 100%; text-align: center; margin: 1rem 0;">Summoning photos tagged "${formatTagForDisplay(tagParam)}" from the digital void... <span id="tags-progress">0</span> albums processed</p>`;
        } else {
            loadingMessage.innerHTML = '<p style="color: #999 !important; width: 100%; text-align: center; margin: 1rem 0;">Herding cats and organizing pixels... <span id="tags-progress">0</span> albums processed</p>';
        }
    }
    
    // Try to load from cache first
    const cachedData = await loadTagsFromCache();
    
    // Fetch all photos with tags from all albums
    const allTags = new Map(); // Map of tag -> array of photos
    const allCollections = ['music', 'events', 'landscapes'];
    let processedCount = 0;
    let totalAlbums = 0;
    
    // Count total albums
    allCollections.forEach(collectionType => {
        totalAlbums += (ALBUM_DATA[collectionType] || []).length;
    });
    
    // If cache is fresh and album count matches, use it. Album count alone
    // doesn't catch new videos/tags added to an *existing* album, so also
    // expire the cache after a few hours regardless of count - users
    // shouldn't have to notice a stale "Refresh" link to see new content.
    const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
    const cacheIsFresh = cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL_MS;
    if (cachedData && cacheIsFresh && cachedData.albumCount === totalAlbums) {
        console.log('Loading tags from cache - instant load!');
        allTags.clear();
        cachedData.tags.forEach((value, key) => {
            allTags.set(key, value);
        });
        
        // Rebuild allPhotosWithTags and allVideosWithTags from cache
        allPhotosWithTags = [];
        allVideosWithTags = [];
        allTags.forEach((items) => {
            items.forEach(item => {
                if (item.type === 'photo') {
                    allPhotosWithTags.push(item);
                } else if (item.type === 'video') {
                    allVideosWithTags.push(item);
                }
            });
        });
        
        // Update loading message to show cache was used
        if (loadingMessage) {
            const cacheAge = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60); // minutes
            loadingMessage.innerHTML = `<p style="color: #999 !important; width: 100%; text-align: center; margin: 1rem 0;">Loaded from cache (${cacheAge} minutes old) - <span id="tags-progress">${totalAlbums}</span> albums</p>`;
        }
        
        // Update cache status indicator
        const cacheStatus = document.getElementById('cache-status');
        if (cacheStatus) {
            const cacheAge = Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60);
            cacheStatus.innerHTML = `<i class="fas fa-database"></i> Cached (${cacheAge} minutes old) • <a href="#" onclick="refreshTagsCache(); return false;" style="color: #ccc; text-decoration: underline;">Refresh</a>`;
        }
        
        // Display tags immediately
        displayTags(allTags);
        
        // Enable search
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.placeholder = 'Search by tag, artist, venue, event...';
            searchInput.style.opacity = '1';
            searchInput.style.cursor = 'text';
        }
        
        // If filtering by tag, show results
        if (tagParam) {
            filterByTag(tagParam);
        }
        
        return;
    }
    
    // If filtering by tag, show results progressively
    let progressivePhotos = [];
    
    // PARALLEL PROCESSING: Fetch multiple albums at once
    const PARALLEL_LIMIT = 10; // Fetch 10 albums simultaneously (increased from 5)
    
    for (const collectionType of allCollections) {
        const albums = ALBUM_DATA[collectionType] || [];
        
        // Process albums in batches
        for (let i = 0; i < albums.length; i += PARALLEL_LIMIT) {
            const batch = albums.slice(i, i + PARALLEL_LIMIT);
            
            // Fetch this batch in parallel
            await Promise.all(batch.map(async (album) => {
                // Handle video-only albums
                if (!album.flickrUrl || album.isVideoCollection) {
                    processedCount++;
                    
                    // Process video-only albums with manualTags and videos
                    if (album.manualTags && album.videos) {
                        // Process videos from this album
                        album.videos.forEach(video => {
                            const videoData = {
                                id: video.youtubeId,
                                youtubeId: video.youtubeId,
                                title: video.title,
                                url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
                                tags: video.tags || [],
                                albumTitle: album.title,
                                albumPage: album.albumPage,
                                isVideo: true
                            };
                            
                            // Add video to tag maps
                            videoData.tags.forEach(tag => {
                                if (!allTags.has(tag)) {
                                    allTags.set(tag, []);
                                }
                                allTags.get(tag).push(videoData);
                            });

                            // Add to progressive results if filtering by tag
                            if (tagParam && videoData.tags.includes(tagParam)) {
                                progressivePhotos.push(videoData);
                            }
                        });
                    }
                    return;
                }
                
                // Fetch album photos to get tags
                const albumId = extractAlbumId(album.flickrUrl);
                if (!albumId) {
                    processedCount++;
                    return;
                }
                
                try {
                    let photos = await fetchFlickrAlbumPhotos(albumId);
                    processedCount++;
                    
                    // Apply photo limit for specific albums (like Doug Emhoff event)
                    if (album.albumPage && album.albumPage.includes('doug-emhoff-event-with-michael-stipe')) {
                        if (photos && photos.length > 3) {
                            photos = photos.slice(0, 3);
                        }
                    }
                    
                    // Apply manual tags if specified (for albums where we limited photos but need to preserve tags)
                    if (album.manualTags && photos) {
                        photos.forEach(photo => {
                            // Merge existing tags with manual tags, removing duplicates
                            const existingTags = photo.tags || [];
                            photo.tags = [...new Set([...existingTags, ...album.manualTags])];
                        });
                    }
                    
                    // Update progress
                    const progressEl = document.getElementById('tags-progress');
                    if (progressEl) {
                        progressEl.textContent = `${processedCount}/${totalAlbums}`;
                    }
                    
                    // Process videos if they exist in this album
                    if (album.videos && album.videos.length > 0) {
                        album.videos.forEach(video => {
                            if (video.tags && video.tags.length > 0) {
                                // Add album info to video
                                const videoWithAlbum = {
                                    ...video,
                                    albumTitle: album.title,
                                    albumPage: album.albumPage,
                                    collection: collectionType,
                                    type: 'video'
                                };
                                
                                // Store video globally
                                allVideosWithTags.push(videoWithAlbum);
                                
                                // Add video to each of its tags
                                video.tags.forEach(tag => {
                                    if (!allTags.has(tag)) {
                                        allTags.set(tag, []);
                                    }
                                    allTags.get(tag).push(videoWithAlbum);
                                    
                                    // If we're filtering by this tag, add to progressive display
                                    if (tagParam && tag === tagParam) {
                                        progressivePhotos.push(videoWithAlbum);
                                    }
                                });
                            }
                        });
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
                            collection: collectionType,
                            type: 'photo'
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
                    const videosGrid = document.getElementById('videos-grid');
                    const videosSection = document.getElementById('videos-section');
                    
                    // Separate photos and videos
                    const photos = progressivePhotos.filter(item => item.type === 'photo');
                    const videos = progressivePhotos.filter(item => item.type === 'video');
                    
                    resultsTitle.textContent = `Results for "${formatTagForDisplay(tagParam)}" (${progressivePhotos.length} found so far...)`;
                    resultsTitle.style.display = 'block';
                    
                    
                    // Display photos
                    if (photos.length > 0) {
                        displayPhotosGrid([...photos], photosGrid);
                    }
                    
                    // Display videos
                    if (videos.length > 0 && videosGrid && videosSection) {
                        displayVideosGrid([...videos], videosGrid);
                        videosSection.style.display = 'block';
                    }
                }
                } catch (error) {
                    console.error(`Error fetching tags for album ${albumId}:`, error);
                    processedCount++;
                }
            }));
        }
    }
    
    // Save to IndexedDB cache after fetching
    await saveTagsToCache(allTags, totalAlbums);
    console.log('Tags saved to cache');
    
    // Update cache status indicator to show fresh data
    const cacheStatus = document.getElementById('cache-status');
    if (cacheStatus) {
        cacheStatus.innerHTML = `<i class="fas fa-database"></i> Fresh data (just cached) • <a href="#" onclick="refreshTagsCache(); return false;" style="color: #ccc; text-decoration: underline;">Refresh</a>`;
    }
    
    // Hide main body loading message once tags are ready
    if (loadingMessage) loadingMessage.innerHTML = '';

    // Show hint to pick a tag or search, unless we're already filtering by tag
    const tagsHint = document.getElementById('tags-hint');
    if (tagsHint && !tagParam) {
        tagsHint.style.display = 'block';
    }

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
        const items = allTags.get(tagParam);
        const photos = items.filter(item => item.type === 'photo');
        const videos = items.filter(item => item.type === 'video');

        const resultsTitle = document.getElementById('results-title');
        resultsTitle.textContent = `Results for "${formatTagForDisplay(tagParam)}" (${items.length} total)`;

        // Display photos
        const photosContainer = document.getElementById('photos-grid');
        if (photosContainer) {
            displayPhotosGrid(photos, photosContainer);
        } else {
            console.error('photos-grid element not found!');
        }

        // Display videos
        const videosGrid = document.getElementById('videos-grid');
        const videosSection = document.getElementById('videos-section');
        if (videos.length > 0 && videosGrid && videosSection) {
            displayVideosGrid(videos, videosGrid);
            videosSection.style.display = 'block';
        } else if (videosSection) {
            videosSection.style.display = 'none';
        }
    } else if (tagParam) {
    }
    
    // Highlight the tag in sidebar
    if (tagParam) {
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
        tagLink.style.cssText = 'padding: 0.15rem 0.8rem; margin-bottom: 0; background: rgba(255,255,255,0.05); border-radius: 3px; cursor: pointer; transition: all 0.2s ease; display: block; line-height: 1.4;';
        
        // Create a single text content with proper spacing
        tagLink.innerHTML = `<span style="color: #fff; font-size: 0.8rem;">${formatTagForDisplay(tag)}</span><span style="color: #999; font-size: 0.75rem; font-weight: 500; margin-left: 0.4rem;">(${photos.length})</span>`;
        
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
    
    // Configure Fuse.js for video search
    const fuseVideos = new Fuse(allVideosWithTags, {
        keys: ['title', 'albumTitle'],
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
            const videosSection = document.getElementById('videos-section');
            if (videosSection) videosSection.style.display = 'none';
            const tagsHint = document.getElementById('tags-hint');
            if (tagsHint) tagsHint.style.display = 'block';
            return;
        }
        
        const matchingItems = [];
        
        // Fuzzy search through tags
        const tagResults = fuseTags.search(query);
        tagResults.forEach(result => {
            matchingItems.push(...result.item.photos);
        });
        
        // Fuzzy search through photo titles and descriptions
        const photoResults = fusePhotos.search(query);
        photoResults.forEach(result => {
            matchingItems.push(result.item);
        });
        
        // Fuzzy search through video titles
        const videoResults = fuseVideos.search(query);
        videoResults.forEach(result => {
            matchingItems.push(result.item);
        });
        
        // Remove duplicates
        const uniqueItems = Array.from(new Map(matchingItems.map(item => [item.id || item.youtubeId, item])).values());
        
        // Display results
        showSearchResults(query, uniqueItems);
    });
}

function showPhotosForTag(tag, items) {
    const resultsTitle = document.getElementById('results-title');
    const photosGrid = document.getElementById('photos-grid');
    const videosGrid = document.getElementById('videos-grid');
    const videosSection = document.getElementById('videos-section');
    const tagsHint = document.getElementById('tags-hint');
    if (tagsHint) tagsHint.style.display = 'none';
    
    // Separate photos and videos
    const photos = items.filter(item => item.type === 'photo');
    const videos = items.filter(item => item.type === 'video');
    
    resultsTitle.textContent = `Results for "${formatTagForDisplay(tag)}" (${items.length} total)`;
    resultsTitle.style.display = 'block';
    
    // Display photos
    if (photos.length > 0) {
        displayPhotosGrid(photos, photosGrid);
    } else {
        photosGrid.innerHTML = '';
    }
    
    // Display videos
    if (videos.length > 0 && videosGrid && videosSection) {
        displayVideosGrid(videos, videosGrid);
        videosSection.style.display = 'block';
    } else if (videosSection) {
        videosSection.style.display = 'none';
    }
    
    // Scroll to results
    resultsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showSearchResults(query, items) {
    const resultsTitle = document.getElementById('results-title');
    const photosGrid = document.getElementById('photos-grid');
    const videosGrid = document.getElementById('videos-grid');
    const videosSection = document.getElementById('videos-section');
    const tagsHint = document.getElementById('tags-hint');
    if (tagsHint) tagsHint.style.display = 'none';
    
    // Separate photos and videos
    const photos = items.filter(item => item.type === 'photo');
    const videos = items.filter(item => item.type === 'video');
    
    resultsTitle.textContent = `Search results for "${query}" (${items.length} total)`;
    resultsTitle.style.display = 'block';
    
    if (items.length === 0) {
        photosGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No results found</p>';
        if (videosSection) videosSection.style.display = 'none';
        return;
    }
    
    // Display photos
    if (photos.length > 0) {
        displayPhotosGrid(photos, photosGrid);
    } else {
        photosGrid.innerHTML = '';
    }
    
    // Display videos
    if (videos.length > 0 && videosGrid && videosSection) {
        displayVideosGrid(videos, videosGrid);
        videosSection.style.display = 'block';
    } else if (videosSection) {
        videosSection.style.display = 'none';
    }
}

// Store current filtered photos for lightbox
let currentFilteredPhotos = [];

function displayPhotosGrid(items, container) {
    // Store items globally for lightbox access
    currentFilteredPhotos = items;
    
    // Separate photos and videos
    const photos = items.filter(item => !item.isVideo);
    const videos = items.filter(item => item.isVideo);
    
    
    if (videos.length > 0) {
        videos.forEach((video, index) => {
        });
    }
    
    let html = '';
    
    // Display photos
    if (photos.length > 0) {
        html += photos.map((photo, index) => {
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
    
    // Display videos
    if (videos.length > 0) {
        html += videos.map((video, index) => {
            const videoId = video.youtubeId || video.id;
            
            return `
                <div class="video-item" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; grid-column: 1 / -1;">
                    <h4 style="color: #fff; margin-bottom: 1rem; text-align: center;">${video.title}</h4>
                    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 6px; max-width: 800px; margin: 0 auto;">
                        <iframe src="https://www.youtube.com/embed/${videoId}" 
                                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                                allowfullscreen>
                        </iframe>
                    </div>
                    <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ccc; text-align: center;">
                        From: <a href="${video.albumPage}" style="color: #fff; text-decoration: none;">${video.albumTitle}</a>
                    </p>
                </div>
            `;
        }).join('');
    }
    
    container.innerHTML = html;
}

// Display videos grid for tags page
function displayVideosGrid(videos, container) {
    container.innerHTML = videos.map((video, index) => {
        return `
            <div class="video-item" style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem;">
                <h4 style="color: #fff; margin-bottom: 1rem; text-align: center;">${video.title}</h4>
                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 6px;">
                    <iframe src="https://www.youtube.com/embed/${video.youtubeId}" 
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                            allowfullscreen>
                    </iframe>
                </div>
                <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ccc; text-align: center;">
                    From: <a href="${video.albumPage}" style="color: #fff; text-decoration: none;">${video.albumTitle}</a>
                </p>
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
        const basePath = path.includes('/collections/') || path.includes('/music/') || path.includes('/events/') || path.includes('/landscapes/') || path.includes('/travel/') ? '../' : '';
        
        // Redirect to tags page with search query
        window.location.href = `${basePath}tags.html?search=${encodeURIComponent(query)}`;
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearchModal();
    }
});

// Refresh tags - reloads page to fetch fresh data from Flickr
async function refreshTagsCache() {
    // Clear the cache and reload
    await clearTagsCache();
    console.log('Tags cache cleared, reloading...');
    window.location.reload();
}

// Global header and footer initialization is handled above in the main DOMContentLoaded listener
