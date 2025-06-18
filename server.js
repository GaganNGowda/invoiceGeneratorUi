const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, "dist")));

// Serve index.html for all unmatched routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
