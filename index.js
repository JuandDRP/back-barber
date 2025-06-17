const express = require('express');
const app = express();
const cors = require("cors");
const conectarDB = require('./db');
app.use(cors());
app.use(express.json());
let db, reservasCol, disponibilidadesCol, clientesCol;
conectarDB().then((database) => {
  db = database;
  reservasCol = db.collection('reservas');
  disponibilidadesCol = db.collection('disponibilidades');
  clientesCol = db.collection('clientes');
  app.listen(3001, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3000');
  });
});
app.get('/', (req, res) => {
  res.send('Hola desde Express y MongoDB 🚀');
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
app.get('/clientes', async (req, res) => {
  const clientes = await db.collection('clientes').find({}).toArray();
  res.json(clientes);
});
app.get('/reservas/:fecha', async (req, res) => {
  const { fecha } = req.params;
  const reservas = await db.collection('reservas').find({ fecha }).toArray();
  res.json(reservas);
});
app.post('/reservar', async (req, res) => {
  const { nombreCliente, numeroCelular, barbero, fecha, hora } = req.body;
  if (!nombreCliente || !numeroCelular || !barbero || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan datos: nombre cliente,numero celular, barbero, fecha u hora' });
  }
  const barberosPermitidos = ['Juan', 'Camilo'];
  if (!barberosPermitidos.includes(barbero)) {
    return res.status(400).json({ error: 'Barbero no válido. Solo se permiten Juan o Camilo.' });
  }
  const yaReservado = await reservasCol.findOne({ barbero, fecha, hora });
  if (yaReservado) {
    return res.status(400).json({ error: 'Horario ya reservado' });
  }
  const nuevaReserva = { nombreCliente, numeroCelular, barbero, fecha, hora };
  await reservasCol.insertOne(nuevaReserva);
  const clienteExistente = await clientesCol.findOne({ numeroCelular });
  if (clienteExistente) {
    await clientesCol.updateOne(
      { numeroCelular },
      {
        $inc: { peluqueadas: 1 },
        $set: { nombreCliente }
      }
    );
  } else {
    await clientesCol.insertOne({
      numeroCelular,
      nombreCliente,
      peluqueadas: 1
    });
  }
  res.status(201).json({
    mensaje: 'Reserva realizada con éxito',
    reserva: nuevaReserva
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
app.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ acceso: false, mensaje: 'Faltan datos' });
  }
  try {
    const adminCol = db.collection('admin');
    const admin = await adminCol.findOne({ usuario, contrasena });

    if (admin) {
      return res.json({ acceso: true });
    } else {
      return res.status(401).json({ acceso: false, mensaje: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ acceso: false, mensaje: 'Error del servidor' });
  }
});
