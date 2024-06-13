const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const clients = [];

// Configuración de la base de datos
const db = mysql.createConnection({
  host: 'bdi6czeumpbweyoxw3zd-mysql.services.clever-cloud.com',
  user: 'ucubzxft2xmnwpnh',
  password: 'RXwznoYwIO6n9kpTZavA',
  port: 3306,
  database: 'bdi6czeumpbweyoxw3zd'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado a base de datos');
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// Rutas de autenticación
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Este nombre de usuario ya está registrado' });
      }
      throw err;
    }
    res.json({ message: 'Usuario registrado exitosamente' });
  });
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrecta' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrecta' });
    }

    res.json({ message: 'Inicio de sesión correcto', user: { id: user.id, username: user.username } });
  });
});

// Rutas de mensajes
app.get('/api/messages', (req, res) => {
  db.query('SELECT * FROM messages ORDER BY timestamp DESC', (err, results) => {
    if (err) {
      console.error('Error al obtener los mensajes:', err);
      return res.status(500).json({ error: 'Error al obtener los mensajes' });
    }
    res.json(results);
  });
});

app.get('/api/messages/long-poll', (req, res) => {
  clients.push(res);
});

app.post('/api/messages', (req, res) => {
  const { username, message } = req.body;

  db.query('INSERT INTO messages (username, message) VALUES (?, ?)', [username, message], (err, results) => {
    if (err) {
      console.error('Error al insertar mensaje:', err);
      return res.status(500).json({ error: 'Error al insertar mensaje' });
    }

    const newMessage = { id: results.insertId, username, message };

    clients.forEach(client => client.json(newMessage));
    clients.length = 0;

    res.status(201).json(newMessage);
  });
});

app.listen(3000, () => {
  console.log('Servidor ejecutándose en http://localhost:3000');
});
