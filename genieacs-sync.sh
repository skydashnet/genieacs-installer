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
DB_NAME="genieacs"
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

    # Provisions and VParams go to NBI
    if [[ "$type" != "config" ]]; then
        response=$(curl -s -X PUT "${NBI_URL}/${type}/${name}" \
            --header "Content-Type: application/json" \
            --data-binary "$content")
        
        if [[ -n "$response" ]]; then
            echo -e "${RED}Response: $response${NC}"
        else
            echo -e "${GREEN}Done${NC}"
        fi
    else
        # Config items go directly to MongoDB
        # Wrap in quotes and escape for JS
        js_val=$(jq -n --arg val "$content" '$val')
        mongosh --quiet "$DB_NAME" --eval "db.config.updateOne({_id: '$name'}, {\$set: {value: $js_val}}, {upsert: true})" > /dev/null
        echo -e "${GREEN}Done (DB)${NC}"
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

flatten_and_sync() {
    local content=$1
    local prefix=$2

    echo -e "${BLUE}Flattening and syncing ${prefix}...${NC}"
    
    # Use jq to get all leaf paths and values
    # This turns {a: {b: 1}} into "a.b=1"
    # We use -c for values to handle strings, numbers, and nulls correctly
    items=$(echo "$content" | jq -r 'tostream | select(length > 1) | [ ( [.[0][] | tostring] | join(".") ), ( .[1] | @json ) ] | @tsv')
    
    while IFS=$'\t' read -r path value; do
        full_path="${prefix}.${path}"
        # If prefix is empty, don't add a leading dot
        [[ -z "$prefix" ]] && full_path="$path"
        
        echo -n "Syncing ${full_path}... "
        mongosh --quiet "$DB_NAME" --eval "db.config.updateOne({_id: '$full_path'}, {\$set: {value: $value}}, {upsert: true})" > /dev/null
        echo -e "${GREEN}Done${NC}"
    done <<< "$items"
}

sync_configs() {
    echo -e "${BLUE}Syncing Configurations (Deep Flattening)...${NC}"
    
    files=$(fetch_repo_files "config")
    for file in $files; do
        echo -e "${BLUE}Processing ${file}...${NC}"
        content=$(curl -sL "${GITHUB_RAW_URL}/config/${file}")
        
        # If it's a YAML file, convert to JSON for jq
        if [[ $file == *.yaml || $file == *.yml ]]; then
            # We must set NODE_PATH so node can find the global js-yaml
            GLOBAL_NODE_MODULES=$(npm root -g)
            content=$(echo "$content" | NODE_PATH="$GLOBAL_NODE_MODULES" node -e "const yaml = require('js-yaml'); const fs = require('fs'); console.log(JSON.stringify(yaml.load(fs.readFileSync(0, 'utf8'))))")
        fi

        # Determine prefix based on filename
        prefix=""
        case ${file%.*} in
            device-page) prefix="ui.device" ;;
            index-page-wanip|index-page-wanppp) prefix="ui.index" ;;
            filter) prefix="ui.filters" ;;
            overview) prefix="ui.overview" ;;
            config) prefix="" ;; # config.json handles its own top-level keys
        esac

        flatten_and_sync "$content" "$prefix"
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
