#!/usr/bin/env python3

import os
import re
import glob

# Directory containing the music HTML files
MUSIC_DIR = "/Users/jayneclamp/Dropbox/My Mac (Jayne's MacBook Pro)/Documents/jayne-clamp-website/music"

# Lightbox HTML to insert
LIGHTBOX_HTML = '''
    <!-- Lightbox -->
    <div id="lightbox">
        <div class="lightbox-content">
            <button class="lightbox-share" onclick="toggleLightboxShare()">
                <i class="fas fa-share"></i>
            </button>
            <div class="lightbox-share-menu" id="lightbox-share-menu">
                <a href="#" onclick="shareLightboxPhoto('instagram'); return false;"><i class="fab fa-instagram"></i></a>
                <a href="#" onclick="shareLightboxPhoto('threads'); return false;"><i class="fas fa-at"></i></a>
                <a href="#" onclick="shareLightboxPhoto('facebook'); return false;"><i class="fab fa-facebook"></i></a>
                <a href="#" onclick="shareLightboxPhoto('pinterest'); return false;"><i class="fab fa-pinterest"></i></a>
                <a href="#" onclick="shareLightboxPhoto('copy'); return false;"><i class="fas fa-link"></i></a>
            </div>
            <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
            <img id="lightbox-img" src="" alt="">
            <div id="lightbox-caption" class="lightbox-caption"></div>
            <div class="lightbox-nav">
                <button id="lightbox-prev" onclick="prevLightboxImage()">&#8249;</button>
                <button id="lightbox-next" onclick="nextLightboxImage()">&#8250;</button>
            </div>
            <div id="lightbox-counter" class="lightbox-counter"></div>
        </div>
    </div>
'''

def process_file(filepath):
    """Process a single HTML file to add lightbox functionality"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if lightbox-share already exists
        if 'lightbox-share' in content:
            return False, "Already has share functionality"
        
        # Find the insertion point - before <script src="../js/main.js">
        script_pattern = r'(\s*<script src="../js/main\.js"></script>)'
        match = re.search(script_pattern, content)
        
        if match:
            # Insert lightbox HTML before the script tag
            new_content = content[:match.start()] + LIGHTBOX_HTML + content[match.start():]
            
            # Write back to file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            return True, "Added share functionality"
        else:
            return False, "Could not find insertion point"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("🎸 Adding share functionality to album pages...")
    print(f"Working directory: {MUSIC_DIR}")
    
    # Get all HTML files
    html_files = glob.glob(os.path.join(MUSIC_DIR, "*.html"))
    
    processed = 0
    skipped = 0
    errors = 0
    
    for filepath in sorted(html_files):
        filename = os.path.basename(filepath)
        success, message = process_file(filepath)
        
        if success:
            print(f"  ✅ {filename}")
            processed += 1
        elif "Already has" in message:
            print(f"  ⏭️  {filename} (already has share functionality)")
            skipped += 1
        else:
            print(f"  ❌ {filename} - {message}")
            errors += 1
    
    print(f"\n🎯 Summary:")
    print(f"  ✅ Processed: {processed}")
    print(f"  ⏭️  Skipped: {skipped}")
    print(f"  ❌ Errors: {errors}")
    print(f"  📊 Total files: {len(html_files)}")
    
    if processed > 0:
        print(f"\n🎉 Successfully added share functionality to {processed} albums!")
        print("🔧 Next steps:")
        print("  1. Test a few albums to verify functionality")
        print("  2. Check that lightbox opens and share buttons work")
        print("  3. Verify photo descriptions display correctly")

if __name__ == "__main__":
    main()
