/**
 * Simple Express proxy server for Send Contract Email
 * This bypasses CORS issues with Supabase Edge Functions
 * Run with: node send-contract-proxy.js
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Supabase configuration
const SUPABASE_URL = 'https://jrgejskwlvmkpefrassc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2Vqc2t3bHZta3BlZnJhc3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTI1NzEsImV4cCI6MjA5OTM2ODU3MX0.wM46svYVYUsybOa770Q1btLhB7I9XTV9VkVygyl2ojw';

// Proxy endpoint for sending contract emails
app.post('/api/send-contract-email', async (req, res) => {
  try {
    const payload = req.body;

    // Validate required fields
    if (!payload.email || !payload.sender || !payload.htmlBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, sender, or htmlBase64',
      });
    }

    // Forward request to Supabase Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-contract-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error || 'Failed to send email',
      });
    }

    res.json({
      success: true,
      message: 'Contract email sent successfully',
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Send Contract Proxy Server is running' });
});

app.listen(PORT, () => {
  console.log(`Send Contract Proxy Server running on http://localhost:${PORT}`);
  console.log(`Use POST http://localhost:${PORT}/api/send-contract-email`);
});
