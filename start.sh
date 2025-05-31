#!/bin/bash

echo "========================================"
echo "   EduAssistSys - Educational Analytics System"
echo "========================================"
echo

echo "Activating conda environment: EduAssistSys..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate EduAssistSys

if [ $? -ne 0 ]; then
    echo "Error: Failed to activate conda environment 'EduAssistSys'"
    echo "Please make sure the environment exists and conda is properly installed."
    exit 1
fi

echo "Environment activated successfully!"
echo



echo "Starting backend server..."
cd backend

# Start backend in background
echo "Backend server is starting..."
python app.py &
BACKEND_PID=$!

if [ $? -ne 0 ]; then
    echo "Error: Failed to start backend server"
    exit 1
fi

echo "Backend server started with PID: $BACKEND_PID"
echo

echo "Waiting for backend to initialize..."
sleep 3

echo "Starting frontend development server..."
cd ../frontend



echo "Starting frontend server in new terminal..."
# Try different terminal emulators based on the system
if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -c "export NODE_OPTIONS='--openssl-legacy-provider'; echo 'Frontend server is starting...'; npm start; exec bash"
elif command -v xterm >/dev/null 2>&1; then
    xterm -e "export NODE_OPTIONS='--openssl-legacy-provider'; echo 'Frontend server is starting...'; npm start; exec bash" &
elif command -v osascript >/dev/null 2>&1; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && export NODE_OPTIONS='--openssl-legacy-provider' && echo 'Frontend server is starting...' && npm start\""
else
    echo "Warning: No suitable terminal emulator found. Starting frontend in background..."
    export NODE_OPTIONS="--openssl-legacy-provider"
    npm start &
    FRONTEND_PID=$!
fi

echo
echo "========================================"
echo "   System Started Successfully!"
echo "========================================"
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo
echo "Backend PID: $BACKEND_PID"
echo "Frontend started in separate terminal"
echo
echo "Press Ctrl+C to stop backend server..."
echo "To stop frontend, close its terminal window."
echo "========================================"

# Function to cleanup processes on exit
cleanup() {
    echo
    echo "Stopping backend server..."
    kill $BACKEND_PID 2>/dev/null
    echo "Backend stopped. Please close frontend terminal manually if needed."
    echo "Goodbye!"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT

# Wait for backend process to finish
wait $BACKEND_PID