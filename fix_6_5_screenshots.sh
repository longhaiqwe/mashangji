#!/bin/bash

# App Store 6.5" Display (Strict 1242x2688)
# 允许的尺寸之一: 1242 x 2688
TARGET_WIDTH=1242
TARGET_HEIGHT=2688

SOURCE_DIR="AppStoreAssets/Screenshots"
# 覆盖原文件，因为原文件名是对的，只是尺寸错了
DEST_DIR="AppStoreAssets/Screenshots"

# 截图文件列表
files=(
    "01_login.png"
    "02_dashboard.png"
    "03_addrecord.png"
    "04_statistics.png"
    "05_settings.png"
    "06_voice_import.png"
    "07_batch_import.png"
)

for file in "${files[@]}"; do
    src_path="$SOURCE_DIR/$file"
    
    if [ -f "$src_path" ]; then
        echo "Resizing $file to $TARGET_WIDTH x $TARGET_HEIGHT"
        
        # 强制调整大小 (忽略比例，因为只差一点点，或者为了填满)
        sips -z $TARGET_HEIGHT $TARGET_WIDTH "$src_path"
        
        echo "✓ Fixed $file"
    else
        echo "✗ Source file not found: $src_path"
    fi
done
