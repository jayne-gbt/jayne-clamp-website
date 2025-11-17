// Global Footer Component
function createGlobalFooter() {
    const footerHTML = `
    <footer class="site-footer">
        <div class="container">
            <div class="social-links">
                <a href="https://instagram.com/jaynecougarmelonclamp" target="_blank" rel="noopener" aria-label="Instagram">
                    <i class="fab fa-instagram"></i>
                </a>
                <a href="https://www.facebook.com/jayneclamp" target="_blank" rel="noopener" aria-label="Facebook">
                    <i class="fab fa-facebook"></i>
                </a>
                <a href="https://www.youtube.com/@jayneclamp" target="_blank" rel="noopener" aria-label="YouTube">
                    <i class="fab fa-youtube"></i>
                </a>
                <a href="https://www.flickr.com/photos/jayneclamp" target="_blank" rel="noopener" aria-label="Flickr">
                    <i class="fab fa-flickr"></i>
                </a>
            </div>
            <p class="copyright">&copy; 2025 Jayne Clamp | Photography & Website Design</p>
            <div class="legal-links">
                <a href="/privacy-policy.html">Privacy Policy</a>
                <span class="separator">•</span>
                <a href="/terms-of-use.html">Terms of Use</a>
                <span class="separator">•</span>
                <a href="/sitemap.xml">Sitemap</a>
            </div>
        </div>
    </footer>
    `;
    
    // Find existing footer and replace it, or append to body if no footer exists
    const existingFooter = document.querySelector('.site-footer');
    if (existingFooter) {
        existingFooter.outerHTML = footerHTML;
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
}

// Initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', createGlobalFooter);
