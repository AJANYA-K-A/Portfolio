const http = require('http');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception caught safely:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection caught safely:', reason);
});

const PORTS = [3000, 3001];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml'
};

const PORTFOLIO_ROOT = path.join(__dirname, '..');
const DIR_AA = path.join(PORTFOLIO_ROOT, 'AA');
const DIR_33 = path.join(PORTFOLIO_ROOT, '33');
const DIR_2NS = path.join(PORTFOLIO_ROOT, '2ns');
const DIR_V1 = path.join(PORTFOLIO_ROOT, 'ezgif-166a40c6d086f400-jpg');
const DIR_A = path.join(PORTFOLIO_ROOT, 'a');

function createRequestHandler() {
  return (req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let targetFile = null;

    if (reqPath.startsWith('/aa/')) {
      targetFile = path.join(DIR_AA, reqPath.slice(4));
    } else if (reqPath.startsWith('/a/')) {
      targetFile = path.join(DIR_A, reqPath.slice(3));
    } else if (reqPath.startsWith('/banner/')) {
      targetFile = path.join(DIR_A, reqPath.slice(8));
    } else if (reqPath.startsWith('/v3/')) {
      targetFile = path.join(DIR_33, reqPath.slice(4));
    } else if (reqPath.startsWith('/v2/')) {
      targetFile = path.join(DIR_2NS, reqPath.slice(4));
    } else if (reqPath.startsWith('/v1/')) {
      targetFile = path.join(DIR_V1, reqPath.slice(4));
    } else {
      targetFile = path.join(__dirname, reqPath);
    }

    fs.stat(targetFile, (err, stats) => {
      if (err || !stats.isFile()) {
        const fallbacks = [
          path.join(DIR_A, reqPath),
          path.join(DIR_AA, reqPath),
          path.join(DIR_33, reqPath),
          path.join(DIR_2NS, reqPath)
        ];
        
        function tryFallback(idx) {
          if (idx >= fallbacks.length) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found: ' + reqPath);
            return;
          }
          fs.stat(fallbacks[idx], (fErr, fStats) => {
            if (!fErr && fStats.isFile()) {
              serveFile(fallbacks[idx], req, res);
            } else {
              tryFallback(idx + 1);
            }
          });
        }
        
        tryFallback(0);
        return;
      }
      serveFile(targetFile, req, res);
    });
  };
}

function serveFile(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const isMedia = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg' || ext === '.mp4' || ext === '.webm';

  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes'
  };

  if (isMedia) {
    headers['Cache-Control'] = 'public, max-age=86400';
  } else {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Stream Error');
    }
  });
  req.on('close', () => {
    stream.destroy();
  });
  res.on('error', (err) => {
    stream.destroy();
  });

  res.writeHead(200, headers);
  stream.pipe(res);
}

PORTS.forEach((port) => {
  const server = http.createServer(createRequestHandler());
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, will continue on available ports.`);
    } else {
      console.error(`Server error on port ${port}:`, e);
    }
  });
  server.listen(port, () => {
    console.log(`Portfolio Server live: http://localhost:${port}/`);
  });
});
