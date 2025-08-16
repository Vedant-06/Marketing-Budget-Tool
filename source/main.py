import os
import sys
import mimetypes
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify, Response
from flask_cors import CORS
from source.models.user import db
from source.routes.user import user_bp
from source.routes.budget import budget_bp

# Fix MIME types for JavaScript modules
mimetypes.init()
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')

# Set up static folder to serve React build files
static_folder = os.path.join(os.path.dirname(__file__), 'dist')
if not os.path.exists(static_folder):
    static_folder = os.path.join(os.path.dirname(__file__), '.')

app = Flask(__name__, static_folder=static_folder, static_url_path='')
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

# Register API blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(budget_bp, url_prefix='/api')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

def get_correct_mime_type(filename):
    """Get the correct MIME type for a file"""
    if filename.endswith('.js') or filename.endswith('.mjs'):
        return 'text/javascript'
    elif filename.endswith('.css'):
        return 'text/css'
    elif filename.endswith('.json'):
        return 'application/json'
    elif filename.endswith('.html'):
        return 'text/html'
    elif filename.endswith('.png'):
        return 'image/png'
    elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
        return 'image/jpeg'
    elif filename.endswith('.svg'):
        return 'image/svg+xml'
    elif filename.endswith('.ico'):
        return 'image/x-icon'
    else:
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'

# API health check
@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running"})

# Serve React static files with correct MIME types
@app.route('/static/<path:filename>')
def serve_static(filename):
    try:
        file_path = os.path.join(app.static_folder, 'static', filename)
        with open(file_path, 'rb') as f:
            content = f.read()
        
        mime_type = get_correct_mime_type(filename)
        print(f"🔧 Serving /static/{filename} with MIME type: {mime_type}")
        
        return Response(content, mimetype=mime_type)
    except FileNotFoundError:
        return jsonify({"error": "Static file not found"}), 404

# Handle Vite assets folder
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    try:
        file_path = os.path.join(app.static_folder, 'assets', filename)
        with open(file_path, 'rb') as f:
            content = f.read()
        
        mime_type = get_correct_mime_type(filename)
        print(f"🔧 Serving /assets/{filename} with MIME type: {mime_type}")
        
        response = Response(content, mimetype=mime_type)
        
        # Add cache headers for assets
        if filename.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico')):
            response.headers['Cache-Control'] = 'public, max-age=31536000'
        
        return response
    except FileNotFoundError:
        return jsonify({"error": "Asset not found"}), 404

# Serve React app and handle client-side routing
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    print(f"🌐 Frontend request: {path or 'root'}")
    
    # If it's an API route, return 404
    if path.startswith('api/'):
        print(f"❌ API route not found: {path}")
        return jsonify({"error": "API endpoint not found"}), 404
    
    # Check if the requested file exists
    if path and not path.startswith('api'):
        file_path = os.path.join(app.static_folder, path)
        print(f"📁 Checking file: {file_path}")
        if os.path.exists(file_path) and os.path.isfile(file_path):
            print(f"✅ Serving static file: {path}")
            
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                mime_type = get_correct_mime_type(path)
                print(f"🔧 MIME type for {path}: {mime_type}")
                
                return Response(content, mimetype=mime_type)
            except Exception as e:
                print(f"❌ Error serving {path}: {e}")
                return jsonify({"error": "File read error"}), 500
    
    # For all other routes, serve index.html (SPA fallback)
    index_path = os.path.join(app.static_folder, 'index.html')
    if os.path.exists(index_path):
        print(f"📄 Serving index.html for route: {path or 'root'}")
        return send_from_directory(app.static_folder, 'index.html')
    else:
        print(f"❌ index.html not found at: {index_path}")
        return jsonify({"error": "Frontend not found. Make sure to build your React app first."}), 404

if __name__ == '__main__':
    print(f"Static folder: {app.static_folder}")
    print(f"Static folder exists: {os.path.exists(app.static_folder)}")
    
    if os.path.exists(app.static_folder):
        files = os.listdir(app.static_folder)
        print(f"Files in static folder: {files}")
        
        # Check for common build outputs
        if 'index.html' in files:
            print("✅ index.html found")
        if 'assets' in files:
            print("✅ assets folder found")
            try:
                assets_files = os.listdir(os.path.join(app.static_folder, 'assets'))
                print(f"Assets files: {assets_files[:5]}...")  # Show first 5 files
            except:
                print("❌ Could not list assets folder")
    
    app.run(host='0.0.0.0', port=8000, debug=True)