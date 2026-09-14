import { useEffect, useState } from 'react';
import { CarFront, ChevronRight, Clock3, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { api, post } from '../../api';

export default function BookServicePage() {
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [form, setForm] = useState({ vehicle: '', service: '', bookingDate: '', timeSlot: '', problemDescription: '', customerNotes: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    Promise.all([api('/vehicles'), api('/services')])
      .then(([vehicleData, serviceData]) => {
        setVehicles(vehicleData);
        setServices(serviceData);
      })
      .catch((error) => {
        setMessage(error.message);
        setMessageType('error');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === form.vehicle);
  const selectedService = services.find((service) => service._id === form.service);

  useEffect(() => {
    if (form.bookingDate) {
      setSlotsLoading(true);
      api(`/bookings/available-slots/${form.bookingDate}`)
        .then((data) => {
          setAvailableSlots(data.availableSlots);
          if (!data.availableSlots.includes(form.timeSlot)) {
            setForm(prev => ({ ...prev, timeSlot: data.availableSlots[0] || '' }));
          }
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false));
    }
  }, [form.bookingDate]);

  function chooseVehicle(event) {
    setForm({ ...form, vehicle: event.target.value, service: '' });
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.vehicle || !form.service || !form.bookingDate || !form.timeSlot) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await post('/bookings', form);
      setMessageType('success');
      setMessage('✓ Booking confirmed! Your service advisor will reach out shortly.');
      setBookingSuccess(true);
      setTimeout(() => {
        setForm({ vehicle: '', service: '', bookingDate: '', timeSlot: '', problemDescription: '', customerNotes: '' });
        setAvailableSlots([]);
        setBookingSuccess(false);
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="page narrow">
    <div className="page-heading">
      <div>
        <p className="eyebrow orange">New appointment</p>
        <h1>Book a service</h1>
        <p className="muted">Complete the steps below to schedule your service appointment.</p>
      </div>
    </div>

    {bookingSuccess && (
      <div style={{ padding: '16px', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <CheckCircle size={24} color="#4caf50" />
        <div style={{ flex: 1 }}>
          <strong>Booking Successful!</strong>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#555' }}>We'll confirm your appointment shortly</p>
        </div>
      </div>
    )}

    <div className="panel booking-form">
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p className="muted">Loading vehicles and services...</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          {/* Step 1: Choose Vehicle */}
          <div className="step-label"><span>01</span><div><b>Choose your vehicle</b><small>Select the vehicle that needs service</small></div></div>
          <select required value={form.vehicle} onChange={chooseVehicle} disabled={bookingSuccess} style={{ marginBottom: '16px' }}>
            <option value="">Select vehicle...</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}
              </option>
            ))}
          </select>
          {!vehicles.length && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: '#fff3e0', borderRadius: '6px', marginBottom: '16px', alignItems: 'flex-start' }}>
              <AlertCircle size={18} color="#ff9800" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>No vehicles found</strong>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: '#555' }}>Add a vehicle to your profile before booking a service</p>
              </div>
            </div>
          )}

          {selectedVehicle && (
            <div className="selected-vehicle" style={{ marginBottom: '24px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', gap: '12px' }}>
              <div className="record-icon"><CarFront size={20} /></div>
              <div>
                <span className="eyebrow">Selected vehicle</span>
                <strong>{selectedVehicle.brand} {selectedVehicle.model}</strong>
                <small>{selectedVehicle.registrationNumber} · {selectedVehicle.fuelType} · {selectedVehicle.mileage || 0} km</small>
              </div>
            </div>
          )}

          {selectedVehicle && (
            <>
              {/* Step 2: Choose Service */}
              <div className="step-label"><span>02</span><div><b>Choose a service</b><small>Select from available services</small></div></div>
              <div className="service-options" style={{ marginBottom: '24px' }}>
                {services.length ? (
                  services.map((service) => (
                    <label key={service._id} className={`service-option ${form.service === service._id ? 'selected' : ''}`} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: form.service === service._id ? '#f0f7ff' : '#fff' }}>
                      <input type="radio" name="service" value={service._id} checked={form.service === service._id} onChange={(e) => setForm({ ...form, service: e.target.value })} style={{ marginRight: '8px' }} />
                      <span style={{ flex: 1 }}>
                        <b>{service.name}</b>
                        <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>{service.description || 'Professional service for your vehicle'}</small>
                      </span>
                      <span className="service-price" style={{ marginLeft: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <strong>₹{Number(service.price).toLocaleString('en-IN')}</strong>
                        {service.estimatedDuration && <small style={{ display: 'block', color: '#666', marginTop: '4px' }}><Clock3 size={12} /> {service.estimatedDuration} min</small>}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="error">No active services available</p>
                )}
              </div>

              {selectedService && (
                <div style={{ padding: '12px', background: '#e3f2fd', borderRadius: '6px', marginBottom: '24px' }}>
                  <p><strong>Service Summary:</strong> {selectedService.name} - ₹{Number(selectedService.price).toLocaleString('en-IN')}</p>
                </div>
              )}

              {/* Step 3: Pick Date and Time */}
              <div className="step-label"><span>03</span><div><b>Pick date & time</b><small>Choose your preferred appointment slot</small></div></div>
              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <label>
                  Preferred Date *
                  <input required type="date" min={new Date().toISOString().split('T')[0]} value={form.bookingDate} onChange={(e) => setForm({ ...form, bookingDate: e.target.value })} />
                </label>
                <label>
                  Time Slot *
                  {slotsLoading ? (
                    <div style={{ padding: '10px', color: '#999' }}>Loading slots...</div>
                  ) : (
                    <select required value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })} disabled={!form.bookingDate || availableSlots.length === 0}>
                      <option value="">Select time...</option>
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  )}
                  {form.bookingDate && availableSlots.length === 0 && (
                    <small style={{ color: '#d32f2f', marginTop: '4px', display: 'block' }}>No slots available for this date</small>
                  )}
                </label>
              </div>

              {/* Step 4: Additional Information */}
              <div className="step-label"><span>04</span><div><b>Tell us more</b><small>Help us understand the issue (optional)</small></div></div>
              <label style={{ marginBottom: '16px' }}>
                Problem Description
                <textarea value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} rows="3" placeholder="What's the issue with your vehicle? e.g., Strange noise, Warning lights, Performance issues..." style={{ fontFamily: 'inherit', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }} />
              </label>

              <label style={{ marginBottom: '20px' }}>
                Additional Notes
                <textarea value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} rows="2" placeholder="Any other details we should know?" style={{ fontFamily: 'inherit', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }} />
              </label>

              {/* Messages */}
              {message && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '6px', background: messageType === 'success' ? '#e8f5e9' : '#ffebee', border: `1px solid ${messageType === 'success' ? '#4caf50' : '#f44336'}`, color: messageType === 'success' ? '#2e7d32' : '#c62828', display: 'flex', gap: '8px' }}>
                  {messageType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <div>{message}</div>
                </div>
              )}

              {/* Submit Button */}
              <button className="primary" type="submit" disabled={!form.vehicle || !form.service || !form.bookingDate || !form.timeSlot || submitting} style={{ width: '100%', opacity: (!form.vehicle || !form.service || !form.bookingDate || !form.timeSlot || submitting) ? 0.6 : 1 }}>
                <span>{submitting ? 'Booking...' : 'Confirm Booking'}</span>
                {!submitting && <ChevronRight size={17} />}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  </div>;
}
