#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/.whisper-build"
WHISPER_BUILD_DIR="$BUILD_DIR/whisper.cpp/build"
OUTPUT="$PROJECT_DIR/resources/whisper-server"
LIBS_OUTPUT_DIR="$PROJECT_DIR/resources/whisper-server-libs"

echo "Building whisper-server with Metal support for arm64..."

resolve_library_path() {
    local name="$1"
    local candidate

    for candidate in \
        "$WHISPER_BUILD_DIR/src/$name" \
        "$WHISPER_BUILD_DIR/ggml/src/$name" \
        "$WHISPER_BUILD_DIR/ggml/src/ggml-blas/$name" \
        "$WHISPER_BUILD_DIR/ggml/src/ggml-metal/$name"
    do
        if [ -e "$candidate" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    echo "Unable to locate dependency: $name" >&2
    exit 1
}

rewrite_dependencies() {
    local target="$1"
    local prefix="$2"
    local name

    for name in "${DEPENDENCY_NAMES[@]}"; do
        if otool -L "$target" | awk '{ print $1 }' | grep -Fxq "@rpath/$name"; then
            install_name_tool -change "@rpath/$name" "${prefix}${name}" "$target"
        fi
    done
}

remove_rpaths() {
    local target="$1"
    local rpath

    while IFS= read -r rpath; do
        install_name_tool -delete_rpath "$rpath" "$target" || true
    done < <(
        otool -l "$target" | awk '
            $1 == "cmd" && $2 == "LC_RPATH" { capture = 1; next }
            capture && $1 == "path" { print $2; capture = 0 }
        '
    )
}

if [ -d "$BUILD_DIR/whisper.cpp" ]; then
    echo "Using existing whisper.cpp checkout..."
    cd "$BUILD_DIR/whisper.cpp"
    if [ "${WHISPER_CPP_UPDATE:-0}" = "1" ]; then
        echo "Updating whisper.cpp..."
        git pull
    fi
else
    echo "Cloning whisper.cpp..."
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"
    git clone https://github.com/ggerganov/whisper.cpp.git
    cd whisper.cpp
fi

mkdir -p build
cd build
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DWHISPER_METAL=ON \
    -DCMAKE_OSX_ARCHITECTURES=arm64 \
    -DWHISPER_BUILD_EXAMPLES=ON \
    -DWHISPER_BUILD_SERVER=ON

make -j"$(sysctl -n hw.ncpu)" whisper-server

mkdir -p "$PROJECT_DIR/resources" "$LIBS_OUTPUT_DIR"
find "$LIBS_OUTPUT_DIR" -mindepth 1 -maxdepth 1 -name '*.dylib' -delete

cp bin/whisper-server "$OUTPUT"
chmod +x "$OUTPUT"

DEPENDENCY_NAMES=()
while IFS= read -r dependency; do
    DEPENDENCY_NAMES+=("${dependency##*/}")
done < <(otool -L bin/whisper-server | awk '/@rpath\/.*\.dylib/ { print $1 }')

for name in "${DEPENDENCY_NAMES[@]}"; do
    source_path="$(resolve_library_path "$name")"
    cp -L "$source_path" "$LIBS_OUTPUT_DIR/$name"
    chmod +x "$LIBS_OUTPUT_DIR/$name"
    install_name_tool -id "@loader_path/$name" "$LIBS_OUTPUT_DIR/$name"
done

rewrite_dependencies "$OUTPUT" "@executable_path/whisper-server-libs/"
remove_rpaths "$OUTPUT"

for name in "${DEPENDENCY_NAMES[@]}"; do
    rewrite_dependencies "$LIBS_OUTPUT_DIR/$name" "@loader_path/"
    remove_rpaths "$LIBS_OUTPUT_DIR/$name"
done

echo "whisper-server built and copied to $OUTPUT"
ls -lh "$OUTPUT"
ls -lh "$LIBS_OUTPUT_DIR"
