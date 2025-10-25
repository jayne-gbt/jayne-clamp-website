# Jayne Clamp Photography Website

A sleek, modern photography showcase website with Flickr integration.

## Features

- **Black background with white text** - Clean, professional design
- **6 Collections**: Music, Events, Travel, Birds, Landscapes, Pets
- **Flickr Integration** - Albums stored on Flickr, displayed beautifully on your site
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Contact Form** - Simple contact form for inquiries
- **Social Sharing** - Share to Facebook, Pinterest, and Twitter
- **Social Links** - Instagram and Flickr icons in footer

## Setup Instructions

### 1. Get Your Flickr API Key

1. Go to https://www.flickr.com/services/api/
2. Apply for a non-commercial API key
3. Copy your API key

### 2. Configure Flickr Integration

Open `js/main.js` and update the Flickr configuration:

```javascript
const FLICKR_CONFIG = {
    apiKey: 'YOUR_FLICKR_API_KEY', // Replace with your actual API key
    userId: '198613393@N03', // Your Flickr user ID
    collections: {
        music: 'COLLECTION_ID',
        events: 'COLLECTION_ID',
        travel: 'COLLECTION_ID',
        birds: 'COLLECTION_ID',
        landscapes: 'COLLECTION_ID',
        pets: 'COLLECTION_ID'
    }
};
```

### 3. Add Collection Cover Images

Place cover images in the `images/collections/` folder:
- `music-cover.jpg`
- `events-cover.jpg`
- `travel-cover.jpg`
- `birds-cover.jpg`
- `landscapes-cover.jpg`
- `pets-cover.jpg`

### 4. Deploy

Upload all files to your web hosting service or use a platform like:
- Netlify
- Vercel
- GitHub Pages

## File Structure

```
jayne-clamp-website/
├── index.html              # Homepage with collections grid
├── contact.html            # Contact page with form
├── css/
│   └── style.css          # All styles
├── js/
│   └── main.js            # JavaScript functionality
├── collections/
│   ├── music.html
│   ├── events.html
│   ├── travel.html
│   ├── birds.html
│   ├── landscapes.html
│   └── pets.html
└── images/
    └── collections/       # Collection cover images
```

## Customization

### Colors
Edit CSS variables in `css/style.css`:
```css
:root {
    --black: #000000;
    --white: #ffffff;
    --gray: #333333;
    --light-gray: #666666;
}
```

### Social Links
Update Instagram and Flickr URLs in all HTML files.

### Contact Form
The contact form currently uses a placeholder submission. To make it functional, integrate with a backend service like:
- Formspree
- Netlify Forms
- EmailJS

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## License

© 2025 Jayne Clamp. All rights reserved.
