# Great Britain Tile Website Backup & Restore Instructions

## Backup (Create TAR Archive with Timestamp)

To back up the entire project directory as a compressed tarball with a timestamp:

```bash
# Run this from the parent directory of 'jayne-clamp-website'
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
tar -czvf jayne-clamp-website-backup-$TIMESTAMP.tar.gz jayne-clamp-website
```

- This will create a file like `jayne-clamp-website-backup-2025-08-04_15-57-28.tar.gz` in the current directory.
- Make sure you are **not** inside the `jayne-clamp-website` folder when running the command.

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
**Tip:** Keep your backup tarballs in a safe location (cloud, external drive, etc.).