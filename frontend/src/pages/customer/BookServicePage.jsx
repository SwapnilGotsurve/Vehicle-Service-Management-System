import { useEffect, useState } from 'react';
import { CarFront, ChevronRight, Clock3 } from 'lucide-react';
import { api, post } from '../../api';

export default function BookServicePage() {
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ vehicle: '', service: '', bookingDate: '', timeSlot: '09:00 AM', problemDescription: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api('/vehicles'), api('/services')])
      .then(([vehicleData, serviceData]) => {
        setVehicles(vehicleData);
        setServices(serviceData);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === form.vehicle);

  function chooseVehicle(event) {
    setForm({ ...form, vehicle: event.target.value, service: '' });
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await post('/bookings', form);
      setMessage('Booking created. Your service advisor will confirm the slot shortly.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return <div className="page narrow">
    <div className="page-heading">
      <div>
        <p className="eyebrow orange">New appointment</p>
        <h1>Book a service</h1>
        <p className="muted">Choose your vehicle first to see the services and prices available for your visit.</p>
      </div>
    </div>
    <div className="panel booking-form">
      {loading ? <p className="muted">Loading your vehicles and available services...</p> : <form onSubmit={submit}>
        <div className="step-label"><span>01</span><div><b>Choose your vehicle</b><small>Select the vehicle that needs attention.</small></div></div>
        <select required value={form.vehicle} onChange={chooseVehicle}>
          <option value="">Select vehicle</option>
          {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}</option>)}
        </select>
        {!vehicles.length && <p className="error">Add a vehicle before booking a service.</p>}

        {selectedVehicle && <div className="selected-vehicle"><div className="record-icon"><CarFront size={20} /></div><div><span className="eyebrow">Selected vehicle</span><strong>{selectedVehicle.brand} {selectedVehicle.model}</strong><small>{selectedVehicle.registrationNumber} · {selectedVehicle.fuelType} · {selectedVehicle.mileage || 0} km</small></div></div>}

        {selectedVehicle && <><div className="step-label"><span>02</span><div><b>Choose a service</b><small>Available services and current prices are shown below.</small></div></div><div className="service-options">{services.length ? services.map((service) => <label className={form.service === service._id ? 'service-option selected' : 'service-option'} key={service._id}><input type="radio" required name="service" value={service._id} checked={form.service === service._id} onChange={(event) => setForm({ ...form, service: event.target.value })} /><span><b>{service.name}</b><small>{service.description || 'Professional service for your vehicle'}</small></span><span className="service-price"><strong>₹{Number(service.price).toLocaleString('en-IN')}</strong>{service.estimatedDuration && <small><Clock3 size={12} /> {service.estimatedDuration} min</small>}</span></label>) : <p className="error">No active services are available right now.</p>}</div><div className="step-label"><span>03</span><div><b>Pick a time</b><small>We’ll confirm your appointment by notification.</small></div></div><div className="form-grid"><label>Date<input required type="date" min={new Date().toISOString().split('T')[0]} value={form.bookingDate} onChange={(event) => setForm({ ...form, bookingDate: event.target.value })} /></label><label>Time slot<select value={form.timeSlot} onChange={(event) => setForm({ ...form, timeSlot: event.target.value })}><option>09:00 AM</option><option>11:00 AM</option><option>02:00 PM</option><option>04:00 PM</option></select></label></div><label>What can we help with?<textarea value={form.problemDescription} onChange={(event) => setForm({ ...form, problemDescription: event.target.value })} rows="4" placeholder="Tell us anything your service advisor should know..." /></label>{message && <p className={message.includes('created') ? 'success' : 'error'}>{message}</p>}<button className="primary" disabled={!form.service}><span>Confirm booking</span><ChevronRight size={17} /></button></>}
      </form>}
    </div>
  </div>;
}
