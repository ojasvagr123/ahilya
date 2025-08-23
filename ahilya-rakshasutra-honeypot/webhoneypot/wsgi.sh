#!/usr/bin/env sh
exec gunicorn -b 0.0.0.0:8080 -w 2 app:app
