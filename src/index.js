const express = require('express');
const app = express();
const cors = require("cors");
const conectarDB = require('./db');
const sgMail = require('@sendgrid/mail');
const reservaLimiter = require("./middlewares/reservaLimiter");

require('dotenv').config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(cors());
app.use(express.json());
app.set("trust proxy", 1);

let db, reservasCol, disponibilidadesCol, clientesCol;
conectarDB().then((database) => {
  db = database;
  reservasCol = db.collection('reservas');
  disponibilidadesCol = db.collection('disponibilidades');
  clientesCol = db.collection('clientes');
  app.listen(3001, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3001');
  });
});
app.get('/ping', (req,res)=>res.sendStatus(200));
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

app.post('/reservar',reservaLimiter, async (req, res) => {
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
  let peluqueadas = 1;
  let regaladas = 0;

  if (clienteExistente) {
    const actuales = clienteExistente.peluqueadas || 0;
    const actualesRegaladas = clienteExistente.regaladas || 0;

    if (actuales >= 7) {
      peluqueadas = 1;
      regaladas = actualesRegaladas + 1;
    } else {
      peluqueadas = actuales + 1;
      regaladas = actualesRegaladas;
    }

    await clientesCol.updateOne(
      { numeroCelular },
      {
        $set: {
          nombreCliente,
          peluqueadas,
          regaladas
        }
      }
    );
  } else {
    await clientesCol.insertOne({
      numeroCelular,
      nombreCliente,
      peluqueadas: 1,
      regaladas: 0
    });
  }

  const msg = {
  to: 'maycamilo3@gmail.com', // destinatarios
  from: 'barberia.luxury.cj@gmail.com', // remitente (debe estar verificado en SendGrid)
  cc: 'juandrp2004@gmail.com',
  subject: '📅 Nueva Reserva en Barbería Luxury',
  text:"Prueba",
  html: `🎉Nueva reserva: <br>👤Cliente: ${nombreCliente} <br>📱Celular: ${numeroCelular} <br>💈Barbero: ${barbero} <br>📅Fecha: ${fecha} <br>⏰Hora: ${hora}`,
};
try {
  console.log("Intentar enviar...");
  const [response] = await sgMail.send(msg);
  console.log("📨 Status Code:", response.statusCode);  // debe ser 202
  console.log("Correo enviado");
} catch (error) {
  console.error("❌ Error al enviar correo:", error.response?.body || error);
}

  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: 'barberia.luxury.cj@gmail.com',
  //     pass: 'trgbbrmghtdywhlk'
  //   }
  // });

  // const mailOptions = {
  //   from: 'barberia.luxury.cj@gmail.com',
  //   to: ['juandrp2004@gmail.com', 'maycamilo3@gmail.com'],
  //   subject: '📅 Nueva Reserva en Barbería Luxury',
  //   text: `Nueva reserva:\n\nCliente: ${nombreCliente}\nCelular: ${numeroCelular}\nBarbero: ${barbero}\nFecha: ${fecha}\nHora: ${hora}`
  // };

  // transporter.sendMail(mailOptions, (error, info) => {
  //   if (error) {
  //     console.error('❌ Error al enviar correo:', error);
  //   } else {
  //     console.log('✉️ Correo enviado:', info.response);
  //   }
  // });


  res.status(201).json({
    mensaje: 'Reserva realizada con éxito',
    reserva: nuevaReserva,
    peluqueadas,
    regaladas
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
app.post('/eliminarReserva', async (req, res) => {
  const { barbero, fecha, hora, numeroCelular } = req.body;
  if (!barbero || !fecha || !hora || !numeroCelular) {
    return res.status(400).json({ error: 'Faltan datos: barbero, fecha, hora o numeroCelular' });
  }
  try {
    const resultado = await reservasCol.deleteOne({ barbero, fecha, hora, numeroCelular });
    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    await clientesCol.updateOne(
      { numeroCelular },
      [
        {
          $set: {
            peluqueadas: {
              $cond: [
                { $gt: ["$peluqueadas", 0] },
                { $subtract: ["$peluqueadas", 1] },
                0
              ]
            }
          }
        }
      ]
    );
    res.json({ mensaje: 'Reserva eliminada y cliente actualizado' });
  } catch (err) {
    console.error('Error al eliminar reserva:', err);
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});
