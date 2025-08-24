#!/bin/bash

echo "🎲 Catan Predictor - Run Script"
echo "=============================="
echo ""

# Check if running in workspace
if [ ! -f "catan-predictor-ph1.html" ]; then
    echo "❌ Error: Must run from /workspace/catan-app directory"
    echo "Run: cd /workspace/catan-app && ./run.sh"
    exit 1
fi

echo "Choose what to run:"
echo "1) Phase 1 Fixed Version (catan-predictor-ph1.html)"
echo "2) Test Suite (test-ph1.html)"
echo "3) Original Version (catan-predictor.html)"
echo "4) Start Local Server (all files)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Opening Phase 1 Fixed Version..."
        if command -v xdg-open &> /dev/null; then
            xdg-open catan-predictor-ph1.html
        elif command -v open &> /dev/null; then
            open catan-predictor-ph1.html
        else
            echo "📁 Please open manually: catan-predictor-ph1.html"
        fi
        ;;
    2)
        echo "🧪 Opening Test Suite..."
        if command -v xdg-open &> /dev/null; then
            xdg-open test-ph1.html
        elif command -v open &> /dev/null; then
            open test-ph1.html
        else
            echo "📁 Please open manually: test-ph1.html"
        fi
        ;;
    3)
        echo "📜 Opening Original Version..."
        if command -v xdg-open &> /dev/null; then
            xdg-open catan-predictor.html
        elif command -v open &> /dev/null; then
            open catan-predictor.html
        else
            echo "📁 Please open manually: catan-predictor.html"
        fi
        ;;
    4)
        echo "🌐 Starting local server..."
        echo "Server will run at http://localhost:3000"
        echo "Press Ctrl+C to stop"
        echo ""
        
        # Check if npx is available
        if command -v npx &> /dev/null; then
            npx serve .
        else
            echo "❌ npx not found. Trying python..."
            if command -v python3 &> /dev/null; then
                python3 -m http.server 3000
            elif command -v python &> /dev/null; then
                python -m SimpleHTTPServer 3000
            else
                echo "❌ No server available. Please install Node.js or Python"
            fi
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac