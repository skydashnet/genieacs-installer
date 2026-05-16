#!/bin/bash

# GenieACS Import Utility
# Imports configuration from GitHub to local GenieACS instance.
# WARNING: This script will OVERWRITE local configurations to match the repository.

set -e

# --- Configuration ---
REPO_OWNER="EtherGig"
REPO_NAME="genieacs-installer"
BRANCH="master"
NBI_URL="http://localhost:7557"
DB_NAME="genieacs"
# Base directory (current directory where script is located)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;36m'
NC='\033[0m'
 
show_header() {
    # Two-tone branding: Cyan for ETHER, White for GIG
    echo -e "${BLUE} _____ _____ _____ _____ _____ ${NC}_____ _____ _____"
    echo -e "${BLUE}|   __|_   _|  |  |   __| __  |${NC}   __|     |   __|"
    echo -e "${BLUE}|   __| | | |     |   __|    -|${NC}  |  |-   -|  |  |"
    echo -e "${BLUE}|_____| |_| |__|__|_____|__|__|${NC}_____|_____|_____|"
    echo -e "                   GenieACS Configuration Import\n"
}

show_header

usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --full           Full Import (Provisions + VParams + Config)"
    echo "  --vparams        Import only Virtual Parameters"
    echo "  --acs-url <url>  Set ACS URL (domain or IP) for inform.js"
    echo "  --dark           Apply Dark Mode theme"
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

# --- Seeding Guard ---
# Check if GenieACS is seeded (has at least one user)
if command -v mongosh &> /dev/null; then
    USER_COUNT=$(mongosh "$DB_NAME" --quiet --eval "db.users.countDocuments()" 2>/dev/null || echo "1")
    if [[ "$USER_COUNT" == "0" ]]; then
        echo -e "${RED}Error: GenieACS has not been initialized yet.${NC}"
        echo -e "${BLUE}Please complete the initial wizard in the Web UI first (usually at http://SERVER_IP:3000).${NC}"
        echo -e "${BLUE}This ensures that your custom configurations are not overwritten by the default seeding process.${NC}"
        exit 1
    fi
fi

# --- Helper Functions ---

fetch_local_files() {
    local path=$1
    ls -1 "${BASE_DIR}/${path}" 2>/dev/null || echo ""
}

import_item() {
    local type=$1    # provisions, virtual_parameters, config
    local name=$2
    local local_path=$3
    local content_type=$4

    echo -n "Importing ${type}/${name}... "
    if [[ ! -f "$local_path" ]]; then
        echo -e "${RED}Error: File not found: $local_path${NC}"
        return
    fi
    content=$(cat "$local_path")
    
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

# --- Import Logic ---

import_provisions() {
    echo -e "\n${BLUE}Importing Provisions...${NC}"
    prune_all "provisions"
    files=$(fetch_local_files "provision-script")
    for file in $files; do
        if [[ $file == *.js ]]; then
            import_item "provisions" "${file%.js}" "${BASE_DIR}/provision-script/${file}" "application/javascript"
        fi
    done
}

import_vparams() {
    echo -e "\n${BLUE}Importing Virtual Parameters...${NC}"
    prune_all "virtual_parameters"
    files=$(fetch_local_files "virtual-params")
    for file in $files; do
        if [[ $file == *.js ]]; then
            import_item "virtual_parameters" "${file%.js}" "${BASE_DIR}/virtual-params/${file}" "application/javascript"
        fi
    done
}

flatten_and_import() {
    local content=$1
    local prefix=$2

    echo -e "${BLUE}Flattening and preparing ${prefix}...${NC}"
    
    # Use jq to build all the MongoDB commands at once
    local batch_script
    batch_script=$(echo "$content" | jq -r --arg prefix "$prefix" '
        tostream | select(length > 1) | 
        { path: ( [.[0][] | tostring] | join(".") ), value: (.[1] | tostring) } |
        "db.config.updateOne({_id: " + (($prefix + (if $prefix == "" then "" else "." end) + .path) | @json) + "}, {$set: {value: " + (.value | @json) + "}}, {upsert: true});"
    ')

    if [[ -n "$batch_script" ]]; then
        echo -n "Importing ${prefix} batch to MongoDB... "
        # Use a temporary file for the batch script to avoid shell piping issues
        local temp_script="/tmp/genieacs_batch_$(date +%s).js"
        echo "$batch_script" > "$temp_script"
        
        if mongosh --quiet "$DB_NAME" "$temp_script" > /dev/null; then
            echo -e "${GREEN}Done${NC}"
        else
            echo -e "${RED}Failed to execute batch script${NC}"
        fi
        rm -f "$temp_script"
    fi
}

import_configs() {
    echo -e "\n${BLUE}Importing Configurations (Deep Flattening)...${NC}"

    # Global Prune of UI branches to prevent parent-child collisions
    echo -n "Pruning existing UI configurations... "
    mongosh --quiet "$DB_NAME" --eval "db.config.deleteMany({_id: /^(ui\.device|ui\.index|ui\.filters|ui\.overview)(\.|$)/})" > /dev/null
    echo -e "${GREEN}Done${NC}"
    
    files=$(fetch_local_files "config")
    for file in $files; do
        # Determine prefix based on filename
        prefix=""
        case ${file%.*} in
            device-page) prefix="ui.device" ;;
            index-page-wanip) 
                [[ "$INDEX_TYPE" != "wanip" ]] && continue
                prefix="ui.index" 
                ;;
            index-page-wanppp) 
                [[ "$INDEX_TYPE" != "wanppp" ]] && continue
                prefix="ui.index" 
                ;;
            index-page) prefix="ui.index" ;;
            filter) prefix="ui.filters" ;;
            overview) prefix="ui.overview.groups" ;;
            chart) prefix="ui.overview.charts" ;;
            config) prefix="" ;; 
            *) continue ;; # Skip unknown files
        esac

        echo -e "${BLUE}Processing ${file}...${NC}"
        content=$(cat "${BASE_DIR}/config/${file}")
        
        # If it's a YAML file, convert to JSON for jq
        if [[ $file == *.yaml || $file == *.yml ]]; then
            # We must set NODE_PATH so node can find the global js-yaml
            GLOBAL_NODE_MODULES=$(npm root -g)
            content=$(echo "$content" | NODE_PATH="$GLOBAL_NODE_MODULES" node -e "const yaml = require('js-yaml'); const fs = require('fs'); console.log(JSON.stringify(yaml.load(fs.readFileSync(0, 'utf8'))))")
        fi

        flatten_and_import "$content" "$prefix"
    done
}

