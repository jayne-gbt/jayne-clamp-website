# Domain Switch Guide
## Jayne Clamp Photography Website

**Current Setup**: jayne-clamp.netlify.app  
**Target Setup**: Custom domain via Squarespace/Google Domains + Netlify hosting

---

## 🏗️ Your Setup: Netlify + Squarespace/Google Domains

### **Hosting**: Netlify
- ✅ **Automatic SSL** - Netlify provides free SSL certificates
- ✅ **Auto-renewal** - Handles everything automatically  
- ✅ **Custom domain support** - Just point your domain to Netlify
- ✅ **Automatic 301 redirects** - jayne-clamp.netlify.app → yournewdomain.com
- ✅ **Global CDN** - Fast loading worldwide

### **Domain Registrar**: Squarespace/Google Domains
- ✅ **Reliable registrar** - Professional domain management
- ✅ **DNS management** - Easy to configure
- ✅ **Domain privacy** - Protects your personal information

---

## 📋 Domain Switch Process

### **Step 1: Purchase Your Domain**
1. Buy domain through Squarespace or Google Domains
2. Enable domain privacy protection
3. Note down your domain name for next steps

### **Step 2: Configure Netlify**
1. **Login to Netlify Dashboard**
2. **Go to your site** (jayne-clamp)
3. **Site Settings → Domain Management**
4. **Add Custom Domain** → Enter your new domain
5. **Netlify will provide DNS records:**
   - **Option A**: Use Netlify DNS (recommended)
   - **Option B**: Point to Netlify servers via A/CNAME records

### **Step 3: Configure DNS at Domain Registrar**

#### **Option A: Netlify DNS (Recommended)**
1. **In Netlify**: Copy the 4 nameserver addresses
2. **In Squarespace/Google Domains**: 
   - Go to DNS settings
   - Replace default nameservers with Netlify's nameservers
   - Save changes

#### **Option B: Custom DNS Records**
1. **In your domain registrar's DNS settings, add:**
   ```
   Type: A
   Name: @ (or blank)
   Value: 75.2.60.5
   
   Type: CNAME  
   Name: www
   Value: your-netlify-site.netlify.app
   ```

### **Step 4: SSL Certificate**
- **Automatic**: Netlify will provision SSL certificate (24-48 hours)
- **No action required** - happens automatically
- **Verify**: Check that https://yournewdomain.com works

### **Step 5: Update Site URLs**
1. **Update robots.txt** - Change sitemap URL to new domain
2. **Update meta tags** - Update og:url and twitter URLs in HTML
3. **Test all pages** - Verify everything works on new domain

---

## 🔍 Google Search Console Setup

**⚠️ DO AFTER domain switch is complete and SSL is working**

### **Step 1: Add New Property**
1. **Go to**: [Google Search Console](https://search.google.com/search-console/)
2. **Add Property** → **URL prefix**
3. **Enter**: `https://yournewdomain.com`
4. **Add Property** → **URL prefix** 
5. **Enter**: `https://www.yournewdomain.com` (if using www)

### **Step 2: Verify Ownership**
**Method 1: HTML File Upload (Recommended)**
1. Download verification HTML file from Google
2. Upload to your website root directory
3. Verify it's accessible at: `https://yournewdomain.com/google[code].html`
4. Click "Verify" in Search Console

**Method 2: Google Analytics (Alternative)**
1. Select "Google Analytics" verification method
2. Use your existing GA4 property (G-9Z1G54B1GV)
3. Click "Verify"

**Method 3: DNS Record (Alternative)**
1. Add TXT record to your domain's DNS
2. Use the code provided by Google Search Console
3. Wait for DNS propagation (up to 24 hours)
4. Click "Verify"

### **Step 3: Submit Sitemap**
1. **In Search Console** → **Sitemaps**
2. **Add sitemap URL**: `https://yournewdomain.com/sitemap.xml`
3. **Submit**
4. **Monitor indexing status** over the following days

### **Step 4: Set Preferred Domain**
1. **Add both www and non-www versions** as separate properties
2. **Choose your preferred version** (recommend non-www: yournewdomain.com)
3. **Set up 301 redirects** from non-preferred to preferred (Netlify handles this)

---

## 📱 Social Media Updates

**Update bio links on all platforms after domain switch:**

### **Platforms to Update:**
- ✅ **Instagram**: @jaynecougarmelonclamp
- ✅ **YouTube**: @jayneclamp
- ✅ **Flickr**: Profile website link
- ✅ **Facebook**: Page info/website link

### **Suggested Bio Text:**
*"Athens, GA photographer | Music • Events • Travel • Nature | View galleries at yournewdomain.com"*

---

## ✅ Pre-Switch Checklist (COMPLETED)

- ✅ **Favicon setup**
- ✅ **robots.txt verified**
- ✅ **Google Analytics GA4 configured**
- ✅ **Custom 404 page created**
- ✅ **Mobile responsiveness verified**
- ✅ **Image optimization completed**
- ✅ **Loading speed optimized**
- ✅ **Lazy loading implemented**
- ✅ **SSL preparation done**
- ✅ **Redirect planning complete**

---

## 🚨 Important Notes

### **Timeline Expectations:**
- **DNS propagation**: 24-48 hours
- **SSL certificate**: 24-48 hours after DNS
- **Search Console verification**: Immediate after SSL
- **Search engine indexing**: 1-4 weeks

### **Backup Plan:**
- **Old domain remains active** during transition
- **Netlify automatically redirects** old → new
- **No downtime expected**

### **Testing Checklist:**
- [ ] **Homepage loads** on new domain
- [ ] **All collection pages work**
- [ ] **Event album pages work**
- [ ] **Contact form works**
- [ ] **Privacy policy/Terms accessible**
- [ ] **SSL certificate active** (https://)
- [ ] **Mobile version works**
- [ ] **Social media links work**

---

## 📞 Support Resources

- **Netlify Support**: [netlify.com/support](https://netlify.com/support)
- **Google Domains Help**: [domains.google/support](https://domains.google/support)
- **Squarespace Support**: [support.squarespace.com](https://support.squarespace.com)
- **Search Console Help**: [support.google.com/webmasters](https://support.google.com/webmasters)

---

**Document Created**: November 17, 2025  
**Site Status**: Ready for domain switch 🚀
