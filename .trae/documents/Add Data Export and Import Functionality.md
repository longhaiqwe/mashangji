I have analyzed the requirements and the codebase. Here is the detailed plan to implement the data export and import functionality.

### 1. Data Format Design
I will design a JSON-based text format for the export file. JSON is robust, human-readable, and easy to parse.
**Structure:**
```json
{
  "meta": {
    "version": "1.0",
    "exportedAt": "2023-10-27T10:00:00.000Z",
    "platform": "mashangji"
  },
  "circles": [
    { "id": "...", "name": "...", "isDefault": false }
  ],
  "records": [
    { "id": "...", "circleId": "...", "amount": 100, "date": "...", "note": "..." }
  ]
}
```

### 2. Component Modification (`components/Settings.tsx`)
I will add a new section "Data Backup" (数据备份) to the Settings page with two actions.

**UI Changes:**
*   Import `FileDown` (Export) and `FileUp` (Import) icons from `lucide-react`.
*   Add a hidden file input element for handling file selection.
*   Add two menu items:
    1.  **Export Data (导出数据)**: Triggers the download of the JSON file.
    2.  **Import Data (导入数据)**: Triggers the file selection dialog.

### 3. Logic Implementation

**A. Export Logic (`handleExport`)**
*   **Step 1:** Fetch all data using `storageService`.
    ```typescript
    const circles = await fetchCircles(user.id);
    const records = await fetchRecords(user.id);
    ```
*   **Step 2:** Construct the data object with metadata.
*   **Step 3:** Convert to JSON string and trigger download.
    ```typescript
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    // Create temporary <a> tag to click and download
    ```

**B. Import Logic (`handleImport`)**
*   **Step 1:** Read the selected file using `FileReader`.
*   **Step 2:** Parse the JSON content.
*   **Step 3:** **Merge Circles** (Preserve existing, add new).
    *   Fetch current circles.
    *   Identify new circles from the import file (compare by ID).
    *   Save the combined list using `syncCircles`.
*   **Step 4:** **Merge Records** (Avoid duplicates).
    *   Fetch current records.
    *   Filter out records that already exist (compare by ID).
    *   Batch add only the new records using `addRecordsBatch`.
*   **Step 5:** Provide feedback (Success alert).

### 4. Verification
*   Verify that the exported file is a valid JSON text file.
*   Verify that importing a file correctly restores data without duplicating existing records.
