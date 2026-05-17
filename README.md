# GenieACS Automated Installer

An automated deployment, configuration, and provisioning sync tool for **GenieACS** on Debian. Designed by EtherGig to simplify the deployment of GenieACS and manage configurations as code.

## Features

- **Automated Setup:** Quickly installs Node.js 20, MongoDB 8.0, and GenieACS via NPM.
- **Service Management:** Automatically creates and configures Systemd services (`cwmp`, `nbi`, `fs`, `ui`).
- **Log Management:** Configures `logrotate` for all GenieACS logs.
- **Configuration Import:** Includes a powerful `genieacs-import.sh` tool to seamlessly push Provisions, Virtual Parameters, and UI configurations (with multiple themes) directly from the repository to your GenieACS instance via the NBI and MongoDB.
- **UI Customizations:** Provides "Vanilla", "Light" (Premium White-label), and "Dark" (Midnight) UI themes.

## Prerequisites

- **OS:** Debian Linux (Bookworm or newer recommended)
- **Privileges:** Root access (`sudo`)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/EtherGig/genieacs-installer.git
   cd genieacs-installer
   ```

2. Make the scripts executable:
   ```bash
   sudo chmod +x install.sh genieacs-import.sh
   ```

3. Run the installer:
   ```bash
   sudo ./install.sh
   ```
   *Note: You can pass `--import` or `--no-import` to skip the interactive prompt during installation.*

After the installation completes, the GenieACS UI will be accessible at `http://YOUR_SERVER_IP:3000` and the CWMP endpoint at `http://YOUR_SERVER_IP:7547`.

**IMPORTANT:** Before running the configuration import script manually for the first time, make sure to visit the Web UI (`http://YOUR_SERVER_IP:3000`) and complete the initial seeding wizard (creating the default admin user).

## Configuration Import (`genieacs-import.sh`)

The `genieacs-import.sh` script syncs your local repository configurations (Provisions, Virtual Parameters, and UI Configs) into your GenieACS instance.

### Interactive Mode

Simply run the script with root privileges and follow the prompts:
```bash
sudo ./genieacs-import.sh
```
You will be asked to choose:
1. Sync mode (Full Sync vs Virtual Parameters Only)
2. UI Theme (Vanilla, Light Premium, Dark Midnight)
3. Index Page Layout (WAN IP vs WAN PPP)
4. Your ACS URL (e.g., `http://acs.example.com:7547`)

### Non-Interactive (CLI) Mode

For automated deployments or cron jobs, you can use CLI arguments:

```bash
sudo ./genieacs-import.sh --mode full --index-type wanppp --theme dark --acs-url http://acs.example.com:7547 --yes
```

#### Available Options:
- `--mode <full|vparams>`: Choose to import everything or just virtual parameters.
- `--index-type <wanip|wanppp>`: Select the layout for the index page.
- `--theme <vanilla|light|dark>`: Apply custom UI themes.
- `--acs-url <url>`: The URL for your ACS server (injected into the `inform` provision script).
- `--yes` or `-y`: Bypass the warning prompt (useful for automation).

## Directory Structure

- `install.sh`: The main deployment script.
- `genieacs-import.sh`: The configuration synchronization and theming utility.
- `config/`: Contains YAML/JSON definitions for GenieACS UI configurations (device pages, index pages, filters, charts).
- `provision-script/`: JavaScript files for GenieACS provisions (e.g., `inform.js`).
- `virtual-params/`: Custom Virtual Parameters scripts used to extract and normalize device data.
- `templates/`: Base templates for `.env` variables and systemd service units.

## Updating Configurations

If you make changes to the scripts, UI configs, or parameters in the repository (or pull updates from Git), you can easily apply them by re-running the import script:

```bash
git pull
sudo ./genieacs-import.sh
```

## Disclaimer

**WARNING:** The `genieacs-import.sh` script will overwrite manual configurations made via the GenieACS Web UI. It is highly recommended to treat this repository as the single source of truth for your GenieACS configurations.
