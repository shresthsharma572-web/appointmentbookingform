if (document.getElementById('appointment-type')) {
  const form = document.querySelector('form');
  const appointmentType = document.getElementById('appointment-type');
  const patientMode = document.getElementById('patient-mode');
  const newPatientFields = document.getElementById('newPatientFields');
  const genderField = document.getElementById('gender-field');
  const gender = document.getElementById('gender');
  var doctorFee = 0;
  var departmentFees = {};

  function togglePatientModeFields() {
    const isExisting = patientMode.value == 'existing';
    newPatientFields.classList.toggle('visible', !isExisting);
    genderField.classList.toggle('hidden', isExisting);

    const phone = document.getElementById('phone');
    const dateOfBirth = document.getElementById('date_of_birth');
    phone.required = !isExisting;
    dateOfBirth.required = !isExisting;
    gender.required = !isExisting;
    phone.disabled = isExisting;
    dateOfBirth.disabled = isExisting;
    gender.disabled = isExisting;

    if (isExisting) {
      phone.value = '';
      dateOfBirth.value = '';
      gender.value = '';
    }
  }

  patientMode.addEventListener('change', togglePatientModeFields);
  togglePatientModeFields();

  fetch('http://localhost:3000/doctorDepartment')
    .then(response => response.json())
    .then(data => {
      const departmentSelect = document.getElementById('department');
      data.forEach(department => {
        const option = document.createElement('option');
        option.value = department.department_name;
        option.textContent = department.department_name;
        departmentSelect.appendChild(option);
        departmentFees[department.department_name] = department.doctor_fee;
      });
    })
    .catch(error => console.error('Error fetching department data:', error));

  const departmentSelect = document.getElementById('department');
  const preferedDateInput = document.getElementById('appointment-date');
  const preferedTimeInput = document.getElementById('appointment-time');
  const doctorSelect = document.getElementById('doctor');

  function updateDoctorsList() {
    const selectedDepartmentName = departmentSelect.value;
    const dateValue = preferedDateInput.value;
    const timeValue = preferedTimeInput.value;

    doctorFee = departmentFees[selectedDepartmentName] || 0;

    if (timeValue) {
      if (timeValue < "09:00" || timeValue > "17:00") {
        alert("Please select a time between 09:00 and 17:00.");
        preferedTimeInput.value = "";
        return;
      }
    }

    if (!selectedDepartmentName || !dateValue || !timeValue) {
      return;
    }

    fetch(`http://localhost:3000/doctorData?doctorDepartment=${selectedDepartmentName}&appointmentDate=${dateValue}&appointmentTime=${timeValue}`)
      .then(response => response.json())
      .then(data => {
        doctorSelect.innerHTML = '';

        if (!data || data.length == 0) {
          const option = document.createElement('option');
          option.textContent = 'No available doctors';
          doctorSelect.appendChild(option);
          return;
        }

        data.forEach(doctor => {
          const option = document.createElement('option');
          option.value = doctor.doctor_id;
          option.textContent = (doctor.doctor_firstname && doctor.doctor_lastname)
            ? `${doctor.doctor_firstname} ${doctor.doctor_lastname}`
            : 'Unnamed Doctor';
          doctorSelect.appendChild(option);
        });
      })
      .catch(error => console.error("Error fetching doctors:", error));
  }

  departmentSelect.addEventListener('change', updateDoctorsList);
  preferedDateInput.addEventListener('change', updateDoctorsList);
  preferedTimeInput.addEventListener('change', updateDoctorsList);

  function resetBookingForm() {
    form.reset();
    togglePatientModeFields();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formdata = new Object();
    formdata.newPatient = patientMode.value !== 'existing';
    formdata.patient_firstname = document.getElementById('firstname').value;
    formdata.patient_lastname = document.getElementById('lastname').value;
    formdata.patient_email = document.getElementById('email').value;
    formdata.patient_phone = document.getElementById('phone').value;
    formdata.gender = document.getElementById('gender').value;
    formdata.patient_date_of_birth = document.getElementById('date_of_birth').value;
    formdata.department = document.getElementById('department').value;
    formdata.doctor_department = formdata.department;
    //add appointment type
    formdata.appointment_date = document.getElementById('appointment-date').value;
    formdata.appointment_time = document.getElementById('appointment-time').value;
    formdata.reason = document.getElementById('reason').value;
    formdata.notes = formdata.reason;
    formdata.appointment_type = appointmentType.value;

    console.log('Submitting booking payload:', formdata);

    if (appointmentType.value == 'online') {
      sessionStorage.setItem('pendingAppointment', JSON.stringify(formdata));
      sessionStorage.setItem('doctorFee', doctorFee);
      alert('Redirecting to payment...');
      window.location.href = 'payment.html';
      return;
    }

    bookAppointment(formdata);
  });

  function bookAppointment(appointmentData) {
    console.log('Calling /bookAppointment with:', appointmentData);

    fetch('http://localhost:3000/bookAppointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    })
      .then(async (response) => {
        const text = await response.text();
        let data = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch (error) {
          console.error('Non-JSON response from booking API:', text);
          throw new Error('Unexpected response from booking API.');
        }

        if (!response.ok) {
          throw new Error(data.error || `Booking failed (${response.status})`);
        }

        console.log('Booking API success:', data);
        const appointmentId = data.appointment_id;
        sessionStorage.setItem('appointmentId', appointmentId);

        const paymentData = {
          doctorFee: doctorFee,
          appointmentId: appointmentId,
          status: 'scheduled',
          paymentMethod: 'in-person',
          note: 'Pay at clinic'
        };

        try {
          const paymentResponse = await fetch('http://localhost:3000/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          });

          if (!paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            console.error('Error registering pending payment:', paymentResult.error);
          }
        } catch (error) {
          console.error('Error registering pending payment:', error);
        }

        alert('Appointment booked successfully.');
        resetBookingForm();
      })
      .catch(error => {
        console.error('Error:', error);
        alert(error.message || 'There was a problem booking the appointment.');
      });
  }
}

// ---------- Page 2: Payment page ----------
if (document.getElementById('pay-button')) {
  const storedFee = sessionStorage.getItem('doctorFee');
  const payButton = document.getElementById('pay-button');

  document.getElementById('doctor-fee').textContent = storedFee ? `$${storedFee}` : 'N/A';
  payButton.textContent = storedFee ? `Pay $${storedFee}` : 'N/A';

  payButton.addEventListener('click', async () => {
    const pendingAppointmentJSON = sessionStorage.getItem('pendingAppointment');

    if (!pendingAppointmentJSON) {
      alert('No appointment details found — please fill out the booking form first.');
      return;
    }

    const appointmentData = JSON.parse(pendingAppointmentJSON);

    try {
      const appointmentResponse = await fetch('http://localhost:3000/bookAppointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });

      const appointmentResult = await appointmentResponse.json();

      if (!appointmentResponse.ok) {
        throw new Error(appointmentResult.error || 'Booking failed');
      }

      const appointmentId = appointmentResult.appointment_id;

      const paymentData = {
        doctorFee: storedFee,
        appointmentId: appointmentId,
        status: 'completed',
        paymentMethod: 'card', // TODO: replace if payment.html has a method selector
        note: ''
      };

      const paymentResponse = await fetch('http://localhost:3000/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      alert(`Appointment booked and payment of $${paymentResult.doctorFee} confirmed.`);
      sessionStorage.removeItem('pendingAppointment');
      sessionStorage.removeItem('doctorFee');
      sessionStorage.removeItem('appointmentId');

    } catch (error) {
      console.error('Error booking appointment or processing payment:', error);
      alert('There was a problem completing your booking and payment. Please try again.');
    }
  });
}