#!/bin/bash

# GenieACS Sync Utility
# Synchronizes configuration from GitHub to local GenieACS instance.
# WARNING: This script will OVERWRITE local configurations to match the repository.

set -e

# --- Configuration ---
REPO_OWNER="EtherGig"
REPO_NAME="genieacs-installer"
BRANCH="master"
NBI_URL="http://localhost:7557"
UI_URL="http://localhost:3000"
GITHUB_RAW_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}"
GITHUB_API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --full           Full synchronization (Provisions + VParams + Config)"
    echo "  --vparams        Sync only Virtual Parameters"
    echo "  --acs-url <url>  Set ACS URL (domain or IP) for inform.js"
    echo "  --help           Show this help"
    echo ""
    echo "If no options are provided, the script runs in interactive mode."
}

# --- Dependencies ---
for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd is not installed.${NC}"
        exit 1
    fi
done

# --- Helper Functions ---

fetch_repo_files() {
    local path=$1
    curl -s "${GITHUB_API_URL}/${path}?ref=${BRANCH}" | jq -r '.[] | select(.type=="file") | .name'
}

sync_item() {
    local type=$1    # provisions, virtual_parameters, config
    local name=$2
    local url=$3
    local content_type=$4

    echo -n "Syncing ${type}/${name}... "
    content=$(curl -sL "$url")
    
    # Inject ACS_URL into inform provision
    if [[ "$name" == "inform" && "$type" == "provisions" ]]; then
        content=$(echo "$content" | sed "s|{{ACS_URL}}|$ACS_URL|g")
    fi

    # Use different endpoint for config
    local target_url="${NBI_URL}/${type}/${name}"
    local body="$content"
    
    if [[ "$type" == "config" ]]; then
        target_url="${UI_URL}/api/config/${name}"
        # Wrap content in a JSON object with a "value" key
        # We use jq to safely escape the content
        body=$(jq -n --arg val "$content" '{"value": $val}')
    fi

    response=$(curl -s -X PUT "$target_url" \
        --header "Content-Type: application/json" \
        --data-binary "$body")
    
    if [[ -n "$response" ]]; then
        echo -e "${RED}Response: $response${NC}"
    else
        echo -e "${GREEN}Done${NC}"
    fi
}

prune_all() {
    local type=$1
    echo -e "${BLUE}Pruning local ${type} to ensure clean state...${NC}"
    local_names=$(curl -s "${NBI_URL}/${type}" | jq -r '.[].name' 2>/dev/null || echo "")
    for name in $local_names; do
        curl -s -X DELETE "${NBI_URL}/${type}/${name}" > /dev/null
    done
}

# --- Sync Logic ---

sync_provisions() {
    prune_all "provisions"
    files=$(fetch_repo_files "provision-script")
    for file in $files; do
        if [[ $file == *.js ]]; then
            sync_item "provisions" "${file%.js}" "${GITHUB_RAW_URL}/provision-script/${file}" "application/javascript"
        fi
    done
}

sync_vparams() {
    prune_all "virtual_parameters"
    files=$(fetch_repo_files "virtual-params")
    for file in $files; do
        if [[ $file == *.js ]]; then
            sync_item "virtual_parameters" "${file%.js}" "${GITHUB_RAW_URL}/virtual-params/${file}" "application/javascript"
        fi
    done
}

sync_configs() {
    echo -e "${BLUE}Syncing Configurations (Pages & Settings)...${NC}"
    
    files=$(fetch_repo_files "config")
    for file in $files; do
        if [[ $file == "config.json" ]]; then
            echo -e "${BLUE}Applying bulk settings from config.json...${NC}"
            content=$(curl -sL "${GITHUB_RAW_URL}/config/${file}")
            keys=$(echo "$content" | jq -r 'keys[]')
            for key in $keys; do
                value=$(echo "$content" | jq -c ".\"$key\"")
                echo -n "Syncing config/${key}... "
                
                # Wrap in {"value": ...} for UI API
                body=$(jq -n --argjson val "$value" '{"value": $val}')
                
                response=$(curl -s -X PUT "${UI_URL}/api/config/${key}" \
                    --header "Content-Type: application/json" \
                    --data-binary "$body")
                
                if [[ -n "$response" ]]; then
                    echo -e "${RED}Response: $response${NC}"
                else
                    echo -e "${GREEN}Done${NC}"
                fi
            done
            continue
        fi

        name="${file%.*}"
        target_name="$name"
        case $name in
            device-page) target_name="device_page" ;;
            filter) target_name="filter_page" ;;
            overview) target_name="overview_page" ;;
            index-page-wanip|index-page-wanppp) target_name="index_page" ;;
        esac
        
        sync_item "config" "$target_name" "${GITHUB_RAW_URL}/config/${file}" "unused"
    done
}

# --- Main ---

MODE="interactive"
ACS_URL=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --full) MODE="full" ;;
        --vparams) MODE="vparams" ;;
        --acs-url) ACS_URL="$2"; shift ;;
        --help) usage; exit 0 ;;
        *) echo "Unknown parameter: $1"; usage; exit 1 ;;
    esac
    shift
done

if [[ "$MODE" == "interactive" ]]; then
    echo -e "${BLUE}GenieACS Configuration Sync${NC}"
    echo "1) Full Sync (Provisions + Virtual Parameters + Config)"
    echo "2) Virtual Parameters Only"
    echo "3) Exit"
    read -p "Select an option [1-3]: " choice
    
    case $choice in
        1) MODE="full" ;;
        2) MODE="vparams" ;;
        *) exit 0 ;;
    esac
fi

# Always prompt for ACS URL if not provided via flag
if [[ -z "$ACS_URL" ]]; then
    echo -e "${BLUE}Example: http://acs.example.com:7547 or http://1.2.3.4:7547${NC}"
    read -p "Enter ACS URL: " ACS_URL
    if [[ -z "$ACS_URL" ]]; then
        echo -e "${RED}Error: ACS URL is required.${NC}"
        exit 1
    fi
fi

case $MODE in
    full)
        sync_provisions
        sync_vparams
        sync_configs
        ;;
    vparams)
        sync_vparams
        ;;
esac

echo -e "${GREEN}Sync Complete!${NC}"
