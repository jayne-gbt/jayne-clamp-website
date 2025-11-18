#!/bin/bash

# Script to add lightbox share functionality to all album pages that are missing it
# This will add the complete lightbox HTML structure with share icons

MUSIC_DIR="/Users/jayneclamp/Dropbox/My Mac (Jayne's MacBook Pro)/Documents/jayne-clamp-website/music"

# Define the lightbox HTML to insert
LIGHTBOX_HTML='
    <!-- Lightbox -->
    <div id="lightbox">
        <div class="lightbox-content">
            <button class="lightbox-share" onclick="toggleLightboxShare()">
                <i class="fas fa-share"></i>
            </button>
            <div class="lightbox-share-menu" id="lightbox-share-menu">
                <a href="#" onclick="shareLightboxPhoto('\''instagram'\''); return false;"><i class="fab fa-instagram"></i></a>
                <a href="#" onclick="shareLightboxPhoto('\''threads'\''); return false;"><i class="fas fa-at"></i></a>
                <a href="#" onclick="shareLightboxPhoto('\''facebook'\''); return false;"><i class="fab fa-facebook"></i></a>
                <a href="#" onclick="shareLightboxPhoto('\''pinterest'\''); return false;"><i class="fab fa-pinterest"></i></a>
                <a href="#" onclick="shareLightboxPhoto('\''copy'\''); return false;"><i class="fas fa-link"></i></a>
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
'

echo "🎸 Adding share functionality to album pages..."
echo "Working directory: $MUSIC_DIR"

# Counter for tracking progress
count=0
total=0

# First, count total files that need updating
for file in "$MUSIC_DIR"/*.html; do
    if [ -f "$file" ] && ! grep -q "lightbox-share" "$file"; then
        ((total++))
    fi
done

echo "Found $total album pages that need share functionality"
echo ""

# Process each HTML file in the music directory
for file in "$MUSIC_DIR"/*.html; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        # Check if the file already has lightbox-share functionality
        if ! grep -q "lightbox-share" "$file"; then
            echo "Processing: $filename"
            
            # Create a temporary file
            temp_file=$(mktemp)
            
            # Insert the lightbox HTML before the closing </footer> tag and <script> tag
            # Look for the pattern: </footer> followed by <script>
            sed '/^[[:space:]]*<\/footer>/,/^[[:space:]]*<script/ {
                /^[[:space:]]*<\/footer>/ {
                    a\
'"$LIGHTBOX_HTML"'
                }
            }' "$file" > "$temp_file"
            
            # Check if the sed command actually made changes
            if ! cmp -s "$file" "$temp_file"; then
                # Move the temp file back to original
                mv "$temp_file" "$file"
                ((count++))
                echo "  ✅ Added share functionality to $filename"
            else
                # If no changes, remove temp file and try alternative approach
                rm "$temp_file"
                
                # Alternative: Insert before <script src="../js/main.js">
                temp_file2=$(mktemp)
                sed '/^[[:space:]]*<script src="\.\.\/js\/main\.js">/i\
'"$LIGHTBOX_HTML"'' "$file" > "$temp_file2"
                
                if ! cmp -s "$file" "$temp_file2"; then
                    mv "$temp_file2" "$file"
                    ((count++))
                    echo "  ✅ Added share functionality to $filename (alternative method)"
                else
                    rm "$temp_file2"
                    echo "  ⚠️  Could not process $filename - manual review needed"
                fi
            fi
        else
            echo "Skipping: $filename (already has share functionality)"
        fi
    fi
done

echo ""
echo "🎯 Summary:"
echo "  Total albums processed: $count out of $total"
echo "  Albums now have share functionality!"
echo ""
echo "🔧 Next steps:"
echo "  1. Test a few albums to verify functionality"
echo "  2. Check that lightbox opens and share buttons work"
echo "  3. Verify photo descriptions display correctly"
echo ""
echo "✨ All done! Your albums now have consistent share functionality."
