const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const https = require("https");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Vortex Backend v2 Running!", version: "2.0.0" });
});

// Get download URL
app.post("/download", (req, res) => {
  const { url, videoQuality, downloadMode, audioFormat } = req.body;
  if (!url) return res.status(400).json({ success: false, error: "URL required" });

  const isAudio = downloadMode === "audio";
  const quality = videoQuality || "1080";
  const aFormat = audioFormat || "mp3";

  let cmd;
  if (isAudio) {
    cmd = `yt-dlp --no-playlist -x --audio-format ${aFormat} --get-url "${url}"`;
  } else {
    cmd = `yt-dlp --no-playlist -f "bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best" --get-url "${url}"`;
  }

  console.log("CMD:", cmd);

  exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("Error:", stderr || error.message);
      return res.status(500).json({ success: false, error: "Download failed" });
    }
    const urls = stdout.trim().split("\n").filter(Boolean);
    const downloadUrl = urls[0];
    if (!downloadUrl) return res.status(500).json({ success: false, error: "No URL found" });
    console.log("Success! URLs found:", urls.length);
    return res.json({ success: true, url: downloadUrl, allUrls: urls });
  });
});

// Proxy download — file seedha backend se deta hai
app.get("/proxy", (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("URL required");

  const name = filename || "vortex-download.mp4";
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Access-Control-Allow-Origin", "*");

  const protocol = url.startsWith("https") ? https : http;

  const makeRequest = (targetUrl, redirectCount = 0) => {
    if (redirectCount > 5) return res.status(500).send("Too many redirects");

    protocol.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.tiktok.com/",
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        console.log("Redirect to:", redirectUrl);
        return makeRequest(redirectUrl, redirectCount + 1);
      }

      if (response.statusCode !== 200) {
        return res.status(response.statusCode).send("Failed to fetch");
      }

      if (response.headers["content-type"]) {
        res.setHeader("Content-Type", response.headers["content-type"]);
      }
      if (response.headers["content-length"]) {
        res.setHeader("Content-Length", response.headers["content-length"]);
      }

      response.pipe(res);
    }).on("error", (err) => {
      console.error("Proxy error:", err);
      res.status(500).send("Proxy error");
    });
  };

  makeRequest(url);
});

app.listen(PORT, () => console.log(`Vortex Backend v2 running on port ${PORT}`));
