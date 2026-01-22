# Deploying to Vercel

This guide will help you deploy the AeroSwift AI application to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/docs/cli) installed (optional, for CLI deployment)
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your Git repository
   - Vercel will automatically detect it as a Vite project

3. **Configure Environment Variables**:
   In the project settings, add these environment variables:
   
   ```
   VITE_SOLACE_URL=ws://your-solace-broker:8008
   VITE_SOLACE_VPN=your-vpn-name
   VITE_SOLACE_USERNAME=your-username
   VITE_SOLACE_PASSWORD=your-password
   VITE_VIDEO_TOPIC=aeroswift/camera/feed
   VITE_ANALYTICS_TOPIC=aeroswift/camera/analytics/gate1
   VITE_DEMO_MODE=false
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll get a production URL (e.g., `your-app.vercel.app`)

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts to configure your project.

4. **Set Environment Variables**:
   ```bash
   vercel env add VITE_SOLACE_URL
   vercel env add VITE_SOLACE_VPN
   vercel env add VITE_SOLACE_USERNAME
   vercel env add VITE_SOLACE_PASSWORD
   vercel env add VITE_VIDEO_TOPIC
   vercel env add VITE_ANALYTICS_TOPIC
   vercel env add VITE_DEMO_MODE
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Important Notes

### WebSocket Connections

- Ensure your Solace broker is accessible from the internet
- If using a local Solace broker, you'll need to expose it or use a cloud-hosted broker
- WebSocket URLs must use `ws://` or `wss://` (secure WebSocket recommended for production)

### Demo Mode

- Set `VITE_DEMO_MODE=true` to run the app without a Solace connection
- Useful for testing the deployment before configuring the broker

### CORS Configuration

If you encounter CORS issues with your Solace broker:
1. Configure your Solace broker to allow requests from your Vercel domain
2. Use `wss://` (secure WebSocket) for production deployments

## Continuous Deployment

Once connected to a Git repository, Vercel will automatically:
- Deploy on every push to the main branch
- Create preview deployments for pull requests
- Provide deployment URLs for each commit

## Custom Domain

To add a custom domain:
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify environment variables are set correctly
- Review build logs in Vercel dashboard

### WebSocket Connection Issues
- Verify Solace broker URL is accessible from the internet
- Check that the broker allows WebSocket connections
- Ensure firewall rules allow WebSocket traffic

### Environment Variables Not Working
- Environment variables must start with `VITE_` to be exposed to the client
- Redeploy after adding/changing environment variables
- Clear browser cache if changes don't appear

## Support

For Vercel-specific issues, see [Vercel Documentation](https://vercel.com/docs)
