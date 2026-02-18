# Technology Stack

## Frontend (User Interface)
- **Framework**: [React](https://react.dev/) (v19)
- **Build Tool**: [Vite](https://vitejs.dev/) (Fast development server)
- **Styling**: Vanilla CSS with CSS Variables (Neon/Glassmorphism Theme)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Complex UI transitions)
- **3D Visualization**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) (3D Mine Map)
- **Routing**: [React Router](https://reactrouter.com/) (Client-side navigation)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)

## Backend (Server & AI)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (High-performance Python web framework)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud NoSQL Database)
- **CDM (Object-Document Mapper)**: [Beanie](https://beanie-odm.dev/) (Asynchronous ODM for MongoDB)
- **AI & Machine Learning**:
    - **TensorFlow / Keras**: Custom models for rockfall prediction.
    - **YOLO (You Only Look Once)**: Real-time object/crack detection.
    - **Scikit-Learn**: Data analysis and preprocessing.
- **IoT Communication**: `pyserial` (Communication with Arduino/Sensors over USB).

## Hardware / IoT
- **Microcontroller**: Arduino / ESP32 (connected via Serial).
- **Sensors**: Vibration (SW-420), MEMS/Accelerometer (MPU6050), Rain Sensor, DHT11 (Temp/Humidity).
- **Camera**: CCTV / Webcam feed for Computer Vision.

## Tools & Utilities
- **VS Code**: Code Editor.
- **Git**: Version Control.
- **Postman**: API Testing.
