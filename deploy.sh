#!/bin/bash
# Osprey Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e  # Exit on error

ENVIRONMENT=${1:-production}

echo "🚀 Deploying Osprey to $ENVIRONMENT..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

# Step 2: Run database migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd backend
pip install -r requirements.txt
alembic upgrade head
cd ..

# Step 3: Restart services (depends on your hosting platform)
echo -e "${BLUE}🔄 Restarting services...${NC}"

if [ "$ENVIRONMENT" = "digitalocean" ]; then
    # DigitalOcean deployment
    echo "Deploying to DigitalOcean..."
    # SSH into droplet and restart services
    # ssh user@your-droplet "cd /app && docker-compose down && docker-compose up -d"
    
elif [ "$ENVIRONMENT" = "railway" ]; then
    # Railway deployment (automatic on git push)
    echo "Pushing to Railway..."
    git push railway main
    
elif [ "$ENVIRONMENT" = "docker" ]; then
    # Local Docker deployment
    echo "Rebuilding Docker containers..."
    docker-compose down
    docker-compose build
    docker-compose up -d
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check application health: curl https://your-domain.com/health"
echo "2. Monitor logs for errors"
echo "3. Test critical user flows"
