require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
const { default: axios } = require('axios');

const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json(), cors());
app.options('*', cors());

app.post('/', (req, res) => {
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(
    process.env.API_KEY + req.body.meetingNumber + timestamp + req.body.role,
  ).toString('base64');
  const hash = crypto
    .createHmac('sha256', process.env.API_SECRET)
    .update(msg)
    .digest('base64');
  const signature = Buffer.from(
    `${process.env.API_KEY}.${req.body.meetingNumber}.${timestamp}.${req.body.role}.${hash}`,
  ).toString('base64');

  res.json({
    signature: signature,
  });
});

app.post('/meetings', (req, res) => {
  const baseUrl = 'https://api.zoom.us/v2';
  const token =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOm51bGwsImlzcyI6IjZlYUw5dnh5Umhpb1ZpZUF1TUFDWGciLCJleHAiOjE2MTEyMzU2MzEsImlhdCI6MTYxMDYzMDgzMX0.7WmyuGgbaZTYH0FdexR9OGs0SX8fb5pm3mhVsZYUSfY';
  axios
    .post(
      `${baseUrl}/me/meetings`,
      {
        password: 'syment2021', // TODO: wath to do with this one ?
        settings: {
          mute_upon_entry: true,
          participant_video: false,
          waiting_room: true,
        },
        topic: 'string', // TODO: assembly number maybe ?
        type: 1, // Instant meeting
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
          'User-Agent': 'Zoom-Jwt-Request',
        },
      },
    )
    .then((response) => {
      return res.json(response.data);
    })
    .catch((e) => {
      return res.json(e);
    });
});

app.listen(port, () =>
  console.log(`Zoom Web SDK Sample Signature Node.js on port ${port}!`),
);
