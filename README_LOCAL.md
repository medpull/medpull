# Local preview for medpullwebsite

Serve the site at http://localhost:8000.

Quick start
```sh path=null start=null
chmod +x ../scripts/serve_medpullwebsite.sh
../scripts/serve_medpullwebsite.sh
```

Change port
```sh path=null start=null
PORT=8080 ../scripts/serve_medpullwebsite.sh
```

Alternative (without script)
```sh path=null start=null
python3 -m http.server 8000
```
Then open http://localhost:8000 in your browser.