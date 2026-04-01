# Full-Stack Parser

Minimal full-stack app using React (Vite), Express, and MongoDB with Mongoose.

## Structure

- `client/` - React frontend
- `server/` - Express backend

## Run locally

### 1. Install dependencies

In one terminal:

```bash
cd server
npm install
```

In another terminal:

```bash
cd client
npm install
```

### 2. Configure environment variables

Server:

```bash
cd server
cp .env.example .env
```

Client:

```bash
cd client
cp .env.example .env
```

Update `server/.env` with your MongoDB connection string if needed.
Also add your OpenAI API key to `server/.env`.

### 3. Start the backend

```bash
cd server
npm run dev
```

The API will run at `http://localhost:5000/health`.

### 4. Start the frontend

```bash
cd client
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## What it does

- Backend connects to MongoDB using Mongoose
- `GET /health` returns `Server running`
- Frontend fetches that endpoint and displays the result on the homepage
- `POST /upload` accepts resume uploads and stores them in `server/uploads`
- `GET /candidates` returns saved candidates with optional filters
- `PUT /candidate/:id` updates candidate status and remarks
- Uploaded resumes are parsed into structured JSON using the OpenAI API
- Parsed candidates are stored in MongoDB using phone number as the unique identifier
- Each candidate also stores `uploadedBy` to track which recruiter uploaded the resume

## Resume upload

- Accepted file types: `PDF`, `DOC`, `DOCX`
- Maximum file size: `5MB`
- Upload field name: `resume`
- PDF text extraction uses `pdf-parse`
- DOCX text extraction uses `mammoth`
- Successful uploads return the saved file name plus parsed `name`, `phone`, `location`, `skills`, and `experience`
- Older `.doc` files are accepted, but extraction can be less reliable than `.pdf` or `.docx`
- Candidate records require a phone number, and uploads with an existing phone number return `Duplicate candidate`
- Uploads also require recruiter identification through `uploadedBy` (name or email)
- Candidate filters: `location`, `skills`, and `minExperience`
- Candidate status values: `New`, `Contacted`, `Interested`, `Interview Scheduled`, `Selected`, `Joined`, `Not Interested`
