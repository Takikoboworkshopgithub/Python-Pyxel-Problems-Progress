#!/usr/bin/env bash

set -e

# ============================================================
# IQ Programming Practice
# Local Practice Server Launcher
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

# ------------------------------------------------------------
# Color
# ------------------------------------------------------------

if [ -t 1 ]; then
    GREEN='\033[32m'
    YELLOW='\033[33m'
    RED='\033[31m'
    CYAN='\033[36m'
    RESET='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    CYAN=''
    RESET=''
fi

info() {
    echo -e "${CYAN}[INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}[ OK ]${RESET} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}

error() {
    echo -e "${RED}[ERROR]${RESET} $1"
}


# ------------------------------------------------------------
# OS check
# ------------------------------------------------------------

OS=""

if [[ "$OSTYPE" == "darwin"* ]]; then

    OS="macOS"

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then

    # WSLかどうかを確認
    if grep -qi microsoft /proc/version 2>/dev/null; then
        OS="WSL"
    else
        error "この環境は対応していません。"
        echo
        echo "対応環境: WSL (Ubuntu) / macOS"
        exit 1
    fi

else

    error "このOSは対応していません。"
    echo
    echo "対応環境: WSL (Ubuntu) / macOS"
    exit 1

fi

info "OS: $OS"


# ------------------------------------------------------------
# Node.js / npm check
# ------------------------------------------------------------

if command -v node >/dev/null 2>&1 && \
   command -v npm >/dev/null 2>&1; then

    NODE_VERSION="$(node --version)"
    info "Node.js: $NODE_VERSION"
    info "npm: $(npm --version)"

else

    warning "Node.js または npm が見つかりません。"
    echo
    info "Node.js 20 をインストールします。"
    echo


    # ========================================================
    # WSL
    # ========================================================

    if [ "$OS" = "WSL" ]; then

        # ----------------------------------------------------
        # curl check
        # ----------------------------------------------------

        if ! command -v curl >/dev/null 2>&1; then

            info "curl が見つかりません。"
            info "curl をインストールします。"
            echo

            if ! command -v sudo >/dev/null 2>&1; then
                error "sudo が見つかりません。"
                echo
                echo "sudo を利用できる環境を用意してください。"
                exit 1
            fi

            sudo apt-get update
            sudo apt-get install -y curl

        fi

        # ----------------------------------------------------
        # Node.js install
        # ----------------------------------------------------

        info "NodeSource を使用して Node.js 20 をインストールします。"
        echo

        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs


    # ========================================================
    # macOS
    # ========================================================

    elif [ "$OS" = "macOS" ]; then

        # ----------------------------------------------------
        # Homebrew check
        # ----------------------------------------------------

        if ! command -v brew >/dev/null 2>&1; then

            warning "Homebrew が見つかりません。"
            echo
            echo "Node.js のインストールには Homebrew が必要です。"
            echo
            echo "Homebrew:"
            echo "  https://brew.sh/"
            echo
            echo "Homebrew をインストールしてから、もう一度実行してください。"
            exit 1

        fi

        # ----------------------------------------------------
        # Node.js install
        # ----------------------------------------------------

        info "Homebrew を使用して Node.js 20 をインストールします。"
        echo

        brew install node@20

        # node@20 は通常PATHに自動追加されないため、
        # Homebrewのインストール先をPATHに追加する
        NODE20_PREFIX="$(brew --prefix node@20)"

        export PATH="$NODE20_PREFIX/bin:$PATH"

    fi


    # --------------------------------------------------------
    # Installation check
    # --------------------------------------------------------

    if ! command -v node >/dev/null 2>&1; then
        error "Node.js のインストールに失敗しました。"
        exit 1
    fi

    if ! command -v npm >/dev/null 2>&1; then
        error "npm のインストールに失敗しました。"
        exit 1
    fi

    NODE_VERSION="$(node --version)"

    success "Node.js をインストールしました。"
    info "Node.js: $NODE_VERSION"
    info "npm: $(npm --version)"

fi


# ------------------------------------------------------------
# Required files
# ------------------------------------------------------------

REQUIRED_FILES=(
    "server.js"
    "practice.html"
    "problems.json"
    "progress.json"
    "package.json"
)

for file in "${REQUIRED_FILES[@]}"; do

    if [ ! -f "$file" ]; then
        error "必要なファイルがありません: $file"
        exit 1
    fi

done


# ------------------------------------------------------------
# npm dependencies
# ------------------------------------------------------------

if [ ! -d "node_modules" ]; then

    info "Node.js の依存パッケージをインストールします。"

    npm install

else

    success "Node.js の依存パッケージを確認しました。"

fi


# ------------------------------------------------------------
# Start server
# ------------------------------------------------------------

echo
echo "=============================================="
echo " IQ Programming Practice"
echo "=============================================="
echo

success "環境チェック完了"

echo
info "ローカルサーバーを起動します。"
echo
echo "  http://localhost:3000/"
echo
echo "ブラウザで practice.html を開きます。"
echo "終了する場合は Ctrl+C を押してください。"
echo

# server.js側でポートやブラウザ起動を管理する
node server.js