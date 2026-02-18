# RockSense Setup Guide

## Prerequisites Software
To run the RockSense application on a new laptop, you will need to install the following software:

### 1. **Node.js & npm** (For Frontend)
- **Required for**: Running the React/Vite frontend.
- **Download**: [https://nodejs.org/](https://nodejs.org/) (Download the "LTS" version).
- **Verification**: Open a terminal and run `node -v` and `npm -v`.

### 2. **Python** (For Backend)
- **Required for**: Running the FastAPI backend and AI models.
- **Download**: [https://www.python.org/downloads/](https://www.python.org/downloads/) (Version 3.10 or newer is recommended).
- **Important**: During installation, check the box **"Add Python to PATH"**.
- **Verification**: Run `python --version` in terminal.

### 3. **Git** (Version Control)
- **Required for**: Cloning the project repository.
- **Download**: [https://git-scm.com/downloads](https://git-scm.com/downloads)

### 4. **Visual Studio Code** (Recommended IDE)
- **Required for**: Editing and viewing code.
- **Download**: [https://code.visualstudio.com/](https://code.visualstudio.com/)

---

## Installation Steps after Software Install

1.  **Clone the Repository**
    ```bash
    git clone <repository_url>
    cd Rocksense
    ```

2.  **Backend Setup**
    - Open `backend` folder in terminal.
    - (Optional) Create Python virtual environment: `python -m venv venv`
    - Install dependencies:
      ```bash
      pip install -r requirements.txt
      ```

3.  **Frontend Setup**
    - Open `frontend` folder in terminal.
    - Install node modules:
      ```bash
      npm install
      ```

## Running the Application

1.  **Start Backend**
    - In `backend` folder: `.\run_server.bat`

2.  **Start Frontend**
    - In `frontend` folder: `.\run_frontend.bat`
