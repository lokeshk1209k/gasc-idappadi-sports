const QRCode = require('qrcode');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.query.token || req.query.id;
  if (!token) {
    return res.status(400).json({ success: false, message: 'QR token is required' });
  }

  // Base URL resolution
  let baseUrl = req.query.baseUrl;
  if (!baseUrl || baseUrl.trim() === '') {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'gasc-student-portal.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    baseUrl = `${proto}://${host}`;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');

  // Determine path: Tournament QR opens /open-registration/<token>
  const targetPath = req.query.path || `/open-registration/${token}`;
  const registrationUrl = `${baseUrl}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;

  const format = req.query.format || 'png';
  const size = parseInt(req.query.size, 10) || 300;

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(registrationUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: { dark: '#0a192f', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send(svg);
    } else {
      const buffer = await QRCode.toBuffer(registrationUrl, {
        type: 'png',
        width: size,
        margin: 2,
        color: { dark: '#0a192f', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/png');
      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="GASC_InterCollege_Tournament_QR_${token}.png"`);
      }
      return res.status(200).send(buffer);
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error generating QR code: ' + err.message });
  }
};
