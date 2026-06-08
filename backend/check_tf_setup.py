
import os
import sys

# Redirect stdout and stderr to a file
log_file = open("check_log_internal.txt", "w")
sys.stdout = log_file
sys.stderr = log_file

# Mock settings to avoid importing the whole app
class Settings:
    BASE_DIR = os.getcwd() # Assumption, will fix path below
    KERAS_MODEL_PATH = r"c:\Users\Dharanidharan\OneDrive - sece.ac.in\Documents\CSBS 2ND YEAR\SEMESTER 3\HACKATON\Pals_Hack\Rocksense\backend\models\Model_keras\keras_model.h5"
    LABELS_PATH = r"c:\Users\Dharanidharan\OneDrive - sece.ac.in\Documents\CSBS 2ND YEAR\SEMESTER 3\HACKATON\Pals_Hack\Rocksense\backend\models\Model_keras\labels.txt"

settings = Settings()

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")

print("\n--- Checking Imports ---")
try:
    import tensorflow as tf
    print(f"TensorFlow Version: {tf.__version__}")
except ImportError as e:
    print(f"FAILED to import tensorflow: {e}")

try:
    import tf_keras
    print(f"tf_keras Version: {tf_keras.__version__}")
except ImportError as e:
    print(f"FAILED to import tf_keras: {e}")

try:
    from tensorflow import keras
    print(f"tensorflow.keras Version: {keras.__version__}")
except ImportError as e:
    print(f"FAILED to import tensorflow.keras: {e}")

print("\n--- Attempting to Load Model ---")
load_model = None

# Logic from risk_service.py
os.environ["TF_USE_LEGACY_KERAS"] = "1"

try:
    import tensorflow as tf
    import tf_keras as keras_lib
    from tf_keras.models import load_model
    print("Using tf_keras.models.load_model")
except ImportError:
    try:
        from tensorflow.keras.models import load_model
        print("Using tensorflow.keras.models.load_model")
    except Exception as e:
        print(f"Fallback import failed: {e}")

if load_model:
    try:
        print(f"Loading model from: {settings.KERAS_MODEL_PATH}")
        model = load_model(settings.KERAS_MODEL_PATH, compile=False)
        print("SUCCESS: Model loaded successfully!")
    except Exception as e:
        print(f"ERROR: Failed to load model: {e}")
        import traceback
        traceback.print_exc()
else:
    print("ERROR: load_model function is None")

log_file.close()
