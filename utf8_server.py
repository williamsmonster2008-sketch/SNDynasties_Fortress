import http.server
import socketserver
from http.server import SimpleHTTPRequestHandler
import sys

class UTF8Handler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith('.js'):
            return 'text/javascript; charset=utf-8'
        elif path.endswith('.html'):
            return 'text/html; charset=utf-8'
        elif path.endswith('.css'):
            return 'text/css; charset=utf-8'
        return super().guess_type(path)

PORT = 8080
try:
    with socketserver.TCPServer(("", PORT), UTF8Handler) as httpd:
        print(f"UTF-8 Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
except OSError as e:
    if e.errno == 10048:  # Windows: Address already in use
        print(f"Port {PORT} is already in use. Try a different port.")
        PORT = 8081
        with socketserver.TCPServer(("", PORT), UTF8Handler) as httpd:
            print(f"UTF-8 Server running at http://localhost:{PORT}/")
            httpd.serve_forever()
    else:
        print(f"Error starting server: {e}")
except KeyboardInterrupt:
    print("\nServer stopped by user")