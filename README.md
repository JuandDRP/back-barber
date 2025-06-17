# Barber Luxury - Backend

Este es el backend de la aplicación **Barber Luxury**, una plataforma web para agendar turnos en una barbería con barberos disponibles (actualmente **Juan** o **Camilo**). Proporciona una API REST para manejar autenticación, reservas, disponibilidad y gestión de clientes.

## 🌐 URL del Frontend

Puedes probar la app en producción aquí:  
👉 [https://barberluxury.netlify.app/](https://barberluxury.netlify.app/)

---

## ⚙️ Tecnologías utilizadas

- **Node.js** – Entorno de ejecución JavaScript.
- **Express.js** – Framework web para construir APIs REST.
- **MongoDB** – Base de datos NoSQL para almacenar reservas, disponibilidad, clientes y usuarios.

---

## 🚀 Rutas principales de la API

### Autenticación

- `POST /login`  
  Valida usuario y contraseña. Retorna `{ acceso: true }` si es válido.

### Disponibilidad

- `POST /disponibilidad`  
  Guarda la disponibilidad de un barbero con fecha y horas.

### Reservas

- `GET /reservas/:fecha`  
  Retorna las reservas realizadas para una fecha específica.

- `POST /reservar`  
  Permite registrar una nueva reserva con barbero, hora y cliente.

### Clientes

- `GET /clientes`  
  Retorna todos los clientes con su número de peluqueadas.

---