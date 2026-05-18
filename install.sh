#!/bin/bash

# GenieACS Automated Installer for Debian
# Installs Node.js, MongoDB, GenieACS and setups Systemd services

set -e

# Configuration
NODE_VERSION="20"
MONGODB_VERSION="8.0"
GENIEACS_USER="genieacs"
GENIEACS_HOME="/opt/genieacs"
LOG_DIR="/var/log/genieacs"

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
    echo -e "                   GenieACS Automated Installer\n"
}

show_header

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Parse arguments
RUN_IMPORT="ask"
for arg in "$@"; do
    case $arg in
        --no-import) RUN_IMPORT="false" ;;
        --import) RUN_IMPORT="true" ;;
    esac
done

echo -e "${BLUE}Starting GenieACS Installation on Debian...${NC}"

# 1. Update and install basic dependencies
echo -e "${BLUE}Installing basic dependencies...${NC}"
apt-get update
apt-get install -y curl gnupg build-essential jq git logrotate lsb-release

# 2. Install Node.js
echo -e "${BLUE}Installing Node.js ${NODE_VERSION}...${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
npm install -g js-yaml

# 3. Install MongoDB
echo -e "${BLUE}Installing MongoDB ${MONGODB_VERSION}...${NC}"

# Detect Debian Codename and fallback to bookworm if on trixie/testing
CODENAME=$(lsb_release -cs)
if [[ "$CODENAME" == "trixie" || "$CODENAME" == "sid" || -z "$CODENAME" ]]; then
    echo -e "${BLUE}Debian ${CODENAME} detected. Falling back to Bookworm repository for MongoDB compatibility.${NC}"
    CODENAME="bookworm"
fi

# Use the newer pgp.mongodb.com domain for keys
curl -fsSL https://pgp.mongodb.com/server-${MONGODB_VERSION}.asc | \
   gpg --dearmor -o /usr/share/keyrings/mongodb-server-keyring.gpg
   
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-keyring.gpg ] http://repo.mongodb.org/apt/debian ${CODENAME}/mongodb-org/${MONGODB_VERSION} main" | \
   tee /etc/apt/sources.list.d/mongodb-org-${MONGODB_VERSION}.list

apt-get update
apt-get install -y mongodb-org

systemctl enable mongod
systemctl start mongod

# 4. Install GenieACS
echo -e "${BLUE}Installing GenieACS via NPM...${NC}"
npm install -g genieacs@latest

# 5. Create GenieACS User and Directories
echo -e "${BLUE}Setting up GenieACS user and directories...${NC}"
if ! id "$GENIEACS_USER" &>/dev/null; then
    useradd --system --no-create-home --user-group "$GENIEACS_USER"
fi

mkdir -p "$GENIEACS_HOME" "$GENIEACS_HOME/ext" "$LOG_DIR"
chown -R "$GENIEACS_USER":"$GENIEACS_USER" "$GENIEACS_HOME" "$LOG_DIR"

# 6. Configure Environment File
echo -e "${BLUE}Configuring environment file...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(128).toString('hex'))")
sed "s/{{JWT_SECRET}}/$JWT_SECRET/" templates/genieacs.env.template > "$GENIEACS_HOME/genieacs.env"
chown "$GENIEACS_USER":"$GENIEACS_USER" "$GENIEACS_HOME/genieacs.env"
chmod 600 "$GENIEACS_HOME/genieacs.env"

# 7. Setup Systemd Services
echo -e "${BLUE}Setting up Systemd services...${NC}"
for service in cwmp nbi fs ui; do
    cp "templates/genieacs-$service.service" "/etc/systemd/system/genieacs-$service.service"
    systemctl daemon-reload
    systemctl enable "genieacs-$service"
    systemctl start "genieacs-$service"
done

# 8. Configure Logrotate
echo -e "${BLUE}Configuring logrotate...${NC}"
cat <<EOF > /etc/logrotate.d/genieacs
$LOG_DIR/*.log $LOG_DIR/*.yaml {
    daily
    rotate 30
    compress
    delaycompress
    dateext
    missingok
    notifempty
    copytruncate
}
EOF

# 9. Initial Configuration Import
echo -e "${BLUE}Waiting for GenieACS NBI to start...${NC}"
until curl -s http://localhost:7557/ > /dev/null; do
    echo -n "."
    sleep 2
done
echo ""

if [[ "$RUN_IMPORT" == "ask" ]]; then
    read -p "Do you want to import configuration from GitHub now? [Y/n]: " import_choice
    if [[ "$import_choice" =~ ^[Nn]$ ]]; then
        RUN_IMPORT="false"
    else
        RUN_IMPORT="true"
    fi
fi

if [[ "$RUN_IMPORT" == "true" ]]; then
    echo -e "${BLUE}Starting configuration import...${NC}"
    ./genieacs-import.sh --full
else
    echo -e "${BLUE}Skipping configuration import. You can run it later using ./genieacs-import.sh${NC}"
fi

echo -e "${GREEN}GenieACS Installation and Configuration Complete!${NC}"
echo -e "UI is accessible at: http://YOUR_IP:3000"
echo -e "CWMP is listening at: http://YOUR_IP:7547"
echo -e ""
echo -e "To import your configuration later, run: ./genieacs-import.sh"
