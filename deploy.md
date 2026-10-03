
Here's the full runbook in order. Run each block where its heading says (your laptop, VPS as root, or VPS as `deploy`).

## Step 1: Laptop. Commit the deploy kit

```bash
cd ~/lookaround/nxtsft
git add deploy .github
git commit -m "chore: VPS deploy kit (PM2 + nginx + GitHub Actions) [skip ci]"
git push origin main
```

## Step 2: Laptop. Finish `.env.prod`

1.  every `[SENSITIVE]` value: 29 can come from your local `.env`, and the other 18 from the sources in my previous message.
2. Change the database line to:
   ```
   DATABASE_URL="postgresql://nxtsft_app:<password>@127.0.0.1:5432/nxtsft_prod"
   ```
3. Add `TRUSTED_PROXY_COUNT=1`.
4. Delete any `VERCEL_*` lines.
5. Make sure no `[SENSITIVE]` is left. This should print `0`:
   ```bash
   grep -c SENSITIVE .env.prod
   ```

## Step 3: VPS as root. Base setup

```bash
ssh root@187.126.117.120

timedatectl set-timezone Asia/Kolkata
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
corepack enable
npm i -g pm2

adduser --disabled-password --gecos "" deploy
mkdir -p /var/www/nxtsft/{shared,releases} && chown -R deploy:deploy /var/www/nxtsft
```

In the Hostinger panel firewall, allow TCP **22, 80 and 443**.

## Step 4: Laptop. Upload the env file

```bash
scp .env.prod root@187.126.117.120:/var/www/nxtsft/shared/.env
ssh root@187.126.117.120 "chown deploy:deploy /var/www/nxtsft/shared/.env && chmod 600 /var/www/nxtsft/shared/.env"
```

## Step 5: VPS as `deploy`. GitHub access

```bash
su - deploy
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

1. Copy the printed key.
2. In GitHub, open the repo → **Settings → Deploy keys → Add**, paste it, and leave write access off.
3. Back on the VPS:
   ```bash
   ssh -T git@github.com     # type "yes"
   ```

## Step 6: VPS as `deploy`. First deploy

```bash
git clone --depth 1 git@github.com:LookAround-B/nxtsft.git /tmp/nxtsft-boot
bash /tmp/nxtsft-boot/deploy/deploy.sh && rm -rf /tmp/nxtsft-boot
ln -sfn /var/www/nxtsft/current/deploy/deploy.sh /var/www/nxtsft/deploy.sh

pm2 startup        # copy the "sudo ..." line it prints, run it as root
pm2 save
crontab /var/www/nxtsft/current/deploy/crontab.txt
```

- The first build takes about 5–10 minutes.
- It should end with `Health check OK`. If it doesn't, check `pm2 logs nxtsft-web`.

## Step 7: VPS as root. nginx

```bash
cp /var/www/nxtsft/current/deploy/nginx/nxtsft.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/nxtsft.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## Step 8: Laptop. Test before switching DNS

1. Add this line to `/etc/hosts`:
   ```
   187.126.117.120  www.nxtsft.com nxtsft.com
   ```
2. Open **http://**www.nxtsft.com (not https yet) and check:
   - home page loads
   - property pages load
   - OTP login works
   - admin portal works
   - photo upload works
3. Remove the hosts line when you're done.

Google login and payments may fail over plain HTTP. Test those after Step 9.

## Step 9: Switch DNS

1. At your domain registrar, point the A records for `@` and `www` to `187.126.117.120`, and delete any Vercel CNAME or A records.
2. Wait until this shows the VPS IP:
   ```bash
   dig +short www.nxtsft.com
   ```
3. Then on the VPS, as root:
   ```bash
   certbot --nginx -d nxtsft.com -d www.nxtsft.com
   ```
4. Over HTTPS, test Google login, one payment, and the Razorpay webhook.

## Step 10: GitHub. Auto-deploy

1. On the VPS as `deploy`, create a key just for GitHub Actions:
   ```bash
   ssh-keygen -t ed25519 -N "" -f ~/.ssh/gh_actions
   cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/gh_actions          # private key → GitHub secret
   ```
2. In the repo, go to **Settings → Secrets → Actions** and add:
   - `VPS_HOST` = `187.126.117.120`
   - `VPS_USER` = `deploy`
   - `VPS_SSH_KEY` = the private key printed above

From then on, every push to `main` deploys to the VPS automatically.

## Step 11: After going live

- Turn off whatever external scheduler was calling the cron routes on Vercel, or the jobs will run twice.
- Keep the Vercel project for about a week as a rollback. Switching DNS back to Vercel is the rollback.
- After that, remove the domain from the Vercel project. Otherwise every push to `main` also deploys on Vercel.
- Close public port 5432 in the Hostinger firewall, since the app now connects locally. Check first that nothing else uses the database remotely.

## Things to remember

- **Schema changes:** run `prisma db push` by hand **before** merging. `deploy.sh` doesn't run it.
- **Env changes:** edit `/var/www/nxtsft/shared/.env`, then run `/var/www/nxtsft/deploy.sh`. Changing a `NEXT_PUBLIC_*` value needs this full redeploy.
- **Rollback a bad deploy:**
  ```bash
  ln -sfn "$(ls -1dt /var/www/nxtsft/releases/*/ | sed -n 2p)" /var/www/nxtsft/current && pm2 reload nxtsft-web
  ```

  This rolls back the code only, not a schema change.

Tell me which step fails if you get stuck. I can also do Step 1 and the `.env.prod` fill (Step 2) now.
