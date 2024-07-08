const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const MAX_CONNECTIONS = 20;
const zipFilePath = path.resolve(__dirname, 'example.zip');

app.get('/download', (req, res) => {
    const stat = fs.statSync(zipFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
            res.status(416).send('Requested range not satisfiable\n' + start + ' - ' + end);
            return;
        }

        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(zipFilePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'application/zip',
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'application/zip',
        };
        res.writeHead(200, head);
        fs.createReadStream(zipFilePath).pipe(res);
    }
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Limit the number of concurrent connections
let connectionCount = 0;

app.use((req, res, next) => {
    if (connectionCount >= MAX_CONNECTIONS) {
        res.status(503).send('Server is busy, please try again later.');
    } else {
        connectionCount++;
        res.on('finish', () => {
            connectionCount--;
        });
        next();
    }
});
