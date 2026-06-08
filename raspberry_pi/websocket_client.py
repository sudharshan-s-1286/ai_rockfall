# websocket_client.py
import socketio
import time

class WebSocketClient:
    def __init__(self, server_url):
        self.sio = socketio.Client()
        self.server_url = server_url
        self.process_callback = None

        @self.sio.event
        def connect():
            print(f"Connected to server at {self.server_url}")

        @self.sio.event
        def disconnect():
            print("Disconnected from server")

        @self.sio.on("yolo_result")
        def on_yolo_result(data):
            print("Received YOLO Result:", data)
            if self.process_callback:
                self.process_callback(data)

        @self.sio.on("stop_command")
        def on_stop_command(data):
            print("STOP Command Received from Website")
            if self.process_callback:
                self.process_callback({"status": "STOP_SYSTEM"})

    def connect(self):
        try:
            self.sio.connect(self.server_url)
        except Exception as e:
            print(f"Connection failed: {e}")

    def send_frame(self, frame_b64):
        if self.sio.connected:
            self.sio.emit("frame", {"image": frame_b64})

    def set_callback(self, callback):
        self.process_callback = callback
