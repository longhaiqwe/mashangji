#!/bin/bash

# App Store 要求的尺寸 (iPhone 5.5" Display) - 1242 x 2208
TARGET_WIDTH=1242
TARGET_HEIGHT=2208

# 源截图目录 (使用已生成的 6.5" 截图)
SOURCE_DIR="AppStoreAssets/Screenshots"
# 目标目录
DEST_DIR="AppStoreAssets/Screenshots/5.5"

# 创建目标目录
mkdir -p "$DEST_DIR"

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
    dest_path="$DEST_DIR/$file"
    
    if [ -f "$src_path" ]; then
        echo "Processing $file"
        
        # 获取原始尺寸
        orig_width=$(sips -g pixelWidth "$src_path" | grep pixelWidth | awk '{print $2}')
        orig_height=$(sips -g pixelHeight "$src_path" | grep pixelHeight | awk '{print $2}')
        
        # 计算缩放比例
        width_scale=$(echo "scale=4; $TARGET_WIDTH / $orig_width" | bc)
        height_scale=$(echo "scale=4; $TARGET_HEIGHT / $orig_height" | bc)
        
        # 使用较小的缩放比例以确保图片完整放入
        if (( $(echo "$width_scale < $height_scale" | bc -l) )); then
            scale=$width_scale
        else
            scale=$height_scale
        fi
        
        new_width=$(echo "$orig_width * $scale" | bc | awk '{print int($1)}')
        new_height=$(echo "$orig_height * $scale" | bc | awk '{print int($1)}')
        
        # 调整大小
        sips -z $new_height $new_width "$src_path" --out "$dest_path"
        
        # 填充白边以达到目标尺寸
        if [ $new_width -lt $TARGET_WIDTH ] || [ $new_height -lt $TARGET_HEIGHT ]; then
             sips -p $TARGET_HEIGHT $TARGET_WIDTH --padColor FFFFFF --padToHeightWidth $TARGET_HEIGHT $TARGET_WIDTH "$dest_path"
        fi
        
        echo "✓ Created $file ($TARGET_WIDTH x $TARGET_HEIGHT)"
    else
        echo "✗ Source file not found: $src_path"
    fi
done

echo ""
echo "All 5.5\" screenshots processed! Check $DEST_DIR"
