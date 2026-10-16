/**
 * CONFIGURAÇÃO DE EMAIL PARA OTP
 * 
 * Para usar OTP por email real:
 * 1. Instale o nodemailer: npm install nodemailer
 * 2. Configure suas credenciais de email abaixo
 * 3. O usuário receberá um código de 6 dígitos no email
 * 
 * Para demonstração sem email real:
 * - Use o código "123456" (modo educacional)
 */

const nodemailer = require('nodemailer');

// Configurar transportador de email
const transporter = nodemailer.createTransport({
    service: 'gmail', // ou outro serviço
    auth: {
        user: 'seu-email@gmail.com',        // Substituir
        pass: 'sua-senha-de-app'            // Senha de app do Gmail
    }
});

async function enviarOTP(email, codigo) {
    await transporter.sendMail({
        from: '"OBJ-EDU Criptografia" <seu-email@gmail.com>',
        to: email,
        subject: 'Seu código de acesso - OBJ-EDU',
        text: `Seu código de acesso é: ${codigo}`,
        html: `<h2>OBJ-EDU: Código de Acesso</h2><p>Seu código é: <strong>${codigo}</strong></p>`
    });
}

module.exports = { enviarOTP };
