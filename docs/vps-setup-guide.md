# n8n VPS Setup Guide

Complete step-by-step guide to deploy n8n with custom nodes on a fresh Ubuntu VPS.

## Requirements

- Ubuntu 22.04 / 24.04 VPS (tested on Contabo)
- Root SSH access
- GitHub repo for custom nodes

---

## 1. Connect to VPS

```bash
ssh root@YOUR_SERVER_IP
```

---

## 2. Update System

```bash
apt update && apt upgrade -y
reboot
```

Reconnect after reboot:

```bash
ssh root@YOUR_SERVER_IP
```

---

## 3. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
node -v && npm -v
```

---

## 4. Install n8n and PM2

```bash
npm install -g n8n pm2
```

---

## 5. Create n8n User

```bash
useradd -m -s /bin/bash n8n
mkdir -p /home/n8n/.n8n
chown -R n8n:n8n /home/n8n
```

---

## 6. Install PostgreSQL

```bash
apt install -y postgresql
```

Create database and user:

```bash
sudo -u postgres psql -c "CREATE USER n8n WITH PASSWORD 'your-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE n8n OWNER n8n;"
```

---

## 7. Configure Environment

```bash
nano /home/n8n/.env
```

Paste the following (fill in your values):

```bash
# n8n core
N8N_ENCRYPTION_KEY=         # generate with: openssl rand -hex 32
N8N_PROTOCOL=http
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_SECURE_COOKIE=false
GENERIC_TIMEZONE=Asia/Riyadh
N8N_USER_FOLDER=/home/n8n/.n8n

# PostgreSQL
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=your-strong-password

# Custom nodes
N8N_CUSTOM_EXTENSIONS=/opt/n8n_custom_nodes/n8n-nodes-odoo-generic/dist
```

Set permissions:

```bash
chown n8n:n8n /home/n8n/.env
chmod 600 /home/n8n/.env
```

Generate encryption key:

```bash
openssl rand -hex 32
```

---

## 8. Install and Build Custom Nodes

```bash
npm install -g pnpm
cd /opt
git clone https://github.com/BasharZawa/n8n_custom_nodes.git
cd /opt/n8n_custom_nodes/n8n-nodes-odoo-generic
npm install
npm run build
```

---

## 9. Start n8n with PM2

```bash
su - n8n -c "pm2 start n8n --name n8n -- start"
su - n8n -c "pm2 save"
```

Enable auto-start on reboot:

```bash
pm2 startup
# copy and run the command it prints
```

---

## 10. Verify

Check n8n is running:

```bash
su - n8n -c "pm2 status"
su - n8n -c "pm2 logs n8n --lines 30 --nostream"
```

Open browser: `http://YOUR_SERVER_IP:5678`

---

## Updating Custom Nodes

When you push changes to the custom nodes repo:

```bash
cd /opt/n8n_custom_nodes
git pull
cd n8n-nodes-odoo-generic
npm run build
su - n8n -c "pm2 restart n8n --update-env"
```

---

## Adding a New Custom Node

1. Add the new node folder under `n8n-nodes-odoo-generic/` (or as a sibling folder)
2. Build it: `npm run build`
3. Append its dist path to `N8N_CUSTOM_EXTENSIONS` in `/home/n8n/.env` (colon-separated):
   ```bash
   N8N_CUSTOM_EXTENSIONS=/opt/n8n_custom_nodes/n8n-nodes-odoo-generic/dist:/opt/n8n_custom_nodes/n8n-nodes-another/dist
   ```
4. Restart: `su - n8n -c "pm2 restart n8n --update-env"`

---

## PM2 Cheat Sheet

All PM2 commands must be run as the `n8n` user:

```bash
su - n8n -c "pm2 status"
su - n8n -c "pm2 restart n8n --update-env"
su - n8n -c "pm2 logs n8n --lines 50 --nostream"
su - n8n -c "pm2 stop n8n"
```
