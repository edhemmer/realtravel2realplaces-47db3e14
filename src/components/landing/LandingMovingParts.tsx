import { Plane, Home, Car, Luggage, Compass, Receipt } from 'lucide-react';

const parts = [
  { icon: Plane, title: 'Flights', description: 'Departure times, airport codes, confirmation numbers — all in one place.' },
  { icon: Home, title: 'Lodging', description: 'Address, check-in details, and saved links for every stay.' },
  { icon: Car, title: 'Drives', description: 'Stop-by-stop timelines and drive-day logistics.' },
  { icon: Luggage, title: 'Packing', description: 'Track what to bring and check items off as you pack.' },
  { icon: Compass, title: 'Explore', description: 'Discover restaurants and things to do near your destination.' },
  { icon: Receipt, title: 'Expenses', description: 'Log costs by category and trip — see totals and your share.' },
];

export default function LandingMovingParts() {
  return (
    <section className="landing-features-section landing-problemsolution-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="landing-section-headline">
            The moving parts of travel — organized.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parts.map((part) => (
            <div key={part.title} className="landing-persona-card-v2">
              <div className="landing-persona-icon-v2">
                <part.icon className="w-5 h-5" />
              </div>
              <h3 className="landing-persona-title-v2">{part.title}</h3>
              <p className="landing-persona-desc-v2">{part.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
