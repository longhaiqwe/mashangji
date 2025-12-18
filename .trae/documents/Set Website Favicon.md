I will set up the website favicon using the existing `resources/icon.png` file. This ensures that when deployed to Vercel or Zeabur, the correct icon is displayed in the browser tab and bookmarks.

## Steps
1.  **Copy Icon File**: Copy `resources/icon.png` to `public/favicon.png` so it is accessible from the web root.
2.  **Update HTML**: Modify `index.html` to add the favicon and Apple Touch Icon links in the `<head>` section.

## Technical Details
-   **File Operation**: `cp resources/icon.png public/favicon.png`
-   **Code Change**: Insert `<link rel="icon" type="image/png" href="/favicon.png" />` and `<link rel="apple-touch-icon" href="/favicon.png" />` into `index.html`.
