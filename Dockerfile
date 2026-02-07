FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY . /app/

RUN pip install --upgrade pip
RUN pip install django

EXPOSE 8000

<<<<<<< HEAD
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
=======
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
>>>>>>> e57c625199905baa02e771c7b6a951bc54580ea8
