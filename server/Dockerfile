FROM python:3.11-slim

# Set working directory
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only the necessary build dependencies and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y gcc python3-dev && \
    apt-get autoremove -y

# Copy the rest of the application
COPY . .

# Create media directory and set permissions
RUN mkdir -p media files && \
    chmod -R 755 media files

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]