apply_branding() {
    local public_dir=$1
    echo -e "\n${BLUE}Applying UI Customizations (Font & Branding)...${NC}"
    
    if [[ -z "$public_dir" ]]; then
        echo -e "${RED}Warning: Could not find GenieACS UI public directory. Customizations skipped.${NC}"
        return
    fi

    # Patch CSS (Font & Branding)
    local css_file=$(ls "$public_dir"/app-*.css 2>/dev/null | head -n 1)
    if [[ -f "$css_file" ]]; then
        # 1. Patch Font (JetBrains Mono)
        if ! grep -q "JetBrains Mono" "$css_file"; then
            echo "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap'); * { font-family: 'JetBrains Mono', monospace !important; }" >> "$css_file"
            echo -e "${GREEN}Font applied to $(basename "$css_file")${NC}"
        else
            echo -e "${GREEN}Font already applied.${NC}"
        fi

        # 2. Patch Sharp Corners (Force update)
        sed -i "/\/\* SHARP CORNERS PATCH \*\//,+8d" "$css_file"
        echo '
/* SHARP CORNERS PATCH */
* { 
  border-radius: 0 !important; 
  border-top-left-radius: 0 !important; 
  border-top-right-radius: 0 !important; 
  border-bottom-left-radius: 0 !important; 
  border-bottom-right-radius: 0 !important; 
}' >> "$css_file"
        echo -e "${GREEN}Sharp corners applied.${NC}"

        # 3. Patch Branding (Appending to end of file)
        if ! grep -q "Customized by EtherGig" "$css_file"; then
            echo '.version::after { content: " | Customized by EtherGig" !important; display: inline !important; }' >> "$css_file"
            echo -e "${GREEN}Branding applied to $(basename "$css_file")${NC}"
        else
            echo -e "${GREEN}Branding already applied.${NC}"
        fi
    else
        echo -e "${RED}Error: Could not find GenieACS UI CSS bundle.${NC}"
    fi
}

