# VPS deploy (PM2 + nginx)

Production runs on the VPS at `187.126.117.120`, alongside Postgres. nginx
terminates TLS (Let's Encrypt) and proxies to Next.js on `127.0.0.1:3000`,
which runs under PM2. Pushing to `main` triggers `.github/workflows/deploy.yml`,
which SSHes in and runs `deploy.sh`.

```
/var/www/nxtsft/
  deploy.sh  -> current/deploy/deploy.sh
  shared/.env           # all secrets, symlinked into every release
  releases/<ts>-<sha>/  # last 3 builds
  current    -> releases/<newest>
```

## One-time server setup (as root)

```bash
# Timezone (crontab.txt times are IST) + swap for next build
timedatectl set-timezone Asia/Kolkata
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Node 22, pnpm, PM2, nginx, certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
corepack enable
npm i -g pm2

# Deploy user
adduser --disabled-password --gecos "" deploy
mkdir -p /var/www/nxtsft/{shared,releases} && chown -R deploy:deploy /var/www/nxtsft
```

## As the `deploy` user (`su - deploy`)

```bash
# 1. GitHub read access: add the printed key to the repo as a Deploy key (read-only)
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 && cat ~/.ssh/id_ed25519.pub
ssh -T git@github.com            # accept host key

# 2. Secrets: copy every production env var from Vercel into shared/.env
#    (`vercel env pull .env.prod --environment=production` locally, then scp).
#    Change DATABASE_URL to localhost — no SSL needed on the same box:
#    DATABASE_URL="postgresql://nxtsft_app:<pw>@127.0.0.1:5432/nxtsft_prod"
nano /var/www/nxtsft/shared/.env && chmod 600 /var/www/nxtsft/shared/.env

# 3. First deploy (bootstraps deploy.sh from the repo)
git clone --depth 1 git@github.com:LookAround-B/nxtsft.git /tmp/nxtsft-boot
bash /tmp/nxtsft-boot/deploy/deploy.sh && rm -rf /tmp/nxtsft-boot
ln -sfn /var/www/nxtsft/current/deploy/deploy.sh /var/www/nxtsft/deploy.sh

# 4. PM2 on boot (prints a sudo command — run it as root)
pm2 startup

# 5. Crons
crontab /var/www/nxtsft/current/deploy/crontab.txt
```

## nginx + TLS (as root)

```bash
cp /var/www/nxtsft/current/deploy/nginx/nxtsft.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/nxtsft.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
# Only after DNS points at this VPS:
certbot --nginx -d nxtsft.com -d www.nxtsft.com
```

Hostinger panel firewall must allow TCP 22, 80, 443.

## GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions:

| Secret          | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| `VPS_HOST`    | `187.126.117.120`                                                   |
| `VPS_USER`    | `deploy`                                                            |
| `VPS_SSH_KEY` | private key whose`.pub` is in `/home/deploy/.ssh/authorized_keys` |

## Operations

```bash
pm2 logs nxtsft-web            # app logs
pm2 status
/var/www/nxtsft/deploy.sh      # manual deploy of main
tail -f ~/cron.log             # cron failures

# Rollback to the previous release
ln -sfn "$(ls -1dt /var/www/nxtsft/releases/*/ | sed -n 2p)" /var/www/nxtsft/current
pm2 reload nxtsft-web
```

Env change: edit `shared/.env`, then redeploy. `NEXT_PUBLIC_*` vars are
baked in at build time, so `pm2 reload` alone is only enough for
server-only vars.
