FROM python:3.10-alpine
LABEL maintainer="raduleonte"

RUN adduser --disabled-password --no-create-home django-user

COPY ./requirements.txt /requirements.txt
COPY --chown=django-user:django-user ./app /app
RUN chmod -R 755 /app
WORKDIR /app

RUN python -m venv /py && \
    /py/bin/pip install --upgrade pip && \
    /py/bin/pip install -r /requirements.txt

ENV PATH="/py/bin:$PATH"

USER django-user