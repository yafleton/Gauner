# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway uses dynamic ports)
EXPOSE 10000

# Start the application
CMD ["sh", "-c", "python -m uvicorn api:app --host 0.0.0.0 --port $PORT"]
