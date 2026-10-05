const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI, Type } = require('@google/genai');
const { ObjectId } = require('mongodb');
const { connectDB } = require('./db');

// Load environment variables exclusively from server/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());

// Health route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'OrderSaathi backend is running' });
});

// JSON Schema for Gemini structured output
const orderItemSchema = {
  type: Type.OBJECT,
  properties: {
    customer_name: { type: Type.STRING, nullable: true },
    item: { type: Type.STRING },
    quantity: { type: Type.NUMBER, nullable: true },
    unit: { type: Type.STRING, nullable: true },
    delivery_date: { type: Type.STRING, nullable: true },
    amount: { type: Type.NUMBER, nullable: true },
    payment_status: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER },
    uncertain_fields: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    source_message: { type: Type.STRING }
  },
  required: [
    'customer_name',
    'item',
    'quantity',
    'unit',
    'delivery_date',
    'amount',
    'payment_status',
    'confidence',
    'uncertain_fields',
    'source_message'
  ]
};

const extractResponseSchema = {
  type: Type.OBJECT,
  properties: {
    orders: {
      type: Type.ARRAY,
      items: orderItemSchema
    }
  },
  required: ['orders']
};

const SYSTEM_INSTRUCTION = `You are an AI order extraction specialist for OrderSaathi.
Your job is to analyze WhatsApp messages in English, Hindi, or Hinglish (Hindi written in Latin/English script) and extract customer orders as strict JSON.

CRITICAL RULES:
1. Output format: Return JSON strictly conforming to the requested schema with an "orders" array containing all final active order items.
2. Chronological Resolution (Handle Later Edits and Cancellations):
   - WhatsApp conversations occur sequentially.
   - If a customer modifies an order later in the chat (e.g., changes quantity from 2 to 3, switches an item, updates delivery date), extract ONLY the final resolved order state.
   - If a customer cancels an item or the entire order (e.g., "samosa mat bhejna", "cancel that", "nahi chahiye"), do NOT include the cancelled item in the orders list.
   - If all items are cancelled or no valid orders are placed, return {"orders": []}.
3. Never Guess Missing Fields:
   - If any field is not explicitly mentioned or clearly stated, set it to null.
   - Do NOT guess or invent customer_name, quantity, unit, delivery_date, amount, or payment_status.
   - If price is not mentioned, amount MUST be null.
   - If payment status is not stated, payment_status MUST be null.
   - If customer name is not given, customer_name MUST be null.
4. Confidence & Uncertainty:
   - confidence: A number between 0 and 1 representing your extraction confidence for that item.
   - uncertain_fields: Array of field names (e.g. ["delivery_date", "quantity"]) where the text was ambiguous. If fully confident, use an empty array [].
   - source_message: The exact relevant WhatsApp message text from which this order item was extracted or finalized.
5. Language Support:
   - Accurately understand English, Hindi, and Hinglish terminology (e.g., "kilo" -> "kg", "tamatar" -> "tomato" or "tamatar", "bhejna" -> send, "kal" -> tomorrow, "sham" -> evening, "paise bhej diye" -> payment_status "paid").`;

/**
 * Strips potential markdown code fences from Gemini responses.
 */
function cleanJsonResponse(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
}

/**
 * Validates the extracted orders structure and types in code.
 */
