# OrderSaathi
 
**Turn messy WhatsApp chats into clean orders.**
 
Built for **WCC Launchpad 30**, Track 03: Everyday Automation.

## The problem
 
Home bakers, tailors, tiffin services and small shops in India take most of their orders on WhatsApp, in a mix of English, Hindi and Hinglish ("2 kg ghee kal tak", "dedh dozen"). Customers edit or cancel orders in later messages. Sellers scroll through long chats and copy details by hand into notebooks or Excel, which leads to missed orders, wrong quantities and forgotten payments.
 
## The solution
 
OrderSaathi reads a pasted WhatsApp chat and turns it into structured orders. The seller reviews everything before anything is saved.
 
1. **Paste** a WhatsApp chat (English, Hindi or Hinglish).
2. **AI extracts** each order: customer, item, quantity, unit, delivery date, amount and payment status. Later edits and cancellations are applied automatically.
3. **Review**: fields the AI is unsure about are highlighted, and rows with low confidence are flagged "Needs review". The seller can edit any field.
4. **Confirm**: nothing is saved until the seller confirms.
5. **Track**: a dashboard shows orders, pending payments and amount due, with a "Mark paid" button.
6. **Remind**: one click generates a short, polite Hinglish reminder message the seller can copy and send.
**Human stays in control:** the AI never confirms an order or sends a message on its own.
 
## Target users
 
Micro-business sellers in India who take orders on WhatsApp: home bakers, tailors, tiffin and catering services, and small local shops.
 
## What makes it different
 
- Built for informal, mixed-language chat, not clean English forms.
- Applies later edits and cancellations within the same conversation.
- Confidence scores and uncertain-field flags mean the seller reviews only what needs attention.
- The seller keeps using WhatsApp as usual, with no training needed.
## Tech stack
 
| Layer | Technology |
|---|---|
| Frontend | React (Vite), plain CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (official `mongodb` driver) |
| AI | Google Gemini API (`@google/genai`) with structured JSON output |
 
## AI workflow
 
1. The chat text is sent to `POST /api/extract`.
2. The backend calls Gemini with a system prompt that defines a strict JSON schema (customer_name, item, quantity, unit, delivery_date, amount, payment_status, confidence, uncertain_fields, source_message) and rules for Hinglish quantities, edits and cancellations. Missing fields are set to `null`, never guessed.
3. The response is validated in code. If parsing or validation fails, the request is retried once.
4. The frontend highlights uncertain fields and low-confidence rows for human review.
5. Confirmed orders are saved to MongoDB through `POST /api/orders`.
6. `POST /api/reminder` generates a short Hinglish reminder for a saved order.
**Chain:** extract, validate in code, flag uncertainty, human confirm. This is a chain with a human approval step, not an autonomous agent.
 
**Evaluation:** [ADD YOUR REAL RESULT, e.g. "Tested on N anonymised sample chats; field-level accuracy X%."]
 
## API routes
 
| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST | `/api/extract` | Extract orders from chat text |
| POST | `/api/orders` | Save confirmed orders |
| GET | `/api/orders` | List orders, newest first |
| PATCH | `/api/orders/:id` | Update payment status |
| POST | `/api/reminder` | Generate a Hinglish reminder |
 
## Run it locally
 
**Requirements:** Node.js 18 or higher, a free MongoDB Atlas cluster, and a Gemini API key from [aistudio.google.com](https://aistudio.google.com).
 
### 1. Clone
 
```bash
git clone https://github.com/YOUR_USERNAME/OrderSaathi.git
cd OrderSaathi
```
 
### 2. Backend
 
```bash
cd server
npm install
```
 
Create `server/.env` (copy `server/.env.example`) and fill in your own values:
 
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```
 
Start it:
 
```bash
npm run dev
```
 
Open `http://localhost:5000`. You should see a "backend is running" message.
 
### 3. Frontend
 
In a second terminal:
 
```bash
cd frontend
npm install
```
 
Create `frontend/.env`:
 
```
VITE_API_URL=http://localhost:5000
```
 
Start it:
 
```bash
npm run dev
```
 
Open `http://localhost:5173`.
 
### 4. Try it
 
1. Click **Load sample chat**, then **Extract Orders**.
2. Review the table (the sample chat has an edit and a cancellation).
3. Click **Confirm all**.
4. Open the **Dashboard**, mark an order paid and try **Get Reminder**.
## Project structure
 
```
OrderSaathi/
  frontend/   React app (components, api.js)
  server/     Express API (index.js, db.js)
```
 
## AI tools used in development
 
- **Google Antigravity** (AI coding assistant) was used to generate and iterate on code.
- **Google Gemini API** powers extraction and reminders in the product itself.
- The problem definition, prompt design, testing and review of the generated code were done by the author.
## Privacy
 
API keys are kept in `.env` files and are never committed. Chats are sent to the Gemini API for extraction, so sellers should anonymise sensitive customer details before using real chats.
 
## Limitations and future work
 
- Chats are pasted as text. Screenshot and voice-note input are planned.
- Reminders are drafts the seller copies and sends. Direct WhatsApp sending is not included, to keep the seller in control.
- Delivery dates are kept as the customer wrote them (for example "aaj shaam tak").