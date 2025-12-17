#!/bin/bash

# App Store 要求的尺寸 (iPhone 6.7" Display)
TARGET_WIDTH=1290
TARGET_HEIGHT=2796

# 源截图目录
SOURCE_DIR="/Users/longhai/.gemini/antigravity/brain/73dff282-da74-43f9-acb8-bc3e6df47cca"
# 目标目录
DEST_DIR="AppStoreAssets/Screenshots"

# 创建目标目录
mkdir -p "$DEST_DIR"

# 截图文件映射（使用最新的截图）
declare -A screenshots=(
    ["1_login_screen_1765877149496.png"]="01_Login.png"
    ["2_dashboard_screen_1765877174961.png"]="02_Dashboard.png"
    ["3_add_record_screen_1765877198253.png"]="03_AddRecord.png"
    ["4_statistics_screen_1765877244060.png"]="04_Statistics.png"
    ["5_settings_screen_1765877268954.png"]="05_Settings.png"
)

for src_file in "${!screenshots[@]}"; do
    dest_file="${screenshots[$src_file]}"
    src_path="$SOURCE_DIR/$src_file"
    dest_path="$DEST_DIR/$dest_file"
    
    if [ -f "$src_path" ]; then
        echo "Processing $src_file -> $dest_file"
        
        # 获取原始尺寸
        orig_width=$(sips -g pixelWidth "$src_path" | grep pixelWidth | awk '{print $2}')
        orig_height=$(sips -g pixelHeight "$src_path" | grep pixelHeight | awk '{print $2}')
        
        # 计算缩放比例（保持宽高比）
        width_scale=$(echo "scale=4; $TARGET_WIDTH / $orig_width" | bc)
        height_scale=$(echo "scale=4; $TARGET_HEIGHT / $orig_height" | bc)
        
        # 使用较小的缩放比例以确保图片不会超出边界
        if (( $(echo "$width_scale < $height_scale" | bc -l) )); then
            scale=$width_scale
        else
            scale=$height_scale
        fi
        
        new_width=$(echo "$orig_width * $scale" | bc | awk '{print int($1)}')
        new_height=$(echo "$orig_height * $scale" | bc | awk '{print int($1)}')
        
        # 先调整大小
        sips -z $new_height $new_width "$src_path" --out "$dest_path"
        
        # 创建画布并居中图片（如果需要padding）
        if [ $new_width -lt $TARGET_WIDTH ] || [ $new_height -lt $TARGET_HEIGHT ]; then
            # 计算padding
            pad_width=$(( ($TARGET_WIDTH - $new_width) / 2 ))
            pad_height=$(( ($TARGET_HEIGHT - $new_height) / 2 ))
            
            # 使用sips添加白色边框
            sips -p $TARGET_HEIGHT $TARGET_WIDTH --padColor FFFFFF --padToHeightWidth $TARGET_HEIGHT $TARGET_WIDTH "$dest_path"
        fi
        
        echo "✓ Created $dest_file ($TARGET_WIDTH x $TARGET_HEIGHT)"
    else
        echo "✗ Source file not found: $src_file"
    fi
done

echo ""
echo "All screenshots processed! Check AppStoreAssets/Screenshots/"
