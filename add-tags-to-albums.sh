#!/bin/bash

# Script to add photo tags container to all music album pages

for file in music/*.html; do
  # Skip template and README files
  if [[ "$file" == *"TEMPLATE"* ]] || [[ "$file" == *"README"* ]]; then
    continue
  fi
  
  # Check if file already has photo-tags
  if grep -q 'id="photo-tags"' "$file"; then
    echo "Tags already exist in: $file"
    continue
  fi
  
  # Create temporary file with tags inserted before "Back Button (Bottom)"
  awk '
    /<!-- Back Button \(Bottom\) -->/ {
      print "    <!-- Photo Tags -->"
      print "    <div class=\"container\" style=\"text-align: center; padding: 0 0 1.5rem 0;\">"
      print "        <div id=\"photo-tags\" style=\"display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;\">"
      print "            <!-- Tags will be populated by JavaScript -->"
      print "        </div>"
      print "    </div>"
      print ""
    }
    { print }
  ' "$file" > "$file.tmp"
  
  # Replace original file with modified version
  mv "$file.tmp" "$file"
  echo "✓ Added tags to: $file"
done

echo ""
echo "Done! Added tags container to all music album pages."
