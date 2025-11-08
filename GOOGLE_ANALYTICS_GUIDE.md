# Google Analytics Guide

## Your Analytics Setup

**Property Name:** Photography Website  
**Stream URL:** https://www.jayneclamp.com  
**Stream ID:** 12961106529  
**Measurement ID:** G-9Z1G54B1GV

---

## How to Access Your Analytics

1. Go to **Google Analytics**: https://analytics.google.com/
2. Log in with your Google account
3. Select your **"Photography Website"** property
4. You'll see your dashboard with all the data

---

## What's Being Tracked

### 1. **Automatic Page Views**
- Every page visit on your site
- Time spent on each page
- Bounce rate (people who leave after viewing one page)
- Pages per session

### 2. **Custom Events**

#### **album_card_click**
- Triggered when someone clicks an album from a collection page
- Data tracked:
  - `album_title` - Which album was clicked
  - `collection` - Which collection (music, events, etc.)

#### **album_view**
- Triggered when someone opens an album page
- Data tracked:
  - `album_id` - Flickr album ID
  - `album_title` - Name of the album

#### **photo_view**
- Triggered when someone opens a photo in the lightbox
- Data tracked:
  - `photo_id` - Flickr photo ID
  - `photo_title` - Photo title
  - `photo_position` - Position in the album (1, 2, 3, etc.)

---

## How to View Your Data

### Real-Time Data
1. Go to **Reports** → **Realtime**
2. See who's on your site RIGHT NOW
3. See what pages they're viewing
4. See what events are firing

### Page Views
1. Go to **Reports** → **Engagement** → **Pages and screens**
2. See your most popular pages
3. See average time on page
4. See bounce rates

### Custom Events
1. Go to **Reports** → **Engagement** → **Events**
2. You'll see these custom events:
   - `album_card_click`
   - `album_view`
   - `photo_view`
3. Click on any event to see:
   - How many times it fired
   - Which albums/photos are most popular
   - User engagement patterns

### Traffic Sources
1. Go to **Reports** → **Acquisition** → **Traffic acquisition**
2. See where your visitors come from:
   - Direct (typed URL)
   - Social media (Instagram, Facebook, etc.)
   - Search engines (Google, Bing, etc.)
   - Referrals (other websites)

### User Demographics
1. Go to **Reports** → **User** → **Demographics**
2. See:
   - Age ranges
   - Gender
   - Interests
   - Locations (countries, cities)

### Device Information
1. Go to **Reports** → **User** → **Tech** → **Overview**
2. See:
   - Desktop vs Mobile vs Tablet
   - Browsers (Chrome, Safari, Firefox, etc.)
   - Operating systems
   - Screen resolutions

---

## Example Insights You Can Get

### Most Popular Albums
1. Go to **Events** → Click `album_view`
2. See which albums get the most views
3. Example: "2025-10-19 Porchfest" was viewed 47 times

### Most Viewed Photos
1. Go to **Events** → Click `photo_view`
2. See which photos people click on most
3. Example: Photo #54876264980 was viewed 23 times

### User Behavior
- Average 3.2 photos viewed per album visit
- Most users come from Instagram
- 65% mobile, 35% desktop
- Average session duration: 2 minutes 34 seconds

### Collection Popularity
1. Go to **Events** → Click `album_card_click`
2. See which collections get the most clicks
3. Example: "music" collection gets 60% of clicks

---

## Tips for Better Analytics

### 1. **Check Weekly**
- Look at trends over time
- See which content performs best
- Adjust your strategy based on data

### 2. **Set Up Goals** (Optional)
- Track specific actions (e.g., contact form submissions)
- Measure conversion rates

### 3. **Create Custom Reports**
- Combine multiple metrics
- Save reports you check frequently

### 4. **Enable Data Sharing**
- Get benchmark data to compare with similar sites

---

## Exclude Your Own Views

To prevent your own browsing from inflating the stats:

1. Open browser console (Cmd + Option + I)
2. Type: `enableOwnerMode()`
3. Press Enter

Your views will no longer be counted in the local tracking system. However, Google Analytics will still track your visits unless you:

**Option 1: Use Google Analytics Opt-out Extension**
- Install: https://tools.google.com/dlpage/gaoptout
- This prevents GA from tracking you on any site

**Option 2: Filter Your IP in GA**
1. Go to **Admin** → **Data Streams** → Click your stream
2. Click **Configure tag settings**
3. Click **Show more** → **Define internal traffic**
4. Add your IP address as internal traffic
5. Go to **Admin** → **Data Settings** → **Data Filters**
6. Enable the "Internal Traffic" filter

---

## Troubleshooting

### "No data showing up"
- Wait 24-48 hours after deployment for full data
- Real-time data should work immediately
- Make sure site is deployed to Netlify (not just localhost)

### "Events not firing"
- Check browser console for errors
- Make sure JavaScript is enabled
- Try in incognito mode to rule out extensions

### "Too much traffic from one location"
- Might be your own visits
- Set up IP filtering (see above)

---

## Important Notes

- **Data Retention:** Google Analytics keeps data for 14 months by default
- **Privacy:** GA is GDPR compliant but you may want to add a privacy policy
- **Updates:** It takes 24-48 hours for full data to appear after going live
- **Real-time:** Real-time tracking works immediately

---

## Quick Reference

**View Stats:** https://analytics.google.com/  
**Measurement ID:** G-9Z1G54B1GV  
**Local Stats (Console):** Type `viewStats()` in browser console  
**Enable Owner Mode:** Type `enableOwnerMode()` in browser console

---

## Need Help?

- **Google Analytics Help:** https://support.google.com/analytics
- **GA4 Documentation:** https://developers.google.com/analytics/devguides/collection/ga4
- **Community Forum:** https://support.google.com/analytics/community
