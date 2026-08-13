const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your_super_secret_string';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');

const server = http.createServer((req, res) => {
  // Only accept POST requests to /webhook
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    return res.end();
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    
    // Verify the GitHub webhook signature
    if (!signature) {
      console.error('No signature found in request');
      res.writeHead(400);
      return res.end('Missing signature');
    }

    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(body).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      console.log('Webhook authenticated. Triggering deployment...');
      res.writeHead(202);
      res.end('Deployment triggered');

      // Execute the deploy script
      const deployProcess = spawn('bash', [DEPLOY_SCRIPT], {
        detached: true,
        stdio: 'inherit' // This will print deploy output to the webhook's console
      });

      deployProcess.unref();
      
    } else {
      console.error('Webhook signature mismatch!');
      res.writeHead(401);
      res.end('Unauthorized');
    }
  });
});

server.listen(PORT, () => {
  console.log(`GitHub Webhook listener running on port ${PORT}`);
  console.log(`Make sure to set GITHUB_WEBHOOK_SECRET in your environment.`);
});
