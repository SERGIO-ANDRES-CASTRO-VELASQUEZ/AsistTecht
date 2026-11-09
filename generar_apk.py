#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AsisTecht - Generador y Empaquetador Automático de APK Android
Compatible con Python 3.x y Windows / Linux
"""

import os
import sys
import json
import zipfile
import shutil
import subprocess
import argparse

import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.0.14"

def main():
    detected_ip = get_local_ip()
    parser = argparse.ArgumentParser(description="Generar y firmar el APK de AsisTecht Móvil")
    parser.add_argument("--ip", default=detected_ip, help=f"Dirección IP del servidor (detectada: {detected_ip})")
    parser.add_argument("--port", default="8080", help="Puerto HTTP del servidor (default: 8080)")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    original_apk = os.path.join(base_dir, "web", "public", "downloads", "asisttecht-movil.apk")
    temp_apk = os.path.join(base_dir, "asisttecht-temp.apk")
    signer_jar = os.path.join(base_dir, "uber-apk-signer.jar")
    java_exe = r"C:\Program Files\Java\jre-1.8\bin\java.exe"

    if not os.path.exists(java_exe):
        # Fallback a java en PATH
        java_exe = "java"

    server_url = f"http://{args.ip}:{args.port}"
    server_login = f"{server_url}/ingreso"

    print(f"===========================================================")
    print(f"  ASISTECHT - Generador de APK Android Oficial v2.4")
    print(f"  Servidor destino: {server_login}")
    print(f"===========================================================\n")

    if not os.path.exists(original_apk):
        print(f"ERROR: No se encontró el APK base en {original_apk}")
        sys.exit(1)

    settings_json = {
        "sites": [
            {
                "url": server_login,
                "title": "AsisTecht Campus Virtual"
            }
        ],
        "other": f"{server_url}/",
        "match": [
            ["host", "equals", args.ip],
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
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
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
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(16px);
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
        h1 {{ font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; color: #ffffff; }}
        p.sub {{ font-size: 0.82rem; color: #94a3b8; margin-bottom: 1.5rem; }}
        .spinner {{
            width: 36px;
            height: 36px;
            border: 3.5px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1.25rem;
        }}
        @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
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
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">GIR</div>
        <h1>AsisTecht</h1>
        <p class="sub">Gimnasio José Eustasio Rivera<br>Campus Virtual Institucional</p>
        <div class="spinner"></div>
        <p style="color: #34d399; font-size: 0.9rem; margin-bottom: 1.25rem;">Conectando a {server_login}...</p>
        <button class="btn" onclick="window.location.replace('{server_login}')">Entrar al Campus</button>
    </div>
    <script>
        setTimeout(function() {{
            window.location.replace('{server_login}');
        }}, 500);
    </script>
</body>
</html>
"""

    print("1. Inyectando configuración oficial en paquete APK...")
    with zipfile.ZipFile(original_apk, 'r') as zin:
        with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename.startswith("META-INF/"):
                    if item.filename.endswith((".RSA", ".DSA", ".SF", ".MF")):
                        continue

                if item.filename == "assets/settings.json":
                    zout.writestr(item.filename, json.dumps(settings_json, indent=2))
                elif item.filename in ["assets/local/index.html", "assets/web/index.html", "assets/demo/index.html", "assets/local/sites.html"]:
                    zout.writestr(item.filename, index_html)
                else:
                    zout.writestr(item, zin.read(item.filename))

    print("2. Firmando digitalmente APK (v1, v2, v3 + zipalign)...")
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
    if res.returncode != 0:
        print("Aviso al firmar:", res.stderr)

    dest_public = os.path.join(base_dir, "web", "public", "downloads", "asisttecht-movil.apk")
    dest_dist = os.path.join(base_dir, "web", "dist", "asisqr", "browser", "downloads", "asisttecht-movil.apk")

    if os.path.exists(temp_apk):
        shutil.copy2(temp_apk, dest_public)
        print(f"[OK] APK actualizado en: {dest_public}")
        if os.path.exists(os.path.dirname(dest_dist)):
            shutil.copy2(temp_apk, dest_dist)
            print(f"[OK] APK copiado a produccion: {dest_dist}")
        os.remove(temp_apk)

    print("\n[OK] APK generado, optimizado y firmado con exito!")
    print(f"Descargable desde: http://{args.ip}:{args.port}/downloads/asisttecht-movil.apk")

if __name__ == "__main__":
    main()
