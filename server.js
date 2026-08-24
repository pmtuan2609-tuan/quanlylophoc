const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure data.json exists with correct initial structure
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        currentUser: null,
        students: [],
        seatingCharts: [],
        timetables: [],
        attendanceData: {},
        announcements: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
    // API endpoint for data retrieval
    if (req.method === 'GET' && req.url === '/api/data') {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                });
                res.end(JSON.stringify({ error: 'Failed to read data' }));
                return;
            }
            res.writeHead(200, { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            });
            res.end(data);
        });
    } 
    // API endpoint for data persistence
    else if (req.method === 'POST' && req.url === '/api/data') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8', (err) => {
                    if (err) {
                        res.writeHead(500, { 
                            'Content-Type': 'application/json', 
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                        });
                        res.end(JSON.stringify({ error: 'Failed to write data' }));
                        return;
                    }
                    res.writeHead(200, { 
                        'Content-Type': 'application/json', 
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                    });
                    res.end(JSON.stringify({ success: true }));

                    // Auto push data.json to GitHub when running server locally
                    exec('git add data.json && git commit -m "Auto-update classroom data" && git push', (gitErr) => {
                        if (gitErr) {
                            console.warn("Git auto-push failed (normal if not git repo or credentials not saved):", gitErr.message);
                        } else {
                            console.log("Classroom data successfully pushed to GitHub repository!");
                        }
                    });
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
    } 
    // Handle CORS preflight options request
    else if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
    } 
    // Serve static frontend files
    else {
        let reqPath = req.url === '/' ? '/index.html' : req.url;
        let filePath = path.join(__dirname, reqPath);
        
        // Prevent directory traversal attacks
        const relative = path.relative(__dirname, filePath);
        const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
        if (!isSafe && reqPath !== '/index.html') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }

        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
            case '.gif': contentType = 'image/gif'; break;
            case '.svg': contentType = 'image/svg+xml'; break;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(`Server Error: ${err.code}`);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Classroom Management system server running at http://localhost:${PORT}`);
});
