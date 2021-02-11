/**
 * Zoom web server
 * FORK from @see https://github.com/zoom/websdk-sample-signature-node.js
 * Routes:
 * ---
 *  POST /signatures -> generate a signature (JWT) using API_KEY and API_SECRET that will be used to connect to a previously created meeting
 *  @example :
 *   req: POST /signatures -d { role: 'manager', meetingNumber: 'XXX' }
 *   res: 201 { signature: 'yyy' }
 * ---
 *  POST /meetings -> make a zoom api call to create a 'meeting' and return meeting .id, .password or 400 where something goes wrong
 *  @example :
 *   req: POST /meetings -d {}
 *   res: 201 { id: 'xxx', password: 'fff' }
 *   res: 400 zoom error
 * ---
 * Env vars:
 *  - ZOOM_API_KEY : zomm api key (mandatory)
 *  - ZOOM_API_SECRET: zoom api secret (mandatory)
 *  - ZOOM_API_TOKEN: zoom api jwt token (mandatory - usefull until we figure ot how to generate a token)
 *  - PORT: server listening port (default: 4000)
 *
 */
require('dotenv').config();
const {
  ZOOM_API_KEY,
  ZOOM_API_SECRET,
  ZOOM_API_TOKEN,
  PORT = 4000,
} = process.env;
const ZOOM_SETTINGS = {
  mute_upon_entry: true,
  participant_video: false,
  waiting_room: true,
};
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
const { default: axios } = require('axios');
const MISSING_BODY_DATA_ERROR = (res) => (argName) =>
  res.status(400).json({ error: new Error(`Missing body data: ${argName}`) });
const bodyDataPresenceChecker = (...args) => (req, res, next) => {
  args.forEach((arg) => {
    if (req.body.hasOwnProperty(arg)) {
      return next();
    } else {
      return MISSING_BODY_DATA_ERROR(res)(arg);
    }
  });
};
const app = express();

app.use(bodyParser.json(), cors());
app.options('*', cors());

/**
 * ---
 *  POST /signatures -> generate a signature (JWT) using API_KEY and API_SECRET that will be used to connect to a previously created meeting
 *  @argument role - the role attribued to the signature
 *  @example :
 *   req: POST /signatures -d { role: 'manager', meetingNumber: 'XXX' }
 *   res:
 *     - 201 { signature: 'yyy' }
 *     - 400 if some args
 * ---
 */
const ZOOM_MEETING_ROLES = {
  PARTICIPANT: 0,
  MANAGER: 1,
};
app.post(
  '/signatures',
  bodyDataPresenceChecker('meetingNumber', 'role'),
  (req, res) => {
    const { meetingNumber, role } = req.body;
    if (
      role !== ZOOM_MEETING_ROLES.PARTICIPANT &&
      role !== ZOOM_MEETING_ROLES.MANAGER
    ) {
      return res.status(400).json({
        error: new Error(
          `role should be 0 (participant) or 1 (manager). Got: ${role}`,
        ),
      });
    }
    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(
      ZOOM_API_KEY + meetingNumber + timestamp + role,
    ).toString('base64');
    const hash = crypto
      .createHmac('sha256', ZOOM_API_SECRET)
      .update(msg)
      .digest('base64');
    const signature = Buffer.from(
      `${ZOOM_API_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`,
    ).toString('base64');

    res.json({
      signature,
    });
  },
);

/**
 * ---
 *  POST /meetings -> make a zoom api call to create a 'meeting' and return meeting .id, .password or 400 where something goes wrong
 *  @example :
 *   req: POST /meetings -d {}
 *   res: 201 { id: 'xxx', password: 'fff' }
 *   res: 400 zoom error
 * ---
 * @see https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
 */
app.post('/meetings', (_, res) => {
  axios
    .post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        body: {
          settings: ZOOM_SETTINGS,
          topic: 'Syment General Meeting',
          type: 1, // instant meeting
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${ZOOM_API_TOKEN}`,
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

const isPresent = (envVar) =>
  process.env.hasOwnProperty(envVar)
    ? true
    : console.error(`${envVar} env var is not present. You must provide one.`);
app.listen(PORT, () => {
  isPresent('ZOOM_API_KEY');
  isPresent('ZOOM_API_SECRET');
  isPresent('ZOOM_API_TOKEN');
  console.log(`Zoom Web SDK Sample Signature Node.js on port ${PORT}!`);
});
