const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Vortex Backend v2 Running!", version: "2.0.0" });
});

// Download route
app.post("/download", (req, res) => {
  const { url, videoQuality, downloadMode, audioFormat } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL required" });
  }

  const isAudio = downloadMode === "audio";
  const quality = videoQuality || "1080";
  const aFormat = audioFormat || "mp3";

  let cmd;
  if (isAudio) {
    cmd = `yt-dlp --no-playlist -x --audio-format ${aFormat} --get-url "${url}"`;
  } else {
    cmd = `yt-dlp --no-playlist -f "bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best" --get-url "${url}"`;
  }

  console.log("Running:", cmd);

  exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("Error:", stderr || error.message);
      return res.status(500).json({ success: false, error: "Download failed" });
    }

    const downloadUrl = stdout.trim().split("\n").filter(Boolean)[0];

    if (!downloadUrl) {
      return res.status(500).json({ success: false, error: "No URL found" });
    }

    console.log("Success!");
    return res.json({ success: true, url: downloadUrl });
  });
});

app.listen(PORT, () => {
  console.log(`Vortex Backend v2 running on port ${PORT}`);
});
