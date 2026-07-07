import nodemailer from 'nodemailer'

export function createMailTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

export function sender(label: string) {
  return `"${label}" <${process.env.EMAIL_FROM}>`
}
