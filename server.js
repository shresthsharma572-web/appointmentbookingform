const { client } = require('./database');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Backend is working');
});

async function getAvailableDepartments() {
  const getDepartmentsQuery = 'SELECT department_name, doctor_fee FROM department';
  const res = await client.query(getDepartmentsQuery);
  return res.rows;
}



(async () => {
  const departments = await getAvailableDepartments();
  console.log(departments);
})();

async function getAppointmentData(appointmentDate, appointmentTime, doctorDepartment) {
  
  const getAppointmentInp = document.getElementById("appointmentDate").value;
  const getAppointmentTime = document.getElementById("appointmentTime").value;
  const getDoctorDepartment = document.getElementById("doctorDepartment").value;

  
  
  // Call the function to get doctor data based on the selected inputs
  const availableDoctors = await addDoctorData(getDoctorDepartment, getAppointmentInp, getAppointmentTime);
}


async function getDoctorData(doctorDepartment, appointmentDate, appointmentTime) {
  const getDoctorQuery = `SELECT * FROM doctor_avalibility($1, $2, $3)`;
  const values = [doctorDepartment, appointmentDate, appointmentTime];
  const res = await client.query(getDoctorQuery, values);
  console.log(res.rows);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return 'No doctor available at the given department and time.';
  }

}



async function getDoctorFee(doctorFee, appointmentId, status, paymentMethod, note) {
  const getDoctorFeeQuery = 'CALL public.payment_process($1, $2, $3, $4, $5)';
  const values = [doctorFee, appointmentId, status, paymentMethod, note];
  const res = await client.query(getDoctorFeeQuery, values);
  console.log(res.rows);

  if (res.rows.length > 0) {
    return res.rows[0].doctor_fee;
  } else {
    return 'No fee information available for the given department.';
  }
}



app.get('/doctorDepartment', async (req, res) => {
  try {
    const departments = await getAvailableDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/doctorData', async (req, res) => {
  const { doctorDepartment, appointmentDate, appointmentTime } = req.query;

  try {
    const doctorData = await getDoctorData(doctorDepartment, appointmentDate, appointmentTime);
    res.json(doctorData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/payment', async (req, res) => {
  const { doctorFee, appointmentId, status, paymentMethod, note } = req.body;

  try {
    const normalizedStatus = status === 'paid' ? 'completed' : status === 'pending' ? 'scheduled' : status;
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required for payment.' });
    }

    const paymentfee = await getDoctorFee(Number(doctorFee), appointmentId, normalizedStatus, paymentMethod || 'card', note || '');
    return res.json({ doctorFee: Number(doctorFee), status: normalizedStatus, message: 'Payment processed successfully.' });
  } catch (error) {
    console.error('Payment error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/bookAppointment', async (req, res) => {
  const payload = req.body || {};
  console.log('bookAppointment payload:', payload);
  const isNewPatientRequest =
    payload.newPatient == true ||
    payload.newPatient == 'true' ||
    payload.patient_mode == 'new' ||
    (payload.patient_mode != 'existing' && payload.patient_mode != undefined && payload.patient_mode != null);

  let newPatient = isNewPatientRequest;
  const firstname = (payload.patient_firstname || payload.firstname || '').trim();
  const lastname = (payload.patient_lastname || payload.lastname || '').trim();
  const email = (payload.patient_email || payload.email || '').trim() || null;
  const appointmentDate = payload.appointment_date || payload.appointmentDate || null;
  const appointmentTime = payload.appointment_time || payload.appointmentTime || null;
  const doctorDepartment = payload.department || payload.doctor_department || '';
  const appointmentType = payload.appointment_type || payload.appointmentType || payload.type || null;
  console.log('appointmentType value:', appointmentType);
  const gender = payload.gender || payload.Gender || null;
  const dateOfBirth = payload.patient_date_of_birth || payload.Date_of_birth || null;
  const phone = (payload.patient_phone || payload.phone || '').trim() || null;
  const notes = payload.reason || payload.notes || null;

  try {
    if (firstname && lastname) {
      const existingPatientQuery = `
        SELECT patient_id, firstname, lastname, email, phone
        FROM public.patient
        WHERE
          (email IS NOT NULL AND lower(email) = lower($1))
          OR (phone IS NOT NULL AND phone = $2)
          OR (lower(firstname) = lower($3) AND lower(lastname) = lower($4))
        LIMIT 1
      `;

      const existingPatient = await client.query(existingPatientQuery, [email, phone, firstname, lastname]);

      if (existingPatient.rows.length > 0) {
        const match = existingPatient.rows[0];
        const samePerson =
          (match.email && email && match.email.toLowerCase() == email.toLowerCase()) ||
          (match.phone && phone && match.phone == phone && match.firstname && match.lastname &&
            match.firstname.toLowerCase() == firstname.toLowerCase() &&
            match.lastname.toLowerCase() == lastname.toLowerCase()) ||
          (match.firstname && match.lastname &&
            match.firstname.toLowerCase() == firstname.toLowerCase() &&
            match.lastname.toLowerCase() == lastname.toLowerCase());

        if (samePerson) {
          newPatient = false;
        } else if (email || phone) {
          return res.status(409).json({
            error: 'A patient with this phone number or email already exists. Please use the existing patient option or enter different contact details.'
          });
        }
      }
    }

    const insertQuery = 'CALL appointment_processreturns($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
    const values = [
      newPatient,
      firstname,
      lastname,
      email,
      appointmentDate,
      appointmentTime,
      doctorDepartment,
      appointmentType,
      gender,
      dateOfBirth,
      phone,
      notes,
      null
    ];

    const result = await client.query(insertQuery, values);
    const appointmentId = result && result.rows && result.rows[0] ? (result.rows[0].p_appointment_id || result.rows[0].appointment_id) : null;
    return res.status(201).json({ appointment_id: appointmentId, message: 'Appointment booked successfully' });
  } catch (err) {
    console.error('Booking error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});