FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files including src, data, and joblib models
COPY . .

# Set python path so uvicorn can find the src module
ENV PYTHONPATH=/app

# Expose port for the service
EXPOSE 8000

# Run the API
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
