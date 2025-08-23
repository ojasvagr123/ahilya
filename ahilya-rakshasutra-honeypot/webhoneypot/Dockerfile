FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py wsgi.sh ./
RUN chmod +x wsgi.sh
CMD ["./wsgi.sh"]
