# dsc-alarm-navigator

PC1864 Menu Map: a click-through map of the DSC PowerSeries PC1864 keypad and installer programming menus. A keypad simulator shows which section, sub-section and entry you are in, and the keys you pressed to get there.

Plain HTML, CSS and JavaScript. No build step and no dependencies.

## Project layout

| Path | What it is |
|------|------------|
| `src/` | The site. Everything in here is what gets deployed. |
| `src/data.js` | Menu data: every section, entry, option and default. |
| `src/app.js` | Keypad simulator and page logic. |
| `dsc.iamonline.co.za` | nginx config for the live site. |

## Run locally

Open `src/index.html` in a browser.

## Deploy to the server

DNS for dsc.iamonline.co.za must point at the server before running certbot.

From the repo root on the server:

```bash
mkdir -p /var/www/dsc.iamonline.co.za
cp -r src/. /var/www/dsc.iamonline.co.za/
cp dsc.iamonline.co.za /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/dsc.iamonline.co.za /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d dsc.iamonline.co.za
```

Certbot edits the nginx config in place. It adds HTTPS and redirects plain HTTP to it.

### Updating the site

Copy the files over again. nginx does not need a reload for file changes.

```bash
cp -r src/. /var/www/dsc.iamonline.co.za/
```

Browsers re-check the files on every visit, so changes show up straight away.

## Notes

- The nginx config sends a strict content security policy. The page may only load its own files and Google Fonts. Keep styles and scripts in their files, not inline in the HTML.
- Menu data comes from the DSC PC1616/PC1832/PC1864 v4.2 installation guide. Check your panel's version with `[*][8][installer code][900]`.
- The simulator never talks to a real panel.
