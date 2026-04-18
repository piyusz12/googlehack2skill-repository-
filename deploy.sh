#!/bin/bash
# ============================================
# VenueFlow — Complete Cloud Run Deployment Script
# ============================================
# Run this in Google Cloud Shell:
#   chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

PROJECT_ID="hack2skill-493718"
REGION="europe-west1"
SERVICE_NAME="venueflow"
REPO_NAME="venueflow-repo"

echo "=========================================="
echo "🏟️  VenueFlow — Cloud Run Deployment"
echo "=========================================="
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Service:  $SERVICE_NAME"
echo "=========================================="

# Step 1: Set project
echo ""
echo "📌 Step 1: Setting project..."
gcloud config set project $PROJECT_ID

# Step 2: Enable ALL required APIs
echo ""
echo "📌 Step 2: Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    containerregistry.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com

echo "✅ APIs enabled"

# Step 3: Grant permissions to Cloud Build service account
echo ""
echo "📌 Step 3: Setting up IAM permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Storage Admin (needed for Cloud Build to read/write build artifacts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/storage.admin" \
    --quiet 2>/dev/null || true

# Grant Cloud Run Admin to Cloud Build
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin" \
    --quiet 2>/dev/null || true

# Grant Service Account User
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser" \
    --quiet 2>/dev/null || true

# Grant Artifact Registry Writer
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.writer" \
    --quiet 2>/dev/null || true

echo "✅ Permissions configured"

# Step 4: Create Artifact Registry repository (if it doesn't exist)
echo ""
echo "📌 Step 4: Creating Artifact Registry repository..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --quiet 2>/dev/null || echo "   (Repository already exists — OK)"

echo "✅ Repository ready"

# Step 5: Deploy to Cloud Run using --source (builds remotely, no local Docker needed)
echo ""
echo "📌 Step 5: Deploying to Cloud Run..."
echo "   This will take 2-5 minutes. Please wait..."
echo ""

gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8080 \
    --set-env-vars "NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_REGION=$REGION" \
    --quiet

# Step 6: Get the URL
echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "🌐 Your app is live at: $SERVICE_URL"
echo ""
echo "🔍 Health check: $SERVICE_URL/healthz"
echo "=========================================="
