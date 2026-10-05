# OrderSaathi 📦💬

**Turn messy WhatsApp chats into clean orders and automated shop operations.**

Built for **WCC Launchpad 30**, Track 03: Everyday Automation.

---

## 🚀 The Problem

Home bakers, tailors, tiffin services, and small shops in India take most of their orders via WhatsApp messages and voice notes in a mix of English, Hindi, and Hinglish (*"2 kg ghee kal tak"*, *"dedh dozen tamatar"*). 

Customers frequently edit quantities or cancel items mid-conversation. Sellers manually scroll through long chat transcripts and copy details by hand into paper notebooks (*Khata*), resulting in:
- Missed orders and wrong quantities
- Discrepancies between stated customer amounts and actual item catalog prices
- Forgotten payment follow-ups and uncollected *Udhaar* (credit)

---

## ✨ The Solution

**OrderSaathi** transforms unstructured WhatsApp text and voice dictation into structured, verified orders and operational insights—while keeping the human seller in total control.

1. 💬 **Paste or Speak**: Paste a WhatsApp transcript or click **`🎙️ Record Voice Note`** to speak in Hindi, Hinglish, or English.
2. 🤖 **AI Order Extraction**: Google Gemini extracts customer name, item, quantity, unit, delivery date, amount, payment status, and phone number while resolving edits and cancellations.
3. 🏷️ **Catalog Rate Verification**: Compares extracted orders against the seller's **"My Items" Catalog** with alias matching (*tamatar* ↔ *tomato*). Flagging **`⚠️ Price Mismatch`** or **`ℹ️ Not in Catalog`**.
4. 📋 **Human Review**: Uncertain fields (highlighted in yellow) and low-confidence items are flagged for vendor edit before saving.
5. 📊 **Seller Dashboard Operations**:
   - **Today's Prep List**: Aggregates total quantities per item needed for today's orders.
   - **Customer Balances**: Tracks total credit/udhaar extended per customer.
6. 📱 **AI Reminders & UPI QR Codes**: One-click generation of polite Hinglish WhatsApp reminders equipped with a **Dynamic UPI Payment QR Code** and `upi://pay` payment link.

---

## 👥 Target Users

Micro-business sellers in India operating primarily over WhatsApp:
- Kirana & local grocery stores
- Home bakers & cloud kitchens
- Tiffin & catering services
- Boutiques, tailors & Instagram sellers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Vanilla CSS, Web Speech API (Dictation) |
| **Backend** | Node.js, Express |
| **Database** | MongoDB Atlas (official `mongodb` driver) |
| **AI** | Google Gemini API (`@google/genai`) with structured JSON schema output & multi-model fallback |
| **Payments** | Dynamic UPI Deep Links & QR Code Generator |

---

## 🧠 AI Workflow & Resilience

1. Chat text is posted to `/api/extract`.
2. The backend sends the text to Google Gemini with a strict JSON Schema prompt for English/Hindi/Hinglish extraction, handling chronological edits and cancellations. Missing fields are set to `null` (never guessed).
3. **Multi-Model Failover**: If the primary model (`gemini-flash-lite-latest`) experiences temporary server demand spikes (HTTP 503), the backend automatically fails over to candidate models (`gemini-3.8-flash`, `gemini-flash-latest`) without failing the request.
4. Response is validated in code. If parsing fails, it retries automatically.
5. Confirmed orders are stored in MongoDB.
6. `/api/reminder` generates a polite Hinglish message for payment/delivery follow-up.

---

## ⚡ Key Features

- 🎙️ **Voice Note Dictation**: Speech-to-text input with `hi-IN` (Hindi/Hinglish) and `en-IN` (English) support.
- 🏷️ **"My Items" Catalog**: Custom price list with name, unit rate, and search aliases.
- ⚠️ **Verification Badges**: Automated price discrepancy alerts.
- 🧑‍🍳 **Kitchen Prep Summary**: Item-wise total quantity aggregator for today's packing.
- 💰 **Customer Credit Ledger**: Per-customer pending balance summary.
- 📱 **Dynamic UPI QR Code**: Scannable payment QR code generated per order with direct WhatsApp link attachment (`https://wa.me/{phone}?text=...`).

---

## 📡 API Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/extract` | Extract orders from chat text via Gemini AI |
| `POST` | `/api/orders` | Save confirmed orders to MongoDB |
| `GET` | `/api/orders` | Fetch all orders (newest first) |
| `PATCH` | `/api/orders/:id` | Update payment status (`paid`, `advance`, `pending`) |
| `POST` | `/api/reminder` | Generate Hinglish reminder text via Gemini |
| `GET` | `/api/catalog` | Get seller catalog items |
| `POST` | `/api/catalog` | Add item to catalog (name, price, aliases, unit) |
| `DELETE` | `/api/catalog/:id` | Delete item from catalog |

---

## 🏃 Run It Locally

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster
- Google Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Setup Backend

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest
```

Start server:
```bash
node index.js
```

### 2. Setup Frontend

In a second terminal:
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

Start frontend:
```bash
npm run dev
```
Open `http://localhost:5173`.

---

## 🔒 Privacy & Safety

- API keys are secured in `server/.env` and never exposed to client bundles.
- Human-in-the-loop design: AI never sends WhatsApp messages or modifies orders autonomously without seller confirmation.