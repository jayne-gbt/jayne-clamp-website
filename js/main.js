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
            title: '2025-10-19 Porchfest @ Athens, GA', 
            photoCount: 12, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329859726/',
            coverUrl: 'https://live.staticflickr.com/65535/54876264980_887cfb1a8e_b.jpg'
        },
        { 
            title: '2025-09-21 Vincas @ Hendershots | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'https://live.staticflickr.com/65535/54876776442_e83e6eea26_b.jpg'
        }, 
        { 
            title: '2025-09-12 The Minus 5 & The Baseball Project @ 40 Watt | Athens, GA', 
            photoCount: 18, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329875831/',
            coverUrl: 'https://live.staticflickr.com/65535/54876815267_699a46d880_b.jpg'
        },
        { 
            title: '2025-02-15 Drive By Truckers @ 40 Watt (Homecoming) | Athens, GA', 
            photoCount: 18, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324235638/',
            coverUrl: 'https://live.staticflickr.com/65535/54364787855_2bc9e4e3dc_b.jpg'
        },
        { 
            title: '2025-02-27 Michael Shannon, Jason Narducy & Friends REM Tribute @ 40 Watt | Athens, GA', 
            photoCount: 22, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205246/',
            coverUrl: 'https://live.staticflickr.com/65535/54364740380_9d40dc998f_b.jpg'
        },
        { 
            title: '2025-02-27 Kevn Kinney, Lenny Hayes, Peter Buck, Mike Mills @ Rialto Room | Athens, GA', 
            photoCount: 3, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324205156/',
            coverUrl: 'https://live.staticflickr.com/65535/54363461472_0b17468aa4_b.jpg'
        },
        { 
            title: '2025-02-17 Classic City Wrestling w Drive By Truckers | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720324198785/',
            coverUrl: 'https://live.staticflickr.com/65535/54364287441_e8189d542b_b.jpg'
        }, 
        { 
            title: '2024-04-26 Five Eight @ Nowhere Bar | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720321559088/',
            coverUrl: 'https://live.staticflickr.com/65535/54099739681_bcfc1ba19a_b.jpg'
        }, 
        { 
            title: 'Concert Name', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'jpg'
        }, 
        { 
            title: 'Concert Name', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'jpg'
        }, 
        { 
            title: 'Concert Name', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720329904439/',
            coverUrl: 'jpg'
        } 
    ],
    events: [
        // Add your event albums here
    ],
    travel: [
        // Add your travel albums here
    ],
    birds: [
        // Add your bird photography albums here
    ],
    landscapes: [
        // Add your landscape albums here
         { 
            title: 'Winter 2025 | Athens, GA', 
            photoCount: 11, 
            flickrUrl: 'https://www.flickr.com/photos/jayneclamp/albums/72177720323325987/',
            coverUrl: 'https://live.staticflickr.com/65535/54279614662_ccb9db86a6_b.jpg'
        }, 
    ],
    pets: [
        // Add your pet photography albums here
    ]
};

// Display albums from manual configuration
function displayAlbums(collectionType) {
    const albumsGrid = document.getElementById('albums-grid');
    const loading = document.getElementById('loading');
    
    if (!albumsGrid) return;

    // Get albums for this collection
    const albums = ALBUM_DATA[collectionType] || [];

    // Hide loading
    if (loading) loading.style.display = 'none';

    // If no albums configured yet, show helpful message
    if (albums.length === 0) {
        albumsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">No albums configured yet</p>
                <p style="font-size: 0.95rem;">Add your Flickr album links in js/main.js</p>
            </div>
        `;
        return;
    }

    // Display albums
    albumsGrid.innerHTML = albums.map(album => `
        <a href="${album.flickrUrl}" target="_blank" rel="noopener" class="album-card">
            <div class="album-image">
                <img src="${album.coverUrl || 'https://via.placeholder.com/800x600/000000/FFFFFF?text=' + encodeURIComponent(album.title)}" 
                     alt="${album.title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/800x600/000000/FFFFFF?text=${encodeURIComponent(album.title)}'">
                <div class="album-overlay">
                    <h3>${album.title}</h3>
                    <p class="album-info">${album.photoCount || '?'} photos</p>
                </div>
            </div>
        </a>
    `).join('');
}

// Initialize albums on collection pages
if (document.body.classList.contains('collection-page')) {
    const collectionType = document.body.dataset.collection;
    if (collectionType) {
        displayAlbums(collectionType);
    }
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
