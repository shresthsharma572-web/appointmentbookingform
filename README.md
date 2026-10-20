# appointmentbookingform

# Medical Appointment System

This project is a clinic booking and payment prototype built with a Node.js backend, Express, PostgreSQL, and static HTML/JavaScript front-end pages. It allows a patient to choose a department, select an available doctor based on date and time, create or continue a patient record, and complete an appointment booking flow.

## Overview

The system has two main pages:

- `index.html` – the booking form for new or existing patients
- `payment.html` – the payment confirmation screen for online consultations

The front end is served by the Express server, and the actual booking logic is handled through PostgreSQL stored procedures and SQL queries.

## Features

- Patient mode selection: new patient or existing patient
- Department and doctor availability checks based on appointment date and time
- Appointment booking with date, time, department, appointment type, and notes
- Duplicate patient protection using email, phone number, and name matching
- Payment flow for online consultations
- PostgreSQL-backed data storage for departments, doctors, appointments, and patient records

## Tech Stack

- Front end: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Database client: `pg`
- Runtime: `npm`

## Project Structure

- `server.js` – Express server and API routes
- `database.js` – PostgreSQL database connection setup
- `script.js` – browser logic for form validation, doctor lookup, and payment flow
- `index.html` – booking page UI
- `payment.html` – payment page UI
- `medical Clinic database` – database dump / backup file
- `package.json` – project scripts and dependencies

## How It Works

### 1. Front-end booking flow

When a user opens `index.html`, the browser loads `script.js`.

The script does the following:

- fetches departments from the backend (`/doctorDepartment`)
- populates the department dropdown
- checks the selected date and time
- queries available doctors using `/doctorData`
- shows doctor options based on department, date, and time
- validates patient details before booking

### 2. Patient records

The form allows either:

- a new patient, where a user provides contact details and personal information
- an existing patient, where the system reuses the patient record if the same email, phone number, or name is detected

The server checks the patient table to avoid duplicates and decides whether the appointment belongs to a new or existing patient.

### 3. Appointment creation

When the form is submitted, the browser sends a JSON payload to the backend route:

- `POST /bookAppointment`

The server then:

- validates patient info
- checks if the patient already exists
- calls the PostgreSQL stored procedure `appointment_processreturns(...)`
- returns the generated appointment ID

This is where the actual booking record is saved in the clinic’s database.

### 4. Department and doctor availability

The backend has two main database lookup functions:

- `getAvailableDepartments()`
  - reads all departments and their doctor fees
- `getDoctorData(doctorDepartment, appointmentDate, appointmentTime)`
  - calls the SQL function `doctor_avalibility(...)`
  - returns doctors who are available at the selected time slot

These endpoints are used by the front-end to keep the appointment form dynamic.

### 5. Payment flow

If the appointment type is `online`, the browser stores the appointment data in `sessionStorage` and redirects the user to `payment.html`.

On the payment page:

- the selected doctor fee is displayed
- the user clicks the payment button
- the browser sends the booking request again and then calls the payment API

The backend endpoint used for payment is:

- `POST /payment`

This calls the PostgreSQL stored procedure `payment_process(...)` and records a payment entry using the appointment ID, fee, status, and payment method.

### 6. In-person appointments

For physical or in-clinic bookings, the form submits straight to the booking endpoint without redirecting to the payment screen. The app then registers a pending or scheduled payment record depending on the booking type.

## Backend API Endpoints

The server exposes the following routes:

### `GET /doctorDepartment`
Returns all departments and their fees.

### `GET /doctorData`
Returns doctors available for the selected department and date/time.

Example query:

```text
/doctorData?doctorDepartment=Cardiology&appointmentDate=2026-10-21&appointmentTime=10:30
```

### `POST /bookAppointment`
Creates a patient appointment.

Required payload includes:

- first name
- last name
- appointment date
- appointment time
- department
- appointment type
- patient mode (new or existing)

### `POST /payment`
Processes payment for an appointment.

Example payload:

```json
{
  "doctorFee": 45,
  "appointmentId": 102,
  "status": "completed",
  "paymentMethod": "card",
  "note": "Online consultation"
}
```

## Database Setup

The project expects a PostgreSQL database named `Medical Clinic` running on `localhost` with the following details in `database.js`:

```js
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "Medical Clinic",
  port: 5432,
  password: "Admin1312"
});
```

The `medical Clinic database` file appears to be a PostgreSQL database dump that should be restored or used to create the required tables and stored procedures.

> If your local PostgreSQL credentials differ, update the connection details in `database.js` before running the app.

## Installation

1. Open the project folder in a terminal.
2. Install dependencies:

```bash
npm install
```

## Run the App

Start the server:

```bash
npm start
```

Or run in development mode with nodemon:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Notes

- The appointment system is a prototype and is designed for local development.
- The payment screen is visually complete but still acts as a simulated payment flow.
- The backend is serving static files from the project root, so the HTML pages are accessible directly via Express.
- The app relies on database procedures and table data being present, so the PostgreSQL database must be initialized correctly before the booking flow works.

## Summary

This application is a small clinic appointment management system that combines patient record handling, doctor availability checks, booking logic, and payment processing. The front end is simple and browser-based, while the real business logic and data storage live on the backend through Express routes and PostgreSQL functions.
