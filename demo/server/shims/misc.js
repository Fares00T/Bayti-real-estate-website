// Packages the API imports that have nothing to do in the browser.

export const nodemailer = {
  createTransport: () => ({ sendMail: async () => ({ demo: true }) }),
};

export const dotenv = { config: () => ({}) };

export default nodemailer;