function validateOrders(data) {
  let ordersList;
  if (Array.isArray(data)) {
    ordersList = data;
  } else if (data && Array.isArray(data.orders)) {
    ordersList = data.orders;
  } else if (data && typeof data === 'object' && ('item' in data)) {
    ordersList = [data];
  } else {
    throw new Error('Response must be an object with an "orders" array or a list of orders');
  }

  const requiredFields = [
    'customer_name',
    'item',
    'quantity',
    'unit',
    'delivery_date',
    'amount',
    'payment_status',
    'confidence',
    'uncertain_fields',
    'source_message'
  ];

  return ordersList.map((order, index) => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) {
      throw new Error(`Order item at index ${index} must be an object`);
    }

    for (const field of requiredFields) {
      if (!(field in order)) {
        throw new Error(`Order item at index ${index} is missing required field "${field}"`);
      }
    }

    if (order.customer_name !== null && typeof order.customer_name !== 'string') {
      throw new Error(`Order item at index ${index}: customer_name must be a string or null`);
    }

    if (typeof order.item !== 'string' || !order.item.trim()) {
      throw new Error(`Order item at index ${index}: item must be a non-empty string`);
    }

    if (order.quantity !== null && (typeof order.quantity !== 'number' || Number.isNaN(order.quantity))) {
      throw new Error(`Order item at index ${index}: quantity must be a number or null`);
    }

    if (order.unit !== null && typeof order.unit !== 'string') {
      throw new Error(`Order item at index ${index}: unit must be a string or null`);
    }

    if (order.delivery_date !== null && typeof order.delivery_date !== 'string') {
      throw new Error(`Order item at index ${index}: delivery_date must be a string or null`);
    }

    if (order.amount !== null && (typeof order.amount !== 'number' || Number.isNaN(order.amount))) {
      throw new Error(`Order item at index ${index}: amount must be a number or null`);
    }

    if (order.payment_status !== null && typeof order.payment_status !== 'string') {
      throw new Error(`Order item at index ${index}: payment_status must be a string or null`);
    }

    if (
      typeof order.confidence !== 'number' ||
      Number.isNaN(order.confidence) ||
      order.confidence < 0 ||
      order.confidence > 1
    ) {
      throw new Error(`Order item at index ${index}: confidence must be a number between 0 and 1`);
    }

    if (!Array.isArray(order.uncertain_fields) || !order.uncertain_fields.every((f) => typeof f === 'string')) {
      throw new Error(`Order item at index ${index}: uncertain_fields must be an array of strings`);
    }

    if (typeof order.source_message !== 'string') {
      throw new Error(`Order item at index ${index}: source_message must be a string`);
    }

    return {
      customer_name: order.customer_name ? order.customer_name.trim() : null,
      item: order.item.trim(),
      quantity: order.quantity !== null ? Number(order.quantity) : null,
      unit: order.unit ? order.unit.trim() : null,
      delivery_date: order.delivery_date ? order.delivery_date.trim() : null,
      amount: order.amount !== null ? Number(order.amount) : null,
      payment_status: order.payment_status ? order.payment_status.trim() : null,
      confidence: Math.round(Number(order.confidence) * 100) / 100,
      uncertain_fields: order.uncertain_fields.map((f) => String(f).trim()),
      source_message: order.source_message.trim()
    };
  });
}

/**
 * Calls Gemini Flash model to extract orders from chat text.
 */
async function callGeminiExtract(ai, chatText, previousError = null) {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModels = [primaryModel, 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
  const modelsToTry = [...new Set(fallbackModels)];

  let prompt = `WhatsApp Chat Transcript:\n"""\n${chatText}\n"""\n\nExtract all final active orders according to instructions.`;
  if (previousError) {
    prompt += `\n\nATTENTION: Your previous extraction failed code validation with the error:\n"${previousError}"\nPlease fix this mistake and ensure every field is strictly present and adheres to the specified types.`;
  }

  let lastModelError = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: extractResponseSchema
        }
      });
      return typeof response.text === 'function' ? response.text() : response.text;
    } catch (err) {
      lastModelError = err;
      console.warn(`Model ${model} failed during extraction: ${err.message}`);
    }
  }
  throw lastModelError || new Error('All model attempts failed');
}

