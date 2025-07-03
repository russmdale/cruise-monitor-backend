const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cruise-monitor', { useNewUrlParser: true, useUnifiedTopology: true });

// Mongoose Schemas
const SourceSchema = new mongoose.Schema({
    name: String,
    url: String,
    category: String,
    status: String,
    lastChecked: String
});
const ChangeSchema = new mongoose.Schema({
    source: String,
    url: String,
    categories: [String],
    summary: String,
    details: String,
    severity: String,
    timestamp: String,
    reviewed: Boolean
});
const EmailRecipientSchema = new mongoose.Schema({
    email: String
});

const Source = mongoose.model('Source', SourceSchema);
const Change = mongoose.model('Change', ChangeSchema);
const EmailRecipient = mongoose.model('EmailRecipient', EmailRecipientSchema);

// Get all sources
app.get('/api/sources', async (req, res) => {
    const sources = await Source.find();
    res.json(sources);
});

// Add a source
app.post('/api/sources', async (req, res) => {
    const source = new Source(req.body);
    await source.save();
    res.json(source);
});

// Delete a source
app.delete('/api/sources/:id', async (req, res) => {
    await Source.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Get all changes
app.get('/api/changes', async (req, res) => {
    const changes = await Change.find().sort({ timestamp: -1 });
    res.json(changes);
});

// Add a change
app.post('/api/changes', async (req, res) => {
    const change = new Change(req.body);
    await change.save();
    res.json(change);
});

// Get all email recipients
app.get('/api/email-recipients', async (req, res) => {
    const recipients = await EmailRecipient.find();
    res.json(recipients);
});

// Add email recipient
app.post('/api/email-recipients', async (req, res) => {
    const email = new EmailRecipient({ email: req.body.email });
    await email.save();
    res.json(email);
});

// Delete email recipient
app.delete('/api/email-recipients/:id', async (req, res) => {
    await EmailRecipient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- Monitoring endpoint (simulate) ---
app.post('/api/monitor', async (req, res) => {
    // (Replace this with real web scraping and diff logic)
    const sources = await Source.find();
    let foundChanges = [];
    for (let source of sources) {
        // Simulate a random change
        if (Math.random() < 0.3) {
            const summary = 'Detected simulated policy change';
            const change = new Change({
                source: source.name,
                url: source.url,
                categories: [source.category],
                summary,
                details: `Simulated change for ${source.name}`,
                severity: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                timestamp: new Date().toLocaleString(),
                reviewed: false
            });
            await change.save();
            foundChanges.push(change);
            source.status = 'changes-found';
        } else {
            source.status = 'up-to-date';
        }
        source.lastChecked = new Date().toLocaleString();
        await source.save();
    }
    res.json({ changes: foundChanges });
});

// --- Email Sending endpoint ---
app.post('/api/send-email', async (req, res) => {
    const { subject, body } = req.body;
    const recipients = (await EmailRecipient.find()).map(r => r.email);

    // Configure your email service (for example, with Gmail SMTP)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'YOUR_EMAIL@gmail.com',
            pass: 'YOUR_APP_PASSWORD'
        }
    });

    await transporter.sendMail({
        from: 'YOUR_EMAIL@gmail.com',
        to: recipients.join(','),
        subject,
        text: body
    });

    res.json({ success: true });
});

// --- Schedule daily monitoring (runs every day at 8am) ---
cron.schedule('0 8 * * *', async () => {
    // Call the same logic as /api/monitor, then email if changes found
    // ... See logic above
});

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



