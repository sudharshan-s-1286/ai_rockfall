# rf_model.py
import joblib
import os
import numpy as np

class RiskModel:
    def __init__(self, model_path='rocksense_random_forest.pkl'):
        self.model = None
        # Must match training labels (0=HIGH, 1=MEDIUM, 2=LOW)
        self.label_map = {0: "HIGH", 1: "MEDIUM", 2: "LOW"}
        
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"✅ Successfully loaded trained RF model: {model_path}")
            except Exception as e:
                print(f"❌ Error loading model: {e}")
        else:
            print(f"⚠️ Model file not found at {model_path}. Fallback logic enabled.")

    def predict_risk(self, yolo_data):
        """
        Takes YOLO result and returns HIGH / MEDIUM / LOW risk level.
        Feature vector expected by model: 
        [avg_confidence, max_confidence, detection_count, avg_box_area, duration_s]
        """
        confidence = yolo_data.get("confidence", 0.5)
        status = yolo_data.get("status", "NO_CRACK")
        
        if self.model:
            try:
                # For simplified integration, we mock the 5 features from the 
                # single YOLO detection event data provided by the laptop.
                # In a full window, these would be averaged.
                avg_conf = confidence
                max_conf = confidence
                # laptop sends a detection event, so count is at least 1
                det_count = 1.0 
                # proxy for area if not provided
                avg_area = 5000.0 
                # time since first detection (laptop handles 15s window, so we proxy)
                duration = 15.0 

                features = np.array([avg_conf, max_conf, det_count, avg_area, duration]).reshape(1, -1)
                prediction = self.model.predict(features)[0]
                
                # Map numeric output to label string
                if isinstance(prediction, (int, np.integer, float)):
                    return self.label_map.get(int(prediction), "HIGH")
                return str(prediction).upper()
            except Exception as e:
                print(f"Model prediction error: {e}")

        # Fallback Logic
        if status == "HIGH_CRACK":
            if confidence > 0.85:
                return "HIGH"
            elif confidence > 0.60:
                return "MEDIUM"
        
        return "LOW"
