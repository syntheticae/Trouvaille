const fs = require("fs");

// 1. Update build-ios.yml with overwrite: true and make_latest: true
let yml = fs.readFileSync(".github/workflows/build-ios.yml", "utf8").replace(/\r\n/g, "\n");

const oldReleaseStep = `      - name: Publish Direct .ipa Download to GitHub Releases
        uses: softprops/action-gh-release@v2
        if: github.ref == 'refs/heads/main'
        with:
          tag_name: latest
          name: "Trouvaille iOS Unsigned IPA (AltStore)"
          body: |
            ### 📱 Trouvaille iOS Native App (.ipa)
            Direct download for AltStore sideloading:
            - Tap **Trouvaille.ipa** below in Safari on your iPhone.
            - Open in **AltStore** to install and re-sign with your free Apple ID.
          files: |
            Trouvaille.ipa
            Trouvaille-unsigned.ipa
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

const newReleaseStep = `      - name: Publish Direct .ipa Download to GitHub Releases
        uses: softprops/action-gh-release@v2
        if: github.ref == 'refs/heads/main'
        with:
          tag_name: latest
          name: "Trouvaille iOS Unsigned IPA (Latest Build)"
          draft: false
          prerelease: false
          overwrite: true
          make_latest: true
          body: |
            ### 📱 Trouvaille iOS Native App (.ipa)
            **Commit**: \`\${{ github.sha }}\`
            Direct download for AltStore / Sideloadly / LiveContainer:
            - Tap **Trouvaille.ipa** below in Safari on your iPhone.
            - Open in **AltStore** to install and re-sign with your Apple ID.
          files: |
            Trouvaille.ipa
            Trouvaille-unsigned.ipa
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

yml = yml.replace(oldReleaseStep, newReleaseStep);
fs.writeFileSync(".github/workflows/build-ios.yml", yml, "utf8");
console.log("Updated build-ios.yml with overwrite: true and make_latest: true");

// 2. Add ServiceWorker unregister & cache clear in main.tsx
let mainTsx = fs.readFileSync("src/main.tsx", "utf8").replace(/\r\n/g, "\n");
if (!mainTsx.includes("navigator.serviceWorker.getRegistrations")) {
  const swClearCode = `// Clean up any stale Service Worker or CacheStorage in native iOS WebView
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
}\n\n`;
  mainTsx = swClearCode + mainTsx;
  fs.writeFileSync("src/main.tsx", mainTsx, "utf8");
  console.log("Added ServiceWorker & cache clear in main.tsx");
}
