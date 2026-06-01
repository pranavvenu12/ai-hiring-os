# AWS EC2 Deployment

This project uses AWS EC2 for a 24/7 FastAPI backend and keeps Supabase for database/auth.

## Target Setup

- Backend: FastAPI in Docker on EC2 Ubuntu
- Database/Auth: Supabase
- Frontend: Vercel or any static host
- HTTPS: Caddy or another reverse proxy in front of the backend

## 1. Launch EC2

Use these settings:

- Region: `ap-south-1` Mumbai if available, otherwise your current AWS region
- AMI: Ubuntu Server 24.04 LTS or 22.04 LTS
- Instance type: `t3.micro` or `t2.micro`
- Storage: 20 GB gp3
- Key pair: create/download a `.pem` key

Security group inbound rules:

| Type | Port | Source |
| --- | --- | --- |
| SSH | 22 | Your IP |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| Custom TCP | 8000 | Your IP only, temporary for testing |

## 2. SSH Into Server

From your local machine:

```bash
ssh -i path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 3. Install Docker

On the EC2 server:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and SSH back in so the Docker group applies.

## 4. Clone And Configure App

```bash
git clone https://github.com/pranavv1210/AI-Hiring-OS.git
cd AI-Hiring-OS
```

Create backend env:

```bash
nano backend/.env
```

Required values:

```env
APP_ENV=production
DEBUG=false
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN
AI_GEMINI_KEY=
AI_HF_KEY=
```

## 5. Start Backend

```bash
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml ps
docker compose -f docker-compose.aws.yml logs -f backend
```

Temporary test:

```bash
curl http://127.0.0.1:8000/health
```

From your laptop, test:

```txt
http://YOUR_EC2_PUBLIC_IP:8000/health
```

Remove public access to port `8000` after HTTPS is configured.

## 6. Add HTTPS

Your Vercel frontend is HTTPS, so the API should also be HTTPS. Use a domain or free subdomain and point an `A` record to the EC2 public IP.

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Create Caddy config:

```bash
sudo nano /etc/caddy/Caddyfile
```

Use:

```caddy
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8000
}
```

Reload:

```bash
sudo systemctl reload caddy
```

Test:

```txt
https://api.yourdomain.com/health
```

## 7. Update Frontend

Set this in Vercel/frontend hosting:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

Redeploy frontend.

## 8. Updating The Backend Later

On EC2:

```bash
cd AI-Hiring-OS
git pull origin main
docker compose -f docker-compose.aws.yml up -d --build
```

## 9. Cost Safety

Create an AWS Budget:

- Budget amount: `$5` or `$10`
- Alerts: 50%, 80%, 100%

Keep the instance small while using free credits.
