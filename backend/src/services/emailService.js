const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'mailhog';
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false
});

async function sendPasswordEmail(to, password) {
  const mailOptions = {
    from: '"SI Relevés" <no-reply@ree.ma>',
    to,
    subject: 'Vos identifiants SI Relevés',
    text: `Bonjour,\n\nVotre mot de passe initial pour le SI Relevés est : ${password}\n\nMerci de le changer après votre première connexion.\n`,
    html: `<p>Bonjour,</p><p>Votre mot de passe initial pour le <strong>SI Relevés</strong> est :</p><p><code>${password}</code></p><p>Merci de le changer après votre première connexion.</p>`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendPasswordEmail
};





