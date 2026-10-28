import zipfile
import json
import os
import subprocess

original_apk = r"C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht\web\public\downloads\asisttecht-movil.apk"
temp_apk = r"C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht\asisttecht-temp.apk"
final_apk_dir = r"C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht\web\public\downloads"
signer_jar = r"C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht\uber-apk-signer.jar"
java_exe = r"C:\Program Files\Java\jre-1.8\bin\java.exe"

server_url = "http://192.168.0.14:8080"
server_login = server_url + "/ingreso"

settings_json = {
    "sites": [
        {
            "url": server_login,
            "title": "AsisTecht Campus Virtual"
        }
    ],
    "other": server_url + "/",
    "match": [
        ["host", "equals", "192.168.0.14"],
        ["host", "equals", "localhost"],
        ["host", "equals", "10.0.2.2"],
        ["host", "contains", "192.168."],
        ["host", "contains", "10."],
        ["host", "contains", "172."]
    ],
    "skip": [
        ["path", "endsWith", ".epub"],
        ["query", "contains", "type=epub"]
    ],
    "remote_debug": True,
    "console_log": True,
    "js_interface": True,
    "context_menu": False,
    "not_matching": False,
    "local_sites": False,
    "update_zip": "",
    "web_settings": {
        "JavaScriptEnabled": True,
        "DomStorageEnabled": True
    },
    "source": "assets",
    "timestamp": "2026-10-25T14:30:00Z"
}

index_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AsisTecht - Sistema de Gestión Escolar</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        body {{
            background: linear-gradient(145deg, #0b1120 0%, #151e32 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 1rem;
            text-align: center;
        }}
        .card {{
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            padding: 2rem 1.5rem;
            max-width: 380px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }}
        .logo {{
            width: 64px;
            height: 64px;
            border-radius: 18px;
            background: linear-gradient(135deg, #0e6b52, #059669);
            color: white;
            font-size: 1.7rem;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            box-shadow: 0 8px 24px rgba(14, 107, 82, 0.4);
        }}
        h1 {{
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 0.25rem;
            color: #ffffff;
        }}
        p.sub {{
            font-size: 0.82rem;
            color: #94a3b8;
            margin-bottom: 1.5rem;
        }}
        .spinner {{
            width: 36px;
            height: 36px;
            border: 3.5px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1.25rem;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        .status {{
            font-size: 0.88rem;
            color: #34d399;
            font-weight: 600;
            margin-bottom: 1.25rem;
        }}
        .btn {{
            background: linear-gradient(135deg, #0e6b52, #059669);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.85rem 1.25rem;
            font-size: 0.95rem;
            font-weight: 700;
            width: 100%;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(14, 107, 82, 0.4);
            display: block;
            text-decoration: none;
            margin-bottom: 0.75rem;
        }}
        .btn:active {{
            transform: scale(0.97);
        }}
        .ip-box {{
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            text-align: left;
        }}
        label {{
            font-size: 0.72rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-weight: 700;
            display: block;
            margin-bottom: 0.35rem;
        }}
        input {{
            width: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            color: #f8fafc;
            padding: 0.65rem 0.85rem;
            border-radius: 10px;
            font-size: 0.85rem;
            margin-bottom: 0.65rem;
            outline: none;
        }}
        input:focus {{
            border-color: #10b981;
        }}
        .btn-outline {{
            background: transparent;
            border: 1.5px solid #334155;
            color: #cbd5e1;
            border-radius: 10px;
            padding: 0.55rem;
            font-size: 0.8rem;
            font-weight: 600;
            width: 100%;
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">GIR</div>
        <h1>AsisTecht</h1>
        <p class="sub">Gimnasio José Eustasio Rivera<br>Campus Virtual Institucional</p>
        
        <div class="spinner" id="spinner"></div>
        <div class="status" id="status">Conectando al Campus Virtual...</div>
        
        <button class="btn" id="btn-conectar" onclick="conectarManual()">
            🚀 Entrar Ahora
        </button>

        <div class="ip-box">
            <label>Dirección del Servidor:</label>
            <input type="text" id="server-url" value="{server_url}" />
            <button class="btn-outline" onclick="guardarYConectar()">
                Guardar y Reconectar
            </button>
        </div>
    </div>

    <script>
        var defaultUrl = "{server_url}";
        var currentUrl = localStorage.getItem("asisttecht_server") || defaultUrl;
        document.getElementById("server-url").value = currentUrl;

        function conectar(target) {{
            var url = target || currentUrl;
            document.getElementById("status").innerText = "Abriendo " + url + "...";
            window.location.replace(url + "/ingreso");
        }}

        function conectarManual() {{
            var val = document.getElementById("server-url").value.trim();
            if (val) {{
                localStorage.setItem("asisttecht_server", val);
                conectar(val);
            }}
        }}

        function guardarYConectar() {{
            conectarManual();
        }}

        // Redirección automática inmediata
        setTimeout(function() {{
            conectar(currentUrl);
        }}, 600);
    </script>
</body>
</html>
"""

config_json = {
    "sites": {
        "local/index.html": "AsisTecht Campus Virtual"
    },
    "bundles": [],
    "prefix": "https://appassets.androidplatform.net/assets/"
}

print("1. Creando APK con recursos oficiales de AsisTecht...")
with zipfile.ZipFile(original_apk, 'r') as zin:
    with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # Excluir firmas previas para que uber-apk-signer firme limpiamente
            if item.filename.startswith("META-INF/"):
                if item.filename.endswith(".RSA") or item.filename.endswith(".DSA") or item.filename.endswith(".SF") or item.filename.endswith(".MF"):
                    continue

            if item.filename == "assets/settings.json":
                zout.writestr(item.filename, json.dumps(settings_json, indent=2))
            elif item.filename in ["assets/local/index.html", "assets/web/index.html", "assets/demo/index.html"]:
                zout.writestr(item.filename, index_html)
            elif item.filename == "assets/local/config.json":
                zout.writestr(item.filename, json.dumps(config_json, indent=2))
            elif item.filename in ["assets/local/sites.html", "assets/web/about.html", "assets/web/privacy.html"]:
                zout.writestr(item.filename, index_html)
            else:
                zout.writestr(item, zin.read(item.filename))

print("APK sin firmar creado:", os.path.getsize(temp_apk), "bytes")

print("2. Firmando APK con uber-apk-signer y certificado V1/V2/V3...")
cmd = [
    java_exe,
    "-jar",
    signer_jar,
    "-a",
    temp_apk,
    "--allowResign",
    "--overwrite"
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)

target = os.path.join(final_apk_dir, "asisttecht-movil.apk")
target_dist = r"C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht\web\dist\asisqr\browser\downloads\asisttecht-movil.apk"

if os.path.exists(temp_apk):
    import shutil
    shutil.copy2(temp_apk, target)
    print("APK Oficial Actualizado y Firmado en:", target)
    os.makedirs(os.path.dirname(target_dist), exist_ok=True)
    shutil.copy2(temp_apk, target_dist)
    print("APK Copiado a dist de producción:", target_dist)
    os.remove(temp_apk)

print("¡Proceso de APK completado con éxito!")

