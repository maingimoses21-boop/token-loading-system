# M-Pesa Daraja Firebase Middleware

A Node.js middleware service that receives M-Pesa Daraja API callbacks and stores transaction data in Firebase Realtime Database. This service maps meter numbers to user IDs and maintains transaction records for IoT smart meter systems.

## Features

- **Firebase Integration**: Connects to Firebase Realtime Database using Admin SDK
- **M-Pesa Callback Handler**: Processes Daraja API webhook callbacks
- **Meter-to-User Mapping**: Maps meter numbers to user IDs in Firebase
- **Transaction Storage**: Stores complete transaction records with timestamps
- **ESP32 Optimization**: Updates `latest_transaction_id` for quick ESP32 access
- **Flexible Authentication**: Supports both service account keys and Application Default Credentials

## Setup

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:

```bash
# Required: Your Firebase Realtime Database URL
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com

# Optional: Base64 encoded service account JSON
FIREBASE_SA_BASE64=your_base64_encoded_service_account_key

# Server port (default: 3000)
PORT=3000
```

### 2. Firebase Authentication

Choose one of these authentication methods:

#### Option A: Service Account Key (Recommended for Production)

1. Download your service account key from Firebase Console:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json`

2. Convert to base64 and add to `.env`:
   ```bash
   # Linux/Mac
   cat serviceAccountKey.json | base64 -w 0
   
   # Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
   ```

3. Copy the output and set `FIREBASE_SA_BASE64` in your `.env` file

#### Option B: Application Default Credentials (Local Development)

Set the environment variable to point to your service account key:
```bash
# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"

# Windows
set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccountKey.json
```

### 3. Firebase Database Structure

Ensure your Firebase Realtime Database has this structure:

```json
{
  "users": {
    "user_id_1": {
      "meter_no": "12345",
      "name": "John Doe",
      "latest_transaction_id": null,
      "last_payment_timestamp": null,
      "last_payment_amount": 0
    }
  },
  "transactions": {
    "transaction_id_1": {
      "transaction_id": "transaction_id_1",
      "user_id": "user_id_1",
      "meter_no": "12345",
      "amount": 100,
      "status": "COMPLETED",
      "reference": "MPesa_Ref_123",
      "timestamp": "2023-12-01T10:00:00.000Z"
    }
  }
}
```

### 4. Install Dependencies

The following dependencies should already be installed:
- `firebase-admin`
- `express`
- `body-parser`
- `dotenv`
- `axios`

If not installed, run:
```bash
npm install firebase-admin express body-parser dotenv axios
```

### 5. Daraja Sandbox Setup

1.  **Register for a developer account** on the [Safaricom Daraja Portal](https://developer.safaricom.co.ke/).
2.  **Create a new app** to get your `Consumer Key` and `Consumer Secret`.
3.  **Configure your app** to use the "LIPA NA M-PESA ONLINE" API.
4.  Update your `.env` file with the credentials:
    -   `DARAJA_CONSUMER_KEY`
    -   `DARAJA_CONSUMER_SECRET`
    -   `DARAJA_SHORTCODE` (your test PayBill number, e.g., 600988)
    -   `DARAJA_TEST_MSISDN` (your test phone number, e.g., 254708374149)
    -   `DARAJA_CALLBACK_URL` (publicly accessible URL for callbacks, e.g., `https://yourdomain.com/daraja/callback`)

### 6. Run the Application

```bash
# Production
npm start

# Development (with nodemon)
npm run dev
```

The server will start on the configured port (default: 3000).

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### M-Pesa Daraja Callback
```
POST /daraja/callback
```

Expected payload (flexible field names supported):
```json
{
  "meter_no": "12345",
  "amount": 100,
  "mpesaRef": "MPesa_Ref_123",
  "status": "COMPLETED"
}
```

Alternative field names supported:
- `meter_no` / `meterNo` / `meter` / `account`
- `amount` / `Amount` / `transaction_amount`
- `mpesaRef` / `MpesaRef` / `reference` / `Ref` / `ReceiptNumber`
- `status` / `result` / `ResultCode` / `resultCode`

## Testing

### Daraja Payment Simulation

Use `curl` to trigger a C2B payment simulation. This will be followed by a callback to `/daraja/callback`.

```bash
curl -X POST http://localhost:3000/daraja/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "meter_no": "12345678",
    "amount": 10
  }'
```

After a successful simulation, you will get a confirmation response from the API. The transaction will be finalized in Firebase only after receiving the Daraja callback.

### Daraja Callback Handling

The middleware automatically handles Daraja callbacks at `/daraja/callback`. When Daraja sends a callback:

1. **Transaction Processing**: Extracts transaction details (ResultCode, Amount, MpesaReceiptNumber, etc.)
2. **User Mapping**: Maps meter number to user ID in Firebase
3. **Status Determination**: Sets transaction status based on ResultCode (0 = SUCCESS, else FAILED)
4. **Idempotency**: Prevents duplicate transactions using MpesaReceiptNumber
5. **Firebase Update**: Creates transaction record and updates user's latest_transaction_id

**Callback Response Format:**
```json
{
  "ResultCode": 0,
  "ResultDesc": "Confirmation received successfully",
  "TransactionID": "generated_transaction_id"
}
```

### Firebase Connection

```bash
# Test health endpoint
curl http://localhost:3000/health

```

### Using Postman

1. **Health Check**:
   - Method: GET
   - URL: `http://localhost:3000/health`

2. **Daraja Callback**:
   - Method: POST
   - URL: `http://localhost:3000/daraja/callback`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "meter_no": "12345",
     "amount": 100,
     "mpesaRef": "MPesa_Ref_123",
     "status": "COMPLETED"
   }
   ```

## Deployment

### Environment Variables for Production

Set these environment variables in your production environment:

```bash
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
FIREBASE_SA_BASE64=your_base64_encoded_service_account_key
PORT=3000
```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **"No user found with meter_no"**
   - Ensure the meter number exists in Firebase under `/users/{userId}/meter_no`
   - Check that the meter number format matches exactly

2. **Firebase Authentication Errors**
   - Verify `FIREBASE_DATABASE_URL` is correct
   - Check service account key permissions
   - Ensure Firebase Realtime Database rules allow read/write access

3. **"Invalid FIREBASE_SA_BASE64 format"**
   - Verify the base64 string is complete and not truncated
   - Ensure no extra whitespace or line breaks in the base64 string

### Logs

The application provides detailed logging for debugging:
- Incoming callback payloads
- User lookup results
- Transaction creation status
- Firebase operations

Check the console output for detailed error messages and operation status.

## License

ISC