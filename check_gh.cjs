const https = require("https");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Node.js" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  try {
    const runs = await fetchJson("https://api.github.com/repos/syntheticae/Trouvaille/actions/runs?per_page=5");
    console.log("=== WORKFLOW RUNS ===");
    if (runs && runs.workflow_runs) {
      runs.workflow_runs.forEach(r => {
        console.log(`Run #${r.run_number} (${r.head_commit?.message?.slice(0, 40)}): status=${r.status}, conclusion=${r.conclusion}, created_at=${r.created_at}, updated_at=${r.updated_at}`);
      });
    } else {
      console.log("Runs response:", JSON.stringify(runs).slice(0, 200));
    }

    const releases = await fetchJson("https://api.github.com/repos/syntheticae/Trouvaille/releases");
    console.log("\n=== RELEASES ===");
    if (Array.isArray(releases)) {
      releases.forEach(rel => {
        console.log(`Tag: ${rel.tag_name}, Name: ${rel.name}, published_at: ${rel.published_at}`);
        if (rel.assets) {
          rel.assets.forEach(a => {
            console.log(`  - Asset: ${a.name}, updated_at: ${a.updated_at}, download_count: ${a.download_count}`);
          });
        }
      });
    } else {
      console.log("Releases response:", JSON.stringify(releases).slice(0, 200));
    }
  } catch (err) {
    console.error("Error fetching from GitHub API:", err);
  }
}

main();
