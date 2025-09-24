# Start Production Environment (Local)
Write-Host "🔴 Starting Production Environment..." -ForegroundColor Red

# Set environment variables
$env:NODE_ENV = "production"
$env:REACT_APP_ENV = "production"

# Build frontend for production
Write-Host "🏗️ Building Frontend for Production..." -ForegroundColor Red
cd "c:/Users/sachi/Desktop/next-tech/frontend"
cp .env.production .env
npm run build:prod

# Start backend in production mode
Write-Host "📡 Starting Backend (Production)..." -ForegroundColor Red
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:/Users/sachi/Desktop/next-tech/backend'; cp .env.production .env; npm start"

# Serve frontend build
Write-Host "🌐 Serving Frontend (Production Build)..." -ForegroundColor Red
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:/Users/sachi/Desktop/next-tech/frontend'; npx serve -s build -l 3000"

Write-Host "✅ Production environment started!" -ForegroundColor Red
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Environment: PRODUCTION (Red Badge)" -ForegroundColor Red
Write-Host "⚠️  WARNING: This is PRODUCTION mode!" -ForegroundColor Red