// POST /api/extract
app.post('/api/extract', async (req, res) => {
  const { chatText } = req.body || {};

  if (!chatText || typeof chatText !== 'string' || !chatText.trim()) {
    return res.status(400).json({ error: 'chatText is required and must be a non-empty string' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server/.env' });
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (initErr) {
    return res.status(500).json({ error: 'Failed to initialize Gemini client', details: initErr.message });
  }

  let lastError = null;
  let rawResponse = null;

  // Initial attempt + 1 retry if validation fails
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawResponse = await callGeminiExtract(ai, chatText, attempt > 0 ? lastError?.message : null);
      const cleaned = cleanJsonResponse(rawResponse);
      const parsed = JSON.parse(cleaned);
      const validatedOrders = validateOrders(parsed);

      return res.json({ orders: validatedOrders });
    } catch (err) {
      lastError = err;
      console.warn(`Extraction attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  return res.status(422).json({
    error: 'Failed to extract valid order data after retry',
    details: lastError ? lastError.message : 'Unknown validation error',
    rawResponse: rawResponse || null
  });
});

// POST /api/orders
// Takes { orders: [...] }, validates customer_name, item, quantity, payment_status,
// adds status: "confirmed" and created_at, and inserts them into the orders collection.
app.post('/api/orders', async (req, res) => {
  const { orders } = req.body || {};

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: 'orders must be a non-empty array' });
  }

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (!o || typeof o !== 'object') {
      return res.status(400).json({ error: `Order at index ${i} must be an object` });
    }

    if (!o.customer_name || typeof o.customer_name !== 'string' || !o.customer_name.trim()) {
      return res.status(400).json({ error: `Order at index ${i} requires customer_name` });
    }

    if (!o.item || typeof o.item !== 'string' || !o.item.trim()) {
      return res.status(400).json({ error: `Order at index ${i} requires item` });
    }

    const qty = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity);
    if (o.quantity === undefined || o.quantity === null || isNaN(qty)) {
      return res.status(400).json({ error: `Order at index ${i} requires valid quantity` });
    }

    if (!o.payment_status || typeof o.payment_status !== 'string' || !o.payment_status.trim()) {
      return res.status(400).json({ error: `Order at index ${i} requires payment_status` });
    }
  }

  try {
    const db = await connectDB();
    const now = new Date();
    const documentsToInsert = orders.map((o) => {
      const doc = {
        ...o,
        customer_name: o.customer_name.trim(),
        item: o.item.trim(),
        quantity: typeof o.quantity === 'number' ? o.quantity : Number(o.quantity),
        payment_status: o.payment_status.trim().toLowerCase(),
        status: 'confirmed',
        created_at: now
      };
      delete doc._id;
      return doc;
    });

    const result = await db.collection('orders').insertMany(documentsToInsert);
    return res.status(201).json({
      success: true,
      insertedCount: result.insertedCount,
      orders: documentsToInsert
    });
  } catch (err) {
    console.error('Error saving orders:', err);
    return res.status(500).json({ error: 'Failed to save orders', message: err.message });
  }
});

// GET /api/orders
// Returns all orders, newest first.
app.get('/api/orders', async (req, res) => {
  try {
    const db = await connectDB();
    const orders = await db.collection('orders').find().sort({ created_at: -1 }).toArray();
    return res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders', message: err.message });
  }
});

// PATCH /api/orders/:id
// Updates payment_status (paid, advance, pending).
app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body || {};

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  const validStatuses = ['paid', 'advance', 'pending'];
  const status = String(payment_status || '').trim().toLowerCase();

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `payment_status must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const db = await connectDB();
    const updated = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { payment_status: status } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({
      success: true,
      ...updated,
      order: updated
    });
  } catch (err) {
    console.error('Error updating order:', err);
    return res.status(500).json({ error: 'Failed to update order', message: err.message });
  }
});

// POST /api/reminder
// Takes an order id and returns a short, polite payment or delivery reminder message in simple Hinglish, generated by Gemini.
app.post('/api/reminder', async (req, res) => {
  const { id, orderId, order_id } = req.body || {};
  const targetId = id || orderId || order_id;

  if (!targetId || !ObjectId.isValid(targetId)) {
    return res.status(400).json({ error: 'Valid order id is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server/.env' });
  }

  try {
    const db = await connectDB();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(targetId) });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const modelsToTry = [...new Set([primaryModel, 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'])];

    const reminderPrompt = `You are a helpful assistant for OrderSaathi, an app for Indian small business owners and shopkeepers.
Generate a short (1-2 sentences), warm, polite WhatsApp reminder message in simple, natural Hinglish (conversational Hindi written in English letters/Latin alphabet) for a customer regarding their order.

Order Details:
- Customer Name: ${order.customer_name || 'Customer'}
- Item: ${order.item}
- Quantity: ${order.quantity} ${order.unit || ''}
- Amount: ${order.amount ? '₹' + order.amount : 'Not specified'}
- Payment Status: ${order.payment_status}
- Delivery Date/Time: ${order.delivery_date || 'Not specified'}

Instructions:
- If payment_status is 'pending' or 'advance', politely remind them about the payment/balance amount.
- If payment_status is 'paid', send a polite reminder/update about their delivery.
- Greet politely (e.g. "Namaste [Name] ji" or "Hello [Name] ji").
- Keep it natural, polite, and under 2 sentences.
- Output ONLY the reminder message text. Do not wrap in quotes or add explanation.`;

    let response;
    let lastReminderErr;
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: reminderPrompt
        });
        if (response) break;
      } catch (geminiErr) {
        lastReminderErr = geminiErr;
        console.warn(`Model ${modelName} failed for reminder: ${geminiErr.message}`);
      }
    }

    if (!response) {
      throw lastReminderErr || new Error('Failed to generate reminder from all candidate models');
    }

    const reminderText = (typeof response.text === 'function' ? response.text() : response.text).trim();

    return res.json({
      reminder: reminderText,
      message: reminderText
    });
  } catch (err) {
    console.error('Error generating reminder:', err);
    return res.status(500).json({ error: 'Failed to generate reminder', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// CATALOG routes – "My Items" price list
// ---------------------------------------------------------------------------

/**
 * GET /api/catalog
 * Returns all catalog items for the seller.
 */
app.get('/api/catalog', async (req, res) => {
  try {
    const db = await connectDB();
    const items = await db.collection('catalog').find().sort({ name: 1 }).toArray();
    return res.json(items);
  } catch (err) {
    console.error('Error fetching catalog:', err);
    return res.status(500).json({ error: 'Failed to fetch catalog', message: err.message });
  }
});

/**
 * POST /api/catalog
 * Adds a new catalog item.
 * Body: { name, aliases (optional array of strings), price_per_unit, unit }
 */
app.post('/api/catalog', async (req, res) => {
  const { name, aliases, price_per_unit, unit } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const priceNum = Number(price_per_unit);
  if (price_per_unit === undefined || price_per_unit === null || isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'price_per_unit must be a non-negative number' });
  }

  try {
    const db = await connectDB();
    const doc = {
      name: name.trim(),
      aliases: Array.isArray(aliases)
        ? aliases.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
        : [],
      price_per_unit: priceNum,
      unit: unit ? String(unit).trim() : null,
      created_at: new Date()
    };
    const result = await db.collection('catalog').insertOne(doc);
    return res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    console.error('Error adding catalog item:', err);
    return res.status(500).json({ error: 'Failed to add catalog item', message: err.message });
  }
});

/**
 * DELETE /api/catalog/:id
 * Removes a catalog item.
 */
app.delete('/api/catalog/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid catalog item ID' });
  }
  try {
    const db = await connectDB();
    const result = await db.collection('catalog').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting catalog item:', err);
    return res.status(500).json({ error: 'Failed to delete catalog item', message: err.message });
  }
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OrderSaathi server running on port ${PORT}`);
  });
}

module.exports = { app, validateOrders, cleanJsonResponse };
