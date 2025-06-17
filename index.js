const express = require('express');
const app = express();
const cors = require("cors");
const conectarDB = require('./db');

app.use(cors());
app.use(express.json());

let db, reservasCol, disponibilidadesCol;

app.get('/', (req, res) => {
  res.send('Hola desde Express y MongoDB 🚀');
});


conectarDB().then((database) => {
  db = database;
  reservasCol = db.collection('reservas');
  disponibilidadesCol = db.collection('disponibilidades');
  app.listen(3000, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3000');
  });
});


app.post('/disponibilidad', async (req, res) => {
  const { barbero, fecha, horas } = req.body;
  if (!barbero || !fecha || !Array.isArray(horas)) {
    return res.status(400).json({ error: 'Faltan datos: barbero, fecha u horas' });
  }
  const barberosPermitidos = ['Juan', 'Camilo'];
  if (!barberosPermitidos.includes(barbero)) {
    return res.status(400).json({ error: 'Barbero no válido. Solo se permiten Juan o Camilo.' });
  }
  const resultado = await disponibilidadesCol.updateOne(
    { barbero, fecha },
    {
      $addToSet: {
        horas: { $each: horas }
      }
    },
    { upsert: true } 
  );
  res.status(201).json({ mensaje: 'Disponibilidad actualizada correctamente' });
});


app.get('/disponibilidad/:barbero/:fecha', async (req, res) => {
  const { barbero, fecha } = req.params;
  const barberosPermitidos = ['Juan', 'Camilo'];
  if (!barberosPermitidos.includes(barbero)) {
    return res.status(400).json({ error: 'Barbero no válido. Solo se permiten Juan o Camilo.' });
  }
  const disponibilidad = await disponibilidadesCol.findOne({ barbero, fecha });
  if (!disponibilidad) {
    return res.status(404).json({ error: 'No hay disponibilidad configurada' });
  }
  const reservas = await reservasCol.find({ barbero, fecha }).toArray();
  const horasReservadas = reservas.map(r => r.hora);
  const disponibles = disponibilidad.horas.filter(
    hora => !horasReservadas.includes(hora)
  );
  res.json({ barbero, fecha, disponibles });
});


app.post('/reservar', async (req, res) => {
  const { nombreCliente, barbero, fecha, hora } = req.body;
  if (!nombreCliente || !barbero || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan datos: nombreCliente, barbero, fecha u hora' });
  }
  const barberosPermitidos = ['Juan', 'Camilo'];
  if (!barberosPermitidos.includes(barbero)) {
    return res.status(400).json({ error: 'Barbero no válido. Solo se permiten Juan o Camilo.' });
  }
  const yaReservado = await reservasCol.findOne({ barbero, fecha, hora });
  if (yaReservado) {
    return res.status(400).json({ error: 'Horario ya reservado' });
  }
  const nuevaReserva = {
    nombreCliente,
    barbero,
    fecha,
    hora
  };
  await reservasCol.insertOne(nuevaReserva);
  res.status(201).json({ mensaje: 'Reserva realizada con éxito', reserva: nuevaReserva });
});