apply_dark_mode() {
    local public_dir=$1
    echo -e "\n${BLUE}Applying Dark Mode theme...${NC}"
    local css_file=$(ls "$public_dir"/app-*.css 2>/dev/null | head -n 1)
    if [[ -f "$css_file" ]]; then
        # Remove old patch if exists to allow updating
        sed -i "/\/\* DARK MODE PATCH \*\//,\$d" "$css_file"
        
        echo '
/* DARK MODE PATCH */
:root {
  --color1: #333 !important;
  --color2: #444 !important;
  --color3: #1a1a1a !important;
  --color4: #00bfaf !important;
  --color5: #eee !important;
  --disabled: #888 !important;
}
body, #content-wrapper { background-color: #111 !important; color: #eee !important; }
#header { background-color: #1a1a1a !important; border-bottom: 1px solid #333 !important; }
#side-menu > ul > li > a { background-color: #1a1a1a !important; color: #eee !important; }
table.table th { color: #00bfaf !important; border-bottom: 2px solid #00bfaf !important; }
table.table.highlight > tbody > tr:hover { background-color: #222 !important; }
input, select, textarea, .CodeMirror { background-color: #1a1a1a !important; color: #eee !important; border-color: #333 !important; }
.CodeMirror-gutters { background-color: #1a1a1a !important; border-right: 1px solid #333 !important; }
.CodeMirror-linenumber { color: #666 !important; }
.pie-chart > svg > path { stroke: #111 !important; }
.all-parameters > .parameter-list > table > tbody > tr:hover { background-color: #222 !important; }
.autocomplete { background-color: #1a1a1a !important; color: #eee !important; }
.overlay-wrapper > .overlay { background-color: #1a1a1a !important; color: #eee !important; border-color: #333 !important; }
span.tag { background-color: #333 !important; background-image: none !important; color: #00bfaf !important; border: 1px solid #444 !important; padding: 2px 8px !important; }
.overview-dot > svg > circle { stroke: #111 !important; }
button.primary { background-color: #00bfaf !important; color: #111 !important; }
button.primary:hover { background-color: #008f83 !important; }
.CodeMirror { border-color: #333 !important; }
.drawer { background-color: #1a1a1ae6 !important; color: #eee !important; border-color: #333 !important; }
.notification { background-color: #1a1a1ae6 !important; color: #eee !important; border-color: #333 !important; }
.drawer input { background-color: #222 !important; color: #eee !important; border-color: #444 !important; }
.drawer .parameter, .drawer .value { color: #00bfaf !important; }
.notification.success { background-color: #004d40e6 !important; border-color: #00bfaf !important; }
.notification.error { background-color: #4d0000e6 !important; border-color: #ff5252 !important; }
' >> "$css_file"
        echo -e "${GREEN}Dark mode applied successfully.${NC}"
    fi
}

# --- Main ---

MODE="interactive"
INDEX_TYPE="both" # Default to both if not specified
ACS_URL=""
DARK_MODE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --full) MODE="full" ;;
        --vparams) MODE="vparams" ;;
        --index-type) INDEX_TYPE="$2"; shift ;;
        --acs-url) ACS_URL="$2"; shift ;;
        --dark) DARK_MODE=true ;;
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
    
    # Prompt for Dark Mode in interactive mode
    read -p "Enable Dark Mode? [y/N]: " dark_choice
    [[ "$dark_choice" == "y" || "$dark_choice" == "Y" ]] && DARK_MODE=true
fi

# Prompt for Index Type if not specified and doing a full import
if [[ "$MODE" == "full" && "$INDEX_TYPE" == "both" ]]; then
    if [[ -t 0 ]]; then
        echo -e "\n${BLUE}Select Index Page Layout:${NC}"
        echo "1) WAN IP (index-page-wanip.yaml)"
        echo "2) WAN PPP (index-page-wanppp.yaml)"
        read -p "Select an option [1-2]: " index_choice
        case $index_choice in
            1) INDEX_TYPE="wanip" ;;
            2) INDEX_TYPE="wanppp" ;;
            *) INDEX_TYPE="wanip" ;; # Default
        esac
    else
        # Non-interactive default
        INDEX_TYPE="wanip"
    fi
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
        import_provisions
        import_vparams
        import_configs
        ;;
    vparams)
        import_vparams
        ;;
esac

# --- UI Customizations ---

# Find Public Directory
PUBLIC_DIR=""
for path in "/usr/lib/node_modules/genieacs/public" "/usr/local/lib/node_modules/genieacs/public"; do
    [[ -d "$path" ]] && PUBLIC_DIR="$path" && break
done

apply_branding "$PUBLIC_DIR"
[[ "$DARK_MODE" == true ]] && apply_dark_mode "$PUBLIC_DIR"


# Restart UI service to refresh cache
echo -e "\n${BLUE}Restarting GenieACS UI to apply changes...${NC}"
systemctl restart genieacs-ui 2>/dev/null || echo -e "${RED}Warning: Could not restart genieacs-ui service (try running as root)${NC}"

echo -e "\n${GREEN}Import Complete!${NC}"
