# Jayne Clamp Website Backup & Restore Instructions

## Backup (Create TAR Archive with Timestamp)

To back up the entire project directory as a compressed tarball with a timestamp:

```bash
# Run this from the parent directory of 'jayne-clamp-website'
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
tar -czvf jayne-clamp-website-backup-$TIMESTAMP.tar.gz jayne-clamp-website
```

- This will create a file like `jayne-clamp-website-backup-2025-08-04_15-57-28.tar.gz` in the current directory.
- Make sure you are **not** inside the `jayne-clamp-website` folder when running the command.

### Where to Store Backups

Backups should be saved to the **"Jayne Clamp Website Backups"** folder, located in the same Documents directory as the website project:

```
/Users/jayneclamp/Dropbox/My Mac (Jayne's MacBook Pro)/Documents/Jayne Clamp Website Backups/
```

Since this folder is in Dropbox, backups will also sync to the cloud automatically.

**Note:** If the tar command fails due to the Unicode apostrophe in the path, use the Python backup script approach instead:

```python
import os, tarfile, datetime

project_dir = os.popen("find ~/Dropbox -maxdepth 5 -name 'index.html' -path '*jayne-clamp*' 2>/dev/null | head -1").read().strip()
project_dir = os.path.dirname(project_dir)
parent_dir = os.path.dirname(project_dir)
folder_name = os.path.basename(project_dir)

timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
dest_folder = os.path.join(parent_dir, "Jayne Clamp Website Backups")
os.makedirs(dest_folder, exist_ok=True)
backup_path = os.path.join(dest_folder, f"jayne-clamp-website-backup-{timestamp}.tar.gz")

with tarfile.open(backup_path, "w:gz") as tar:
    tar.add(project_dir, arcname=folder_name)

print(f"Backup complete: {backup_path}")
```

## Restore (Extract TAR Archive)

To restore the project from a backup tarball:

```bash
# Replace the filename with the actual backup file you want to restore
# This will extract the folder in your current directory
tar -xzvf jayne-clamp-website-backup-YYYY-MM-DD_HH-MM-SS.tar.gz
```

- The extracted folder will be named `jayne-clamp-website`.
- You can rename or move it as needed.

---
**Tip:** Keep your backup tarballs in the "Jayne Clamp Website Backups" folder so they are backed up to Dropbox cloud storage automatically